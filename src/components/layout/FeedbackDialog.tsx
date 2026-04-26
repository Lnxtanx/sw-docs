import React, { useState, useRef } from 'react';
import { MessageSquare, Bug, Send, Sparkles, X, Upload, AlertCircle, Loader2 } from 'lucide-react';

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
  const [type, setType] = useState<string>(defaultType);
  const [topic, setTopic] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<FeedbackImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Simulate API call for documentation site
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      alert(type === 'bug' ? 'Bug report submitted!' : 'Feedback submitted! Thank you.');
      
      // Reset
      setTopic('');
      setContent('');
      setEmail('');
      setImages([]);
      setIsOpen(false);
    } catch (error) {
      alert('Failed to submit. Please try again or email support@vivekmind.com');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {trigger}
      </div>

      {isOpen && (
        <div className="feedback-overlay" onClick={() => setIsOpen(false)}>
          <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="feedback-header">
              <div className="feedback-title">
                {type === 'bug' ? (
                  <><Bug size={18} color="var(--destructive)" /> Report a Bug</>
                ) : (
                  <><img src="/resona.png" style={{ height: 18, width: 18 }} /> Share Feedback</>
                )}
              </div>
              <button className="feedback-close" onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="feedback-form custom-scrollbar">
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
                  placeholder="e.g. Navigation issue"
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
                  placeholder="Tell us what's on your mind..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  style={{ minHeight: 100, resize: 'none' }}
                />
              </div>

              <div className="feedback-field">
                <label>Attachments (Max 3)</label>
                <div className="feedback-images">
                  {images.map((img) => (
                    <div key={img.id} className="feedback-image-preview">
                      <img src={img.preview} alt="preview" />
                      <button type="button" onClick={() => removeImage(img.id)}><X size={10} /></button>
                    </div>
                  ))}
                  {images.length < 3 && (
                    <button type="button" className="feedback-add-image" onClick={() => fileInputRef.current?.click()}>
                      <Upload size={16} />
                      <span>Add</span>
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
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>{submitting ? 'Submitting...' : 'Submit'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .feedback-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .feedback-modal {
          background: var(--bg-main);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .feedback-header {
          padding: 1.25rem;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .feedback-title {
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.1rem;
        }
        .feedback-close {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }
        .feedback-close:hover { background: var(--bg-hover); color: var(--text-main); }
        
        .feedback-form {
          padding: 1.25rem;
          max-height: 70vh;
          overflow-y: auto;
        }
        .feedback-field {
          margin-bottom: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .feedback-field label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }
        .feedback-field input, .feedback-field select, .feedback-field textarea {
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.6rem 0.75rem;
          color: var(--text-main);
          font-size: 0.9rem;
          outline: none;
        }
        .feedback-field input:focus, .feedback-field select:focus, .feedback-field textarea:focus {
          border-color: var(--accent-color);
        }
        
        .feedback-images {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .feedback-image-preview {
          position: relative;
          width: 64px;
          height: 64px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          overflow: hidden;
        }
        .feedback-image-preview img { width: 100%; height: 100%; object-fit: cover; }
        .feedback-image-preview button {
          position: absolute;
          top: 2px;
          right: 2px;
          background: rgba(0,0,0,0.6);
          color: white;
          border: none;
          border-radius: 4px;
          padding: 2px;
          cursor: pointer;
        }
        .feedback-add-image {
          width: 64px;
          height: 64px;
          border: 1px dashed var(--border-color);
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }
        .feedback-add-image:hover { border-color: var(--accent-color); color: var(--accent-color); background: rgba(16, 185, 129, 0.05); }
        .feedback-add-image span { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; }

        .feedback-footer {
          margin-top: 0.5rem;
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }
        .feedback-cancel-btn {
          padding: 0.6rem 1rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-main);
          cursor: pointer;
          font-weight: 500;
        }
        .feedback-submit-btn {
          padding: 0.6rem 1.25rem;
          border-radius: 8px;
          border: none;
          background: var(--accent-color);
          color: white;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: opacity 0.2s;
        }
        .feedback-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .feedback-submit-btn:hover:not(:disabled) { opacity: 0.9; }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
