import { useRef, useEffect } from 'react';
import type { ChatMessage } from '../../hooks/useAIChat.js';
import { MessageItem } from './MessageItem';

interface MessageListProps {
    messages: ChatMessage[];
    loading: boolean;
    onFeedback: (messageId: string, vote: 'up' | 'down') => void;
}

export function MessageList({ messages, loading, onFeedback }: MessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="ai-chat-messages">
            {messages.map((msg, index) => (
                <MessageItem
                    key={msg.id}
                    message={msg}
                    isLast={index === messages.length - 1}
                    loading={loading}
                    onFeedback={onFeedback}
                />
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
}
