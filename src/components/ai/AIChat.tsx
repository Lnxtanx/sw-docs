import { useState } from 'react';
import { FileText, Globe } from 'lucide-react';
import { useAIChat } from '../../hooks/useAIChat.js';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import './AIChat.css';

interface AIChatProps {
    isOpen: boolean;
    pageTitle?: string;
    pageContent?: string;
    pageSlug?: string;
}

const DEFAULT_SUGGESTIONS = [
    'How do I get started?',
    'How do migrations work?',
    'What is drift detection?',
];

function pageSuggestions(pageTitle: string): string[] {
    return [
        `What is covered in ${pageTitle}?`,
        `Give me a quick summary of ${pageTitle}`,
    ];
}

export function AIChat({ isOpen, pageTitle, pageContent, pageSlug }: AIChatProps) {
    const [scopeAll, setScopeAll] = useState(false);

    const { messages, input, setInput, loading, sendMessage, abort, submitFeedback } =
        useAIChat(
            scopeAll ? undefined : pageTitle,
            scopeAll ? undefined : pageContent,
            scopeAll ? undefined : pageSlug,
        );

    if (!isOpen) return null;

    const handleSend = () => {
        if (input.trim() && !loading) sendMessage(input);
    };

    const suggestions =
        !scopeAll && pageTitle ? pageSuggestions(pageTitle) : DEFAULT_SUGGESTIONS;

    return (
        <div className="ai-chat-panel full-height">

            {/* ── Context / Scope bar ── */}
            <div className="ai-context-bar">
                <div className="ai-scope-toggle">
                    <button
                        className={`scope-btn ${!scopeAll ? 'active' : ''}`}
                        onClick={() => setScopeAll(false)}
                        title="Answer based on current page"
                    >
                        <FileText size={11} />
                        This page
                    </button>
                    <button
                        className={`scope-btn ${scopeAll ? 'active' : ''}`}
                        onClick={() => setScopeAll(true)}
                        title="Search across all documentation"
                    >
                        <Globe size={11} />
                        All docs
                    </button>
                </div>
                {pageTitle && !scopeAll && (
                    <span className="ai-context-page-badge" title={`Context: ${pageTitle}`}>
                        {pageTitle}
                    </span>
                )}
            </div>

            <div className="ai-chat-body">
                {messages.length === 0 ? (
                    /* ── Empty state ── */
                    <div className="ai-chat-empty">
                        <img src="/resona.png" alt="Resona AI" className="ai-empty-avatar" />
                        <p className="ai-empty-title">Ask me anything</p>
                        <p className="ai-empty-hint">
                            {!scopeAll && pageTitle
                                ? <>I'll answer based on <strong>{pageTitle}</strong></>
                                : <>I'll search across all documentation</>
                            }
                        </p>
                        <div className="ai-empty-suggestions">
                            {suggestions.map(s => (
                                <button
                                    key={s}
                                    className="ai-suggestion"
                                    onClick={() => sendMessage(s)}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <MessageList
                        messages={messages}
                        loading={loading}
                        onFeedback={submitFeedback}
                    />
                )}
                <ChatInput
                    input={input}
                    setInput={setInput}
                    loading={loading}
                    onSend={handleSend}
                    onAbort={abort}
                />
            </div>
        </div>
    );
}
