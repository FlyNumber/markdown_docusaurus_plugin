// theme/Root.js - Plugin-provided theme component
import React, { useEffect, useRef } from 'react';
import { useLocation } from '@docusaurus/router';
import { createRoot } from 'react-dom/client';
import { usePluginData } from '@docusaurus/useGlobalData';
import MarkdownActionsDropdown from '../components/MarkdownActionsDropdown';
import { decodeHashSafely } from '../lib/decode-hash';

export default function Root({ children }) {
  const { hash, pathname } = useLocation();
  const { docsPath } = usePluginData('markdown-source-plugin');
  const dropdownRootRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!hash) return;

    const scrollToElement = () => {
      const id = decodeHashSafely(hash);
      if (!id) return false;
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return true;
      }
      return false;
    };

    if (scrollToElement()) return;

    const timeoutIds = [100, 300, 500, 1000].map(delay =>
      setTimeout(scrollToElement, delay)
    );
    window.addEventListener('load', scrollToElement, { once: true });

    return () => {
      timeoutIds.forEach(clearTimeout);
      window.removeEventListener('load', scrollToElement);
    };
  }, [hash]);

  // Inject dropdown button into article header
  useEffect(() => {
    const isDocsPage =
      docsPath === '/' ||
      pathname.startsWith(docsPath) ||
      pathname === docsPath.slice(0, -1);

    if (!isDocsPage) return;

    const cleanup = () => {
      if (dropdownRootRef.current) {
        dropdownRootRef.current.unmount();
        dropdownRootRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.remove();
        containerRef.current = null;
      }
    };

    const injectDropdown = () => {
      const articleHeader = document.querySelector('article .markdown header');
      if (!articleHeader) return false;

      // Check if already injected in this header
      if (articleHeader.querySelector('.markdown-actions-container')) return true;

      // Unmount previous root if it exists (e.g., was on stale DOM that got swapped)
      if (dropdownRootRef.current) {
        dropdownRootRef.current.unmount();
        dropdownRootRef.current = null;
      }

      const container = document.createElement('div');
      container.className = 'markdown-actions-container';
      articleHeader.appendChild(container);
      containerRef.current = container;

      const root = createRoot(container);
      root.render(<MarkdownActionsDropdown />);
      dropdownRootRef.current = root;

      return true;
    };

    // Try immediate injection (works when content is already rendered)
    injectDropdown();

    // Always observe DOM changes — on client-side navigation, Docusaurus
    // uses startTransition so the old page DOM may still be present when
    // this effect runs. The observer catches the real content swap and
    // re-injects if the dropdown was lost with the stale DOM.
    const observer = new MutationObserver(() => {
      const header = document.querySelector('article .markdown header');
      if (header && !header.querySelector('.markdown-actions-container')) {
        injectDropdown();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanup();
    };
  }, [pathname, docsPath]);

  return <>{children}</>;
}
