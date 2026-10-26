import React from 'react';
import { ICON_PATHS, GENERIC_ICON_PATH } from '../../lib/ai-icons';

// 16px brand mark for a built-in assistant id; custom entries get a generic star.
export default function ProviderIcon({ id }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden="true"
      style={{ marginRight: '8px', verticalAlign: 'middle' }}
    >
      <path d={ICON_PATHS[id] || GENERIC_ICON_PATH} />
    </svg>
  );
}
