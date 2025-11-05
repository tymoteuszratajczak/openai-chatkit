"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChatKitPanel, type FactAction } from "@/components/ChatKitPanel";
import { useColorScheme } from "@/hooks/useColorScheme";
import "katex/dist/katex.min.css";

// Lazy import KaTeX auto-render (stabilna ścieżka)
const loadAutoRender = () =>
  import("katex/contrib/auto-render").then((m) => m.default);

// Opcjonalna normalizacja: zamień `\[ ... ]` -> `\[ ... \]`
function fixDelimiters(el: HTMLElement) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);
  for (const t of texts) {
    const v = t.nodeValue;
    if (!v) continue;

    const normalized = normalizeInlineDollar(normalizeDisplayBrackets(v));
    if (normalized !== v) t.nodeValue = normalized;
  }
}

// BEZ flagi `s` – zgodne z targetem ES2017 (Next 15 też to łyka)
const DISPLAY_BRACKET_REGEX = /\\\[((?:.|\n)*?)\](?!\\)/g;

function normalizeDisplayBrackets(value: string): string {
  return value.replace(DISPLAY_BRACKET_REGEX, "\\[$1\\]");
}

function isEscaped(str: string, index: number): boolean {
  let backslashes = 0;
  for (let i = index - 1; i >= 0 && str[i] === "\\"; i -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

function findInlineDollarEnd(str: string, from: number): number {
  for (let i = from; i < str.length; i += 1) {
    const ch = str[i];
    if (ch !== "$") continue;
    if (str[i + 1] === "$") {
      i += 1; // skip display delimiter
      continue;
    }
    if (!isEscaped(str, i)) return i;
  }
  return -1;
}

function normalizeInlineDollar(value: string): string {
  let result = "";
  let cursor = 0;

  while (cursor < value.length) {
    const start = value.indexOf("$", cursor);
    if (start === -1) {
      result += value.slice(cursor);
      break;
    }

    result += value.slice(cursor, start);

    if (value[start + 1] === "$" || isEscaped(value, start)) {
      result += value[start];
      cursor = start + 1;
      continue;
    }

    const end = findInlineDollarEnd(value, start + 1);
    if (end === -1) {
      result += value[start];
      cursor = start + 1;
      continue;
    }

    const body = value.slice(start + 1, end);
    if (!body.trim()) {
      result += value.slice(start, end + 1);
      cursor = end + 1;
      continue;
    }

    result += `\(${body}\)`;
    cursor = end + 1;
  }

  return result;
}

/**
 * Zwraca elementy-ROOT-y, wewnątrz których renderujemy LaTeX.
 * Bazujemy wyłącznie na stabilnych atrybutach data-*, a nie losowych klasach.
 */
function getCandidateRoots(fallback: HTMLElement | null): HTMLElement[] {
  const roots: HTMLElement[] = [];
  const push = (el: Element | null) => {
    if (el && el instanceof HTMLElement && !roots.includes(el)) roots.push(el);
  };

  // 1) fallback – gdyby ChatKit renderował inline w naszym wrapRef
  push(fallback);

  // 2) Każdy “item” z wiadomością asystenta (stabilny atrybut z DOM)
  document
    .querySelectorAll<HTMLElement>('[data-thread-item="assistant-message"]')
    .forEach(push);

  // 3) (opcjonalnie) jeśli chcesz renderować też LaTeX w wiadomościach usera:
  // document
  //   .querySelectorAll<HTMLElement>('[data-thread-item="user-message"]')
  //   .forEach(push);

  // 4) (opcjonalnie) artykuły z całym turnem asystenta
  document
    .querySelectorAll<HTMLElement>('article[data-thread-turn="assistant"]')
    .forEach(push);

  // Odfiltruj <html>/<body> i puste kontenery
  return roots.filter(
    (el) =>
      el !== document.documentElement &&
      el !== document.body &&
      (el.childElementCount > 0 || el.textContent?.trim())
  );
}

export default function App() {
  const { scheme, setScheme } = useColorScheme();

  // Kontener, jeśli ChatKit nie używa portali
  const wrapRef = useRef<HTMLDivElement>(null);

  // Trzymamy referencję do funkcji renderującej KaTeX
  const katexRenderRef = useRef<((root: HTMLElement) => void) | null>(null);

  // Lazy load KaTeX + przygotowanie renderera
  useEffect(() => {
    let cancelled = false;

    loadAutoRender().then((renderMathInElement) => {
      if (cancelled) return;

      katexRenderRef.current = (root: HTMLElement) => {
        // (opcjonalnie) normalizacja delimiterów
        fixDelimiters(root);

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

  // Handlery ChatKit – po zakończeniu generowania dwu-klatkowy rAF,
  // żeby mieć pewność, że treść jest już w DOM
  const handleWidgetAction = useCallback(async (action: FactAction) => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[ChatKitPanel] widget action", action);
    }
  }, []);

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
    <main
      className="flex min-h-screen w-full flex-col items-center justify-end bg-slate-100 dark:bg-slate-950"
      style={{ minHeight: "var(--vvh, 100dvh)" }}
    >
      <div ref={wrapRef} className="flex w-full flex-1">
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
