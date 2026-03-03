// theme/Root.js - Plugin-provided theme component
import React, { useEffect } from 'react';
import { useLocation } from '@docusaurus/router';
import { usePluginData } from '@docusaurus/useGlobalData';
import { createRoot } from 'react-dom/client';
import MarkdownActionsDropdown from '../components/MarkdownActionsDropdown';

export default function Root({ children }) {
  const { hash, pathname } = useLocation();
  const { docsRoot } = usePluginData('markdown-source-plugin');

  useEffect(() => {
    if (hash) {
      const scrollToElement = () => {
        const id = decodeURIComponent(hash.substring(1));
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          return true;
        }
        return false;
      };

      // Try immediately
      if (!scrollToElement()) {
        // If element not found, wait for images and content to load
        const timeouts = [100, 300, 500, 1000];

        timeouts.forEach(delay => {
          setTimeout(() => {
            scrollToElement();
          }, delay);
        });

        // Also wait for images to load
        window.addEventListener('load', scrollToElement, { once: true });
      }
    }
  }, [hash]);

  // Inject dropdown button into article header
  useEffect(() => {
    const injectDropdown = () => {
      // Only inject on docs pages
      if (!pathname.startsWith(docsRoot + '/')) return;

      const articleHeader = document.querySelector('article .markdown header');
      if (!articleHeader) return;

      // Check if already injected
      if (articleHeader.querySelector('.markdown-actions-container')) return;

      // Create container for the dropdown
      const container = document.createElement('div');
      container.className = 'markdown-actions-container';

      // Append to header
      articleHeader.appendChild(container);

      // Render React component into container
      const root = createRoot(container);
      root.render(<MarkdownActionsDropdown docsRoot={docsRoot} />);
    };

    // Try to inject after a short delay to ensure DOM is ready
    const timeouts = [0, 100, 300];
    timeouts.forEach(delay => {
      setTimeout(injectDropdown, delay);
    });
  }, [pathname]);

  return <>{children}</>;
}
