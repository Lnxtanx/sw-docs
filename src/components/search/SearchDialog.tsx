/**
 * Search Dialog Component
 * Cmd+K modal for searching documentation
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ChevronRight } from 'lucide-react';
import { useSearch, type SearchResult } from '../../hooks/useSearch.js';
import './SearchDialog.css';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { search, loading } = useSearch({ maxResults: 8 });

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search as user types
  useEffect(() => {
    if (query.trim()) {
      const searchResults = search(query);
      setResults(searchResults);
      setSelectedIndex(-1);
    } else {
      setResults([]);
      setSelectedIndex(-1);
    }
  }, [query, search]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          navigateToResult(results[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  const navigateToResult = (result: SearchResult) => {
    navigate(`/docs/${result.slug}`);
    onClose();
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="search-dialog-overlay" onClick={onClose}>
      <div className="search-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Search Input */}
        <div className="search-dialog-header">
          <Search size={20} className="search-dialog-icon" />
          <input
            ref={inputRef}
            type="text"
            className="search-dialog-input"
            placeholder="Search documentation..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          <button
            className="search-dialog-close"
            onClick={onClose}
            aria-label="Close search"
          >
            <X size={20} />
          </button>
        </div>

        {/* Results */}
        <div className="search-dialog-results">
          {loading && (
            <div className="search-dialog-message">Loading search index...</div>
          )}
          {!loading && query.trim() === '' && (
            <div className="search-dialog-message">
              Type to search documentation
            </div>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <div className="search-dialog-message">
              No results found for "{query}"
            </div>
          )}
          {!loading && results.length > 0 && (
            <ul className="search-dialog-list">
              {results.map((result, index) => (
                <li
                  key={result.slug}
                  className={`search-dialog-item ${
                    index === selectedIndex ? 'selected' : ''
                  }`}
                  onClick={() => navigateToResult(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="search-result-main">
                    <div className="search-result-title">{result.title}</div>
                    <div className="search-result-description">
                      {result.description}
                    </div>
                  </div>
                  <div className="search-result-path">
                    {result.slug
                      .split('/')
                      .map((part, i) => (
                        <span key={i}>
                          {i > 0 && <ChevronRight size={14} />}
                          {part}
                        </span>
                      ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="search-dialog-footer">
          {results.length > 0 && (
            <div className="search-footer-hint">
              <kbd>↑↓</kbd>
              <span>to navigate</span>
              <kbd>↵</kbd>
              <span>to select</span>
              <kbd>esc</kbd>
              <span>to close</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
