import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Send, X, Upload, Loader2, CheckCircle2 } from 'lucide-react';

interface FeedbackDialogProps {
  trigger?: React.ReactNode;
  defaultType?: 'feedback' | 'bug';
}

interface FeedbackImage {
  file: File;
  preview: string;
  id: string;
}

export function FeedbackDialog({
  trigger,
  defaultType = 'feedback',
}: FeedbackDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [type, setType] = useState<string>(defaultType);
  const [topic, setTopic] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<FeedbackImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 3) {
      alert('Maximum 3 images allowed');
      return;
    }

    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substring(7),
    }));

    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const removed = prev.find((img) => img.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((img) => img.id !== id);
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsOpen(false);
        setTopic('');
        setContent('');
        setEmail('');
        setImages([]);
      }, 1400);
    } catch {
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const modalContent = isOpen ? (
    <div className="feedback-overlay" onClick={() => setIsOpen(false)} role="dialog" aria-modal="true">
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-header">
          <div className="feedback-title">
            <img src="/resona.png" alt="Schema Weaver" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
            <span>Share Feedback</span>
          </div>
          <button className="feedback-close" onClick={() => setIsOpen(false)} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {isSuccess ? (
          <div className="feedback-success">
            <CheckCircle2 size={42} style={{ color: '#10b981' }} />
            <h3>Feedback Received!</h3>
            <p>Thank you for helping us improve Schema Weaver.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-form">
            <div className="feedback-field">
              <label>Category</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="feedback">Product Feedback</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
              </select>
            </div>

            <div className="feedback-field">
              <label>Topic</label>
              <input
                type="text"
                placeholder="e.g. Documentation clarification, Navigation issue..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
              />
            </div>

            <div className="feedback-field">
              <label>Email (Optional)</label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="feedback-field">
              <label>Description</label>
              <textarea
                placeholder="Tell us what's on your mind or describe the issue in detail..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={4}
              />
            </div>

            <div className="feedback-field">
              <label>Attachments (Max 3)</label>
              <div className="feedback-images">
                {images.map((img) => (
                  <div key={img.id} className="feedback-image-preview">
                    <img src={img.preview} alt="preview" />
                    <button type="button" onClick={() => removeImage(img.id)} aria-label="Remove image">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {images.length < 3 && (
                  <button type="button" className="feedback-add-image" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={16} />
                    <span>Attach</span>
                  </button>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                style={{ display: 'none' }}
                multiple
              />
            </div>

            <div className="feedback-footer">
              <button type="button" className="feedback-cancel-btn" onClick={() => setIsOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="feedback-submit-btn" disabled={submitting || !topic || !content}>
                {submitting ? <Loader2 size={16} className="feedback-spin" /> : <Send size={15} />}
                <span>{submitting ? 'Submitting...' : 'Submit'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        .feedback-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .feedback-modal {
          background: var(--bg-main, #090d16);
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
          border-radius: 12px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          font-family: inherit;
        }

        .feedback-header {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .feedback-title {
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 1.05rem;
          color: var(--text-main, #f8fafc);
        }

        .feedback-close {
          background: transparent;
          border: none;
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s;
        }

        .feedback-close:hover {
          background: var(--bg-hover, rgba(255, 255, 255, 0.08));
          color: var(--text-main, #f8fafc);
        }

        .feedback-form {
          padding: 1.25rem;
          max-height: 75vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .feedback-field {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .feedback-field label {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary, #cbd5e1);
        }

        .feedback-field input,
        .feedback-field select,
        .feedback-field textarea {
          background: var(--bg-input, #111827);
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
          border-radius: 8px;
          padding: 0.6rem 0.8rem;
          color: var(--text-main, #f8fafc);
          font-size: 0.9rem;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
          width: 100%;
        }

        .feedback-field input:focus,
        .feedback-field select:focus,
        .feedback-field textarea:focus {
          border-color: var(--accent-color, #10b981);
          box-shadow: 0 0 0 2px var(--focus-ring, rgba(16, 185, 129, 0.25));
        }

        .feedback-field textarea {
          resize: vertical;
          min-height: 90px;
        }

        .feedback-images {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
        }

        .feedback-image-preview {
          position: relative;
          width: 60px;
          height: 60px;
          border-radius: 6px;
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
          overflow: hidden;
        }

        .feedback-image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .feedback-image-preview button {
          position: absolute;
          top: 2px;
          right: 2px;
          background: rgba(0, 0, 0, 0.7);
          color: #ffffff;
          border: none;
          border-radius: 4px;
          padding: 2px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .feedback-add-image {
          width: 60px;
          height: 60px;
          border: 1px dashed var(--border-color, rgba(255, 255, 255, 0.2));
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          background: transparent;
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }

        .feedback-add-image:hover {
          border-color: var(--accent-color, #10b981);
          color: var(--accent-color, #10b981);
        }

        .feedback-add-image span {
          font-size: 0.7rem;
          font-weight: 500;
        }

        .feedback-footer {
          margin-top: 0.5rem;
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        .feedback-cancel-btn {
          padding: 0.55rem 1rem;
          border-radius: 8px;
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
          background: transparent;
          color: var(--text-main, #f8fafc);
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          font-family: inherit;
          transition: background 0.15s;
        }

        .feedback-cancel-btn:hover {
          background: var(--bg-hover, rgba(255, 255, 255, 0.06));
        }

        .feedback-submit-btn {
          padding: 0.55rem 1.25rem;
          border-radius: 8px;
          border: none;
          background: var(--accent-color, #10b981);
          color: #ffffff;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: opacity 0.15s;
        }

        .feedback-submit-btn:hover:not(:disabled) {
          opacity: 0.9;
        }

        .feedback-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .feedback-spin {
          animation: feedbackSpin 1s linear infinite;
        }

        @keyframes feedbackSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .feedback-success {
          padding: 2.5rem 1.5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .feedback-success h3 {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text-main, #f8fafc);
          margin: 0;
        }

        .feedback-success p {
          color: var(--text-muted, #94a3b8);
          font-size: 0.9rem;
          margin: 0;
        }
      `}</style>
    </div>
  ) : null;

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {trigger}
      </div>
      {typeof document !== 'undefined' && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}
