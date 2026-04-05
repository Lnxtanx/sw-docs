/**
 * useAIChat — Docs AI assistant, streams from /api/docs/ask via SSE.
 *
 * Phase 2 additions:
 *  - pageSlug param forwarded to backend for retrieval hint
 *  - IndexedDB persistence with 30-min TTL (survives page navigation)
 *  - submitFeedback (👍/👎) fires POST /api/docs/feedback
 *  - Skips 'type:done' token-count events from display
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    feedback?: 'up' | 'down' | null;
    statusMessage?: string;  // Agent retrieval status (e.g. "Searching docs...")
}

const DOCS_API     = '/api/docs/ask';
const FEEDBACK_API = '/api/docs/feedback';

const IDB_DB_NAME = 'sw-docs-chat';
const IDB_STORE   = 'sessions';
const IDB_TTL_MS  = 30 * 60 * 1000; // 30 minutes

// ── Session UUID (anonymous, persists in localStorage, no PII) ───────────────
function getSessionId(): string {
    const KEY = 'sw-docs-session';
    try {
        const existing = localStorage.getItem(KEY);
        if (existing) return existing;
        const id = crypto.randomUUID();
        localStorage.setItem(KEY, id);
        return id;
    } catch {
        return 'anonymous';
    }
}

export const SESSION_ID = getSessionId();

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
function idbOpen(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_DB_NAME, 1);
        req.onupgradeneeded = () => {
            req.result.createObjectStore(IDB_STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => reject(req.error);
    });
}

async function idbSave(sessionId: string, messages: ChatMessage[]): Promise<void> {
    const db = await idbOpen();
    // Serialize Date → number for IDB storage
    const serialized = messages.map(m => ({ ...m, timestamp: m.timestamp.getTime() }));
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put({ messages: serialized, savedAt: Date.now() }, sessionId);
        tx.oncomplete = () => resolve();
        tx.onerror    = () => reject(tx.error);
    });
}

async function idbLoad(sessionId: string): Promise<ChatMessage[]> {
    const db = await idbOpen();
    return new Promise(resolve => {
        const tx  = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(sessionId);
        req.onsuccess = () => {
            const record = req.result;
            if (!record) { resolve([]); return; }
            if (Date.now() - record.savedAt > IDB_TTL_MS) { resolve([]); return; }
            const messages: ChatMessage[] = (record.messages as Array<Record<string, unknown>>).map(m => ({
                ...(m as Omit<ChatMessage, 'timestamp'>),
                timestamp: new Date(m.timestamp as number),
            }));
            resolve(messages);
        };
        req.onerror = () => resolve([]);
    });
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAIChat(pageTitle?: string, pageContent?: string, pageSlug?: string) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput]       = useState('');
    const [loading, setLoading]   = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    // Load persisted conversation on mount
    useEffect(() => {
        idbLoad(SESSION_ID)
            .then(saved => { if (saved.length > 0) setMessages(saved); })
            .catch(() => {});
    }, []);

    // Persist to IndexedDB whenever messages change
    useEffect(() => {
        if (messages.length > 0) {
            idbSave(SESSION_ID, messages).catch(() => {});
        }
    }, [messages]);

    const sendMessage = useCallback(
        async (content: string) => {
            if (!content.trim() || loading) return;

            const userMsg: ChatMessage = {
                id: Date.now().toString(),
                role: 'user',
                content: content.trim(),
                timestamp: new Date(),
            };
            const assistantId = (Date.now() + 1).toString();
            const assistantMsg: ChatMessage = {
                id: assistantId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, userMsg, assistantMsg]);
            setInput('');
            setLoading(true);
            abortRef.current = new AbortController();

            try {
                const res = await fetch(DOCS_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Session-ID': SESSION_ID,
                    },
                    body: JSON.stringify({
                        question:    content.trim(),
                        pageTitle,
                        pageContent: pageContent?.slice(0, 4000),
                        pageSlug,
                    }),
                    signal: abortRef.current.signal,
                });

                if (!res.ok || !res.body) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const reader  = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        const raw = line.slice(6).trim();
                        if (!raw || raw === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(raw) as {
                                delta?: string;
                                content?: string;
                                type?: string;
                                error?: string;
                                message?: string;
                            };
                            // Skip token-count summary event
                            if (parsed.type === 'done') continue;
                            // Handle agent status updates (e.g. "Searching docs...")
                            if (parsed.type === 'status' && parsed.message) {
                                setMessages(prev =>
                                    prev.map(m =>
                                        m.id === assistantId
                                            ? { ...m, statusMessage: parsed.message }
                                            : m
                                    )
                                );
                                continue;
                            }
                            // Real errors
                            if (parsed.error) {
                                throw new Error(parsed.error);
                            }
                            const chunk = parsed.delta ?? parsed.content ?? '';
                            if (chunk) {
                                setMessages(prev =>
                                    prev.map(m =>
                                        m.id === assistantId
                                            ? { ...m, content: m.content + chunk, statusMessage: undefined }
                                            : m
                                    )
                                );
                            }
                        } catch {
                            // non-JSON lines (keep-alive, comments) — ignore
                        }
                    }
                }
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return;
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantId
                            ? {
                                  ...m,
                                  content:
                                      "Sorry, I couldn't reach the AI service. Please try again.",
                              }
                            : m
                    )
                );
            } finally {
                setLoading(false);
                abortRef.current = null;
            }
        },
        [loading, pageTitle, pageContent, pageSlug]
    );

    const abort = useCallback(() => {
        abortRef.current?.abort();
        setLoading(false);
    }, []);

    const submitFeedback = useCallback(
        async (messageId: string, vote: 'up' | 'down') => {
            setMessages(prev =>
                prev.map(m => (m.id === messageId ? { ...m, feedback: vote } : m))
            );
            // Fire-and-forget — we don't block on this
            fetch(FEEDBACK_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': SESSION_ID,
                },
                body: JSON.stringify({ messageId, feedback: vote, pageSlug }),
            }).catch(() => {});
        },
        [pageSlug]
    );

    const clearMessages = useCallback(() => {
        setMessages([]);
        idbSave(SESSION_ID, []).catch(() => {});
    }, []);

    return {
        messages,
        input,
        setInput,
        loading,
        sendMessage,
        abort,
        clearMessages,
        submitFeedback,
    };
}
