"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChatKitPanel, type FactAction } from "@/components/ChatKitPanel";
import { useColorScheme } from "@/hooks/useColorScheme";
import "katex/dist/katex.min.css";

// 1) Lazy import KaTeX auto-render
const loadAutoRender = () =>
  import("katex/contrib/auto-render").then((m) => m.default);

// 2) Normalizacja: zamień `\[ ... ]` -> `\[ ... \]`
function fixDelimiters(el: HTMLElement) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);
  texts.forEach((t) => {
    if (!t.nodeValue) return;
    // Nie dotykamy już poprawnych `\]`
    t.nodeValue = t.nodeValue.replace(/\\\[((?:(?!\\\]).)*?)\](?!\\)/gs, "\\[$1\\]");
  });
}

// 3) Znajdź realne korzenie z treścią chatową (ChatKit bywa w portalach)
function getCandidateRoots(fallback: HTMLElement | null): HTMLElement[] {
  const roots: HTMLElement[] = [];
  const tryAdd = (el: Element | null) => {
    if (el && el instanceof HTMLElement && !roots.includes(el)) roots.push(el);
  };

  // Twój wrapRef (jeśli ChatKit renderuje inline w nim)
  tryAdd(fallback);

  // Heurystyki: (sprawdź w DevTools i dopasuj jak znajdziesz właściwy selektor)
  tryAdd(document.querySelector("[data-ck-content]"));
  tryAdd(document.querySelector("[data-chatkit-root]"));
  tryAdd(document.querySelector(".ck-content"));
  tryAdd(document.querySelector(".chatkit-message"));
  tryAdd(document.querySelector(".chatkit-root"));

  // Odfiltruj duże kontenery (np. <html>, <body>) – nie chcemy całej strony
  return roots.filter(
    (el) =>
      el !== document.documentElement &&
      el !== document.body &&
      el.childElementCount > 0
  );
}

export default function App() {
  const { scheme, setScheme } = useColorScheme();

  // Kontener otaczający ChatKit (jeśli nie portal)
  const wrapRef = useRef<HTMLDivElement>(null);

  // Trzymamy funkcję renderującą KaTeX
  const katexRenderRef = useRef<((root: HTMLElement) => void) | null>(null);

  // 4) Lazy load i przygotowanie renderera
  useEffect(() => {
    let cancelled = false;
    loadAutoRender().then((renderMathInElement) => {
      if (cancelled) return;

      katexRenderRef.current = (root: HTMLElement) => {
        // normalizacja delimiterów
        fixDelimiters(root);
        // render KaTeX tylko wewnątrz przekazanego root
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

      // pierwszy pass po starcie
      const roots = getCandidateRoots(wrapRef.current);
      roots.forEach((r) => katexRenderRef.current?.(r));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 5) Handlery ChatKit
  const handleWidgetAction = useCallback(async (action: FactAction) => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[ChatKitPanel] widget action", action);
    }
  }, []);

  // Po zakończeniu generowania – 2x rAF => po commicie DOM
  const handleResponseEnd = useCallback(() => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[ChatKitPanel] response end");
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const roots = getCandidateRoots(wrapRef.current);
        roots.forEach((r) => katexRenderRef.current?.(r));
      });
    });
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
