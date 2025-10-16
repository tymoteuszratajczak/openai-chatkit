"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChatKitPanel, type FactAction } from "@/components/ChatKitPanel";
import { useColorScheme } from "@/hooks/useColorScheme";
import "katex/dist/katex.min.css";

/** Lazy import KaTeX auto-render (właściwa ścieżka) */
const loadAutoRender = () =>
  import("katex/contrib/auto-render").then((m) => m.default);

export default function App() {
  const { scheme, setScheme } = useColorScheme();

  /** Kontener, wewnątrz którego mają być renderowane wzory */
  const wrapRef = useRef<HTMLDivElement>(null);

  /**
   * Trzymamy zainicjalizowaną funkcję renderującą KaTeX.
   * Uwaga: renderujemy ZAWSZE tylko wewnątrz `wrapRef`.
   */
  const katexRenderRef = useRef<((root: HTMLElement) => void) | null>(null);

  /** 1) Lazy load KaTeX i przygotowanie renderera (raz) */
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
          ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
        });
      };

      // pierwszy render po starcie (jeśli już jest jakaś treść)
      if (wrapRef.current) katexRenderRef.current(wrapRef.current);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * 2) MutationObserver — bez żadnych „timeoutów”.
   * Obserwujemy cały dokument, ale renderujemy TYLKO,
   * gdy zmiana dotyczy węzłów w obrębie naszego `wrapRef`.
   */
  useEffect(() => {
    if (!wrapRef.current) return;
    const root = wrapRef.current;

    let rafId = 0;
    const scheduleRender = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (katexRenderRef.current) {
          katexRenderRef.current(root);
        }
      });
    };

    const observer = new MutationObserver((mutations) => {
      // szybka filtracja – reaguj tylko na zmiany dotykające naszego kontenera
      for (const m of mutations) {
        const t = m.target as Node | null;
        if (t && root.contains(t)) {
          scheduleRender();
          break;
        }
      }
    });

    // obserwuj cały dokument (gdyby ChatKit renderował przez portale / głębiej)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // bezpieczeństwo: zrób pierwszy pass
    scheduleRender();

    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  /** 3) Handlery ChatKit — nic nie trzeba robić; MO ogarnia render */
  const handleWidgetAction = useCallback(async (action: FactAction) => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[ChatKitPanel] widget action", action);
    }
  }, []);

  const handleResponseEnd = useCallback(() => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[ChatKitPanel] response end");
    }
    // celowo nic – MutationObserver wyłapie zmiany w DOM i odpali KaTeX
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
