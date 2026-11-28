'use client';

import { useEffect, useRef } from 'react';

export default function AntiCheatGuard({ isActive, onViolation }) {
  const violationTriggeredRef = useRef(false);

  useEffect(() => {
    if (!isActive) return;

    const triggerViolation = (reason) => {
      if (violationTriggeredRef.current) return;
      violationTriggeredRef.current = true;
      onViolation(reason);
    };

    // 1. Detect Tab Switch or Window Minimization
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('Tab switched or browser minimized during test');
      }
    };

    // 2. Detect Focus Loss (with brief delay to avoid false positives on internal widgets)
    const handleWindowBlur = () => {
      setTimeout(() => {
        if (document.hidden) {
          triggerViolation('Focus lost: Student switched application or window');
        }
      }, 800);
    };

    // 3. Detect Fullscreen Exit
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        triggerViolation('Fullscreen mode was exited by student');
      }
    };

    // 4. Disable DevTools, Inspect & accidental tab-switch / reload shortcuts
    const handleKeyDown = (e) => {
      if (
        e.key === 'F12' ||
        e.key === 'F5' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        ((e.ctrlKey || e.metaKey) && /^[1-9uUrRtTwWnN]$/.test(e.key))
      ) {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault(); // Disable right click
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isActive, onViolation]);

  return null;
}
