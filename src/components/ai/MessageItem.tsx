import { ThumbsUp, ThumbsDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../../hooks/useAIChat.js';

interface MessageItemProps {
    message: ChatMessage;
    isLast: boolean;
    loading: boolean;
    onFeedback: (messageId: string, vote: 'up' | 'down') => void;
}

export function MessageItem({ message, isLast, loading, onFeedback }: MessageItemProps) {
    const isAssistant = message.role === 'assistant';
    const hasContent  = message.content.length > 0;
    // Only show feedback on finished assistant messages (not while streaming last one)
    const showFeedback = isAssistant && hasContent && (!loading || !isLast);

    return (
        <div className={`ai-chat-message ${message.role}`}>

            <div className="ai-chat-bubble">
                <div className="ai-chat-content">
                    {message.content ? (
                        <div className="ai-markdown-prose">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    ) : loading && isAssistant && isLast && (
                              <div className="ai-chat-typing">
                                  {message.statusMessage ? (
                                      <span className="ai-agent-status">{message.statusMessage}</span>
                                  ) : (
                                      <>
                                          <span />
                                          <span />
                                          <span />
                                      </>
                                  )}
                              </div>
                          )}
                </div>

                {/* ── Feedback row ── */}
                {showFeedback && (
                    <div className="ai-feedback-row">
                        <button
                            className={`ai-feedback-btn ${message.feedback === 'up' ? 'voted up' : ''}`}
                            onClick={() => onFeedback(message.id, 'up')}
                            title="Helpful"
                            aria-label="Mark as helpful"
                        >
                            <ThumbsUp size={12} />
                        </button>
                        <button
                            className={`ai-feedback-btn ${message.feedback === 'down' ? 'voted down' : ''}`}
                            onClick={() => onFeedback(message.id, 'down')}
                            title="Not helpful"
                            aria-label="Mark as not helpful"
                        >
                            <ThumbsDown size={12} />
                        </button>
                    </div>
                )}

                <div className="ai-chat-timestamp">
                    {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </div>
            </div>
        </div>
    );
}
