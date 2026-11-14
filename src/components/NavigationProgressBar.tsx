"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const startProgress = () => {
    clearAllTimeouts();
    setLoading(true);
    setProgress(20);

    const t1 = setTimeout(() => {
      setProgress((prev) => (prev < 65 ? 65 : prev));
    }, 150);

    const t2 = setTimeout(() => {
      setProgress((prev) => (prev < 85 ? 85 : prev));
    }, 450);

    timeoutsRef.current.push(t1, t2);
  };

  const completeProgress = () => {
    clearAllTimeouts();
    setProgress(100);
    const t = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 250);
    timeoutsRef.current.push(t);
  };

  // Complete progress whenever URL pathname or searchParams change
  useEffect(() => {
    if (loading) {
      completeProgress();
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore if click was prevented or not primary mouse button
      if (e.defaultPrevented || e.button !== 0) return;

      // Ignore modifier keys (opens in new tab)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Ignore external targets, downloads, javascript, protocols, hashes
      if (
        target.target === "_blank" ||
        target.hasAttribute("download") ||
        href.startsWith("http:") ||
        href.startsWith("https:") ||
        href.startsWith("//") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        href.startsWith("javascript:")
      ) {
        return;
      }

      // Check if target matches current exact pathname + search
      const currentFullUrl = window.location.pathname + window.location.search;
      if (href === currentFullUrl || href === window.location.pathname) {
        return;
      }

      // Start the instant visual loading bar!
      startProgress();
    };

    const handlePopState = () => {
      startProgress();
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
      clearAllTimeouts();
    };
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      role="progressbar"
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] h-[2.5px] pointer-events-none bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.85)]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition:
            progress === 100
              ? "width 150ms ease-out, opacity 200ms ease-out 100ms"
              : progress === 20
              ? "width 80ms ease-out"
              : "width 300ms ease-out",
        }}
      />
    </div>
  );
}
