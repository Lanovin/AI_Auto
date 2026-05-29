'use client';

import { useEffect, useRef, useState } from 'react';

export default function LegacyToolFrame({ src, title }) {
  const iframeRef = useRef(null);
  const cleanupRef = useRef([]);
  const lastHeightRef = useRef(0);
  const [frameHeight, setFrameHeight] = useState(1200);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return undefined;
    }

    const clearObservers = () => {
      cleanupRef.current.forEach((dispose) => dispose());
      cleanupRef.current = [];
    };

    const syncHeight = () => {
      try {
        const documentRef = iframe.contentDocument;
        if (!documentRef) {
          return;
        }

        const nextHeight = Math.max(
          documentRef.documentElement?.scrollHeight || 0,
          documentRef.body?.scrollHeight || 0,
          900
        );

        if (Math.abs(nextHeight - lastHeightRef.current) < 4) {
          return;
        }

        lastHeightRef.current = nextHeight;
        setFrameHeight(nextHeight);
      } catch {
        // Same-origin route should be readable; ignore if the frame is not ready yet.
      }
    };

    const attachObservers = () => {
      clearObservers();
      syncHeight();

      try {
        const documentRef = iframe.contentDocument;
        if (!documentRef) {
          return;
        }

        const mutationObserver = new MutationObserver(syncHeight);
        mutationObserver.observe(documentRef.documentElement, {
          attributes: true,
          childList: true,
          characterData: true,
          subtree: true
        });
        cleanupRef.current.push(() => mutationObserver.disconnect());

        if (typeof ResizeObserver !== 'undefined' && documentRef.body) {
          const resizeObserver = new ResizeObserver(syncHeight);
          resizeObserver.observe(documentRef.body);
          cleanupRef.current.push(() => resizeObserver.disconnect());
        }

        const resizeTarget = iframe.contentWindow;
        if (resizeTarget) {
          resizeTarget.addEventListener('resize', syncHeight);
          cleanupRef.current.push(() => resizeTarget.removeEventListener('resize', syncHeight));
        }
      } catch {
        clearObservers();
      }
    };

    iframe.addEventListener('load', attachObservers);

    if (iframe.contentDocument?.readyState === 'complete') {
      attachObservers();
    }

    return () => {
      iframe.removeEventListener('load', attachObservers);
      clearObservers();
    };
  }, [src]);

  return (
    <div className="legacy-frame-wrap">
      <iframe className="legacy-frame" ref={iframeRef} src={src} style={{ height: frameHeight }} title={title} />
    </div>
  );
}