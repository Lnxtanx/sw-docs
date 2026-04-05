/**
 * CodeBlock Component
 * Syntax highlighting with copy button and optional line numbers
 */

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import './CodeBlock.css';

interface CodeBlockProps {
  children: string;
  language?: string;
  showLineNumbers?: boolean;
  showCopyButton?: boolean;
  title?: string;
}

export function CodeBlock({
  children,
  language = 'plaintext',
  showLineNumbers = false,
  showCopyButton = true,
  title,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const code = children.trim();
  let highlighted = code;

  // Syntax highlighting
  if (language && language !== 'plaintext') {
    try {
      highlighted = hljs.highlight(code, { language, ignoreIllegals: true }).value;
    } catch {
      // Fallback to plain text if language not supported
      highlighted = hljs.highlight(code, { language: 'plaintext', ignoreIllegals: true }).value;
    }
  }

  const lines = code.split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="code-block-wrapper">
      {title && <div className="code-block-title">{title}</div>}
      <div className="code-block-container">
        <div className="code-block-header">
          {language && language !== 'plaintext' && (
            <span className="code-block-language">{language}</span>
          )}
          {showCopyButton && (
            <button
              className={`code-block-copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              title="Copy to clipboard"
              aria-label="Copy code to clipboard"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span className="copy-text">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          )}
        </div>
        <pre className="code-block-pre">
          <code className={`code-block-code hljs language-${language}`}>
            {showLineNumbers ? (
              <div className="code-with-lines">
                <div className="line-numbers">
                  {lines.map((_, i) => (
                    <span key={i} className="line-number">
                      {i + 1}
                    </span>
                  ))}
                </div>
                <div
                  className="line-content"
                  dangerouslySetInnerHTML={{ __html: highlighted }}
                />
              </div>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: highlighted }} />
            )}
          </code>
        </pre>
      </div>
    </div>
  );
}
