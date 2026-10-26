import React, { useState, useRef, useEffect, useId } from 'react';
import { getMarkdownUrl } from '../../lib/markdown-path';
import { buildAiLinks, resolveContextUrls, BUILT_IN_PROVIDERS, DEFAULT_PROMPT } from '../../lib/ai-providers';
import ProviderIcon from './ProviderIcon';

const itemStyle = { cursor: 'pointer', border: 'none', background: 'none', width: '100%', textAlign: 'left' };
const iconStyle = { marginRight: '8px', verticalAlign: 'middle' };

// Props normally come from theme/Root.js (plugin global data). The defaults
// are a compatibility policy: a site still rendering this component bare from
// an old copied Root gets the five built-in assistants and the default prompt.
export default function MarkdownActionsDropdown({
  aiProviders = BUILT_IN_PROVIDERS,
  aiPrompt = DEFAULT_PROMPT,
}) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const copyResetTimerRef = useRef(null);
  const menuId = useId();

  // Clear any pending copy-reset timer on unmount so it cannot fire setState
  // on a torn-down component or flip UI state after the user has navigated.
  useEffect(() => () => {
    if (copyResetTimerRef.current) {
      clearTimeout(copyResetTimerRef.current);
      copyResetTimerRef.current = null;
    }
  }, []);

  // Location for URL construction. The component only ever renders in the
  // browser (Root injects it after mount), but keep the guard for safety.
  const hasWindow = typeof window !== 'undefined';
  const currentPath = hasWindow ? window.location.pathname : '';
  const origin = hasWindow ? window.location.origin : '';

  // Close on click outside and on Escape while open
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        if (triggerRef.current) triggerRef.current.focus();
      }
    };

    // mousedown instead of click for better UX (fires before click)
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const markdownUrl = getMarkdownUrl(currentPath);
  const aiLinks = buildAiLinks({
    aiProviders,
    aiPrompt,
    ...resolveContextUrls({ origin, pathname: currentPath }),
  });

  // Closing hides the list, so a keyboard user who activated a row would be
  // left on a hidden element; hand focus back to the trigger.
  const closeAndRefocus = () => {
    setIsOpen(false);
    if (triggerRef.current) triggerRef.current.focus();
  };

  // Handle opening markdown in new tab
  const handleOpenMarkdown = () => {
    window.open(markdownUrl, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  // Handle copying markdown to clipboard
  const handleCopyMarkdown = async () => {
    // Cancel any in-flight reset timer up front so a stale timer can't flip
    // state during a slow fetch or after a rapid second click.
    if (copyResetTimerRef.current) {
      clearTimeout(copyResetTimerRef.current);
      copyResetTimerRef.current = null;
    }

    try {
      const response = await fetch(markdownUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch markdown');
      }
      const markdown = await response.text();
      await navigator.clipboard.writeText(markdown);

      setCopied(true);
      copyResetTimerRef.current = setTimeout(() => {
        setCopied(false);
        copyResetTimerRef.current = null;
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
        ref={triggerRef}
        className="button button--outline button--secondary button--sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={menuId}
        style={{display: 'inline-flex', alignItems: 'center'}}
      >
        Open Markdown
        <svg width="14" height="14" viewBox="0 0 16 16" style={{marginLeft: '6px'}} aria-hidden="true">
          <path fill="currentColor" d="M4.427 6.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396a.25.25 0 00-.177-.427H4.604a.25.25 0 00-.177.427z"/>
        </svg>
      </button>

      <ul className="dropdown__menu" id={menuId}>
        <li>
          <button
            className="dropdown__link"
            onClick={handleOpenMarkdown}
            style={itemStyle}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" style={iconStyle} aria-hidden="true">
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
            style={itemStyle}
          >
            {copied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" style={iconStyle} aria-hidden="true">
                  <path fill="currentColor" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" style={iconStyle} aria-hidden="true">
                  <path fill="currentColor" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"/>
                  <path fill="currentColor" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/>
                </svg>
                Copy Page as Markdown
              </>
            )}
          </button>
        </li>

        {aiLinks.length > 0 && (
          <li role="separator">
            <hr style={{ margin: '0.3rem 0', border: 0, borderTop: '1px solid var(--ifm-color-emphasis-200)' }} />
          </li>
        )}
        {aiLinks.map(link => (
          <li key={link.id}>
            <a
              className="dropdown__link"
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeAndRefocus}
            >
              <ProviderIcon id={link.id} />
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
