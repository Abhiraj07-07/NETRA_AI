import React from 'react';

// Hidden live region for accessibility screen readers (NVDA, TalkBack, VoiceOver)
export default function ScreenReaderAnnouncer({ announcement, assertive = false }) {
  return (
    <div
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="sr-only fixed left-[-9999px] top-auto width-[1px] height-[1px] overflow-hidden"
    >
      {announcement}
    </div>
  );
}
