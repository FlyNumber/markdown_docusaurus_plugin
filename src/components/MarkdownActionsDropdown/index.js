import React, { useState, useRef, useEffect } from 'react';

export default function MarkdownActionsDropdown() {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Get pathname from window.location
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  // Only show on docs pages (not blog, homepage, etc.)
  const isDocsPage = currentPath.startsWith('/docs/');

  // Handle click outside to close dropdown
  useEffect(() => {
    // Only add listener if dropdown is open
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      // If the click is outside the dropdown, close it
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    // Add event listener to document
    // Use mousedown instead of click for better UX (fires before click)
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup function to remove event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!isDocsPage) {
    return null;
  }

  // Construct the .md URL (handles directory indexes like /docs/ -> /docs/intro.md)
  const markdownUrl = currentPath.endsWith('/')
    ? `${currentPath}intro.md`
    : `${currentPath}.md`;

  // Handle opening markdown in new tab
  const handleOpenMarkdown = () => {
    window.open(markdownUrl, '_blank');
    setIsOpen(false);
  };

  // Handle copying markdown to clipboard
  const handleCopyMarkdown = async () => {
    try {
      const response = await fetch(markdownUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch markdown');
      }
      const markdown = await response.text();
      await navigator.clipboard.writeText(markdown);

      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy markdown:', error);
      alert('Failed to copy markdown. Please try again.');
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={`dropdown ${isOpen ? 'dropdown--show' : ''}`}
    >
      <button
        className="button button--outline button--secondary button--sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        Open Markdown
        <svg width="14" height="14" viewBox="0 0 16 16" style={{marginLeft: '4px'}}>
          <path fill="currentColor" d="M4.427 6.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396a.25.25 0 00-.177-.427H4.604a.25.25 0 00-.177.427z"/>
        </svg>
      </button>

      <ul className="dropdown__menu">
        <li>
          <button
            className="dropdown__link"
            onClick={handleOpenMarkdown}
            style={{cursor: 'pointer', border: 'none', background: 'none', width: '100%', textAlign: 'left'}}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" style={{marginRight: '8px', verticalAlign: 'middle'}}>
              <path fill="currentColor" d="M8 0a8 8 0 110 16A8 8 0 018 0zM1.5 8a6.5 6.5 0 1013 0 6.5 6.5 0 00-13 0z"/>
              <path fill="currentColor" d="M8 3.5a.5.5 0 01.5.5v4a.5.5 0 01-1 0V4a.5.5 0 01.5-.5z"/>
              <path fill="currentColor" d="M7.5 11.5a.5.5 0 111 0 .5.5 0 01-1 0z"/>
            </svg>
            View as Markdown
          </button>
        </li>
        <li>
          <button
            className="dropdown__link"
            onClick={handleCopyMarkdown}
            disabled={copied}
            style={{cursor: 'pointer', border: 'none', background: 'none', width: '100%', textAlign: 'left'}}
          >
            {copied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" style={{marginRight: '8px', verticalAlign: 'middle'}}>
                  <path fill="currentColor" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" style={{marginRight: '8px', verticalAlign: 'middle'}}>
                  <path fill="currentColor" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"/>
                  <path fill="currentColor" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/>
                </svg>
                Copy Page as Markdown
              </>
            )}
          </button>
        </li>
      </ul>
    </div>
  );
}
