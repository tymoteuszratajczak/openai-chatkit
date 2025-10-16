"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChatKitPanel, type FactAction } from "@/components/ChatKitPanel";
import { useColorScheme } from "@/hooks/useColorScheme";
import "katex/dist/katex.min.css";

/** Lazy import: poprawna ścieżka bez /auto-render/auto-render */
const loadAutoRender = () =>
  import("katex/contrib/auto-render").then((m) => m.default);

export default function App() {
  const { scheme, setScheme } = useColorScheme();
  const wrapRef = useRef<HTMLDivElement>(null);

  /** Trzymamy już zainicjalizowaną funkcję renderującą (po lazy imporcie) */
  const katexRenderRef = useRef<((root: HTMLElement) => void) | null>(null);

  /** 1) Załaduj KaTeX raz i przygotuj renderer */
  useEffect(() => {
    let cancelled = false;

    loadAutoRender().then((renderMathInElement) => {
      if (cancelled) return;

      katexRenderRef.current = (root: HTMLElement) => {
        renderMathInElement(root, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "\\[", right: "\\]", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false },
          ],
          throwOnError: false,
          // dzięki deklaracji w types/ mamy pełny typ bez ts-ignore
          ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
        });
      };

      // pierwszy render po starcie
      if (wrapRef.current) katexRenderRef.current(wrapRef.current);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /** 2) Obserwuj DOM — renderuj KaTeX zawsze, gdy ChatKit doda/zmieni treść */
  useEffect(() => {
    if (!wrapRef.current) return;
    const root = wrapRef.current;

    let rafId = 0;
    const scheduleRender = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (katexRenderRef.current) katexRenderRef.current(root);
      });
    };

    const observer = new MutationObserver(() => {
      scheduleRender();
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // safety: gdyby coś już było w DOM zanim wystartuje observer
    scheduleRender();

    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  /** 3) Handlery ChatKit — bez setTimeout, KaTeX ogarnia MutationObserver */
  const handleWidgetAction = useCallback(async (action: FactAction) => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[ChatKitPanel] widget action", action);
    }
  }, []);

  const handleResponseEnd = useCallback(() => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[ChatKitPanel] response end");
    }
    // nic nie robimy — KaTeX zreactuje na zmiany DOM
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-end bg-slate-100 dark:bg-slate-950">
      <div ref={wrapRef} className="mx-auto w-full max-w-5xl">
        <ChatKitPanel
          theme={scheme}
          onWidgetAction={handleWidgetAction}
          onResponseEnd={handleResponseEnd}
          onThemeRequest={setScheme}
        />
      </div>
    </main>
  );
}
