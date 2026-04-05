import React, { useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';

interface ChatInputProps {
    input: string;
    setInput: (val: string) => void;
    loading: boolean;
    onSend: () => void;
    onAbort: () => void;
}

export function ChatInput({ input, setInput, loading, onSend, onAbort }: ChatInputProps) {
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const timeout = setTimeout(() => inputRef.current?.focus(), 50);
        return () => clearTimeout(timeout);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim() && !loading) {
                onSend();
            }
        }
    };

    return (
        <div className="ai-chat-input-area">
            <div className="ai-chat-input-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src="/resona.png" alt="Resona" style={{ width: '20px', height: '20px', opacity: 0.8 }} />
                <textarea
                    ref={inputRef}
                    className="ai-chat-single-input"
                    placeholder="Ask Resona anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    rows={1}
                    onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                    }}
                />
                <div className="ai-chat-input-actions-overlay">
                    {loading ? (
                        <button className="ai-chat-icon-btn stop" onClick={onAbort} title="Stop generation">
                            <Square size={16} fill="currentColor" />
                        </button>
                    ) : (
                        <button
                            className="ai-chat-icon-btn send"
                            onClick={onSend}
                            disabled={!input.trim()}
                            title="Send"
                        >
                            <Send size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
