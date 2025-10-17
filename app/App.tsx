"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChatKitPanel, type FactAction } from "@/components/ChatKitPanel";
import { useColorScheme } from "@/hooks/useColorScheme";
import "katex/dist/katex.min.css";

/** Lazy import KaTeX auto-render */
const loadAutoRender = () =>
  import("katex/contrib/auto-render").then((m) => m.default);

/** Normalizacja: \[ ... ]  ->  \[ ... \]  (bez flagi `s` – zgodne z ES2017) */
function fixDelimiters(el: HTMLElement) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);

  texts.forEach((t) => {
    if (!t.nodeValue) return;
    let s = t.nodeValue;

    // chroń już poprawne '\]'
    s = s.replace(/\\\]/g, "__KATEX_ESC_BRACKET__");

    // popraw nieescapowane zamknięcia bloku LaTeX
    // [\s\S] = dowolny znak (zamiast flagi `s`)
    s = s.replace(/\\\[([\s\S]*?)\](?!\\)/g, "\\[$1\\]");

    s = s.replace(/__KATEX_ESC_BRACKET__/g, "\\]");
    t.nodeValue = s;
  });
}

/** Pomocniczo: dodaj do wyniku jeśli to sensowny, nie-globalny root */
function safePushRoot(list: HTMLElement[], node: Node | null | undefined) {
  if (!node) return;
  if (!(node instanceof HTMLElement)) return;
  if (node === document.documentElement || node === document.body) return;
  if (list.includes(node)) return;
  if (node.childElementCount === 0) return;
  list.push(node);
}

/** Zbierz potencjalne „kontenery treści”, również wewnątrz *otwartych* Shadow DOM. */
function getCandidateRoots(fallback: HTMLElement | null): HTMLElement[] {
  const roots: HTMLElement[] = [];

  // A) to co mamy w zwykłym DOM (wrapRef + kilka heurystyk)
  safePushRoot(roots, fallback);
  safePushRoot(roots, document.querySelector("[data-ck-content]"));
  safePushRoot(roots, document.querySelector("[data-chatkit-root]"));
  safePushRoot(roots, document.querySelector(".ck-content"));
  safePushRoot(roots, document.querySelector(".chatkit-message"));
  safePushRoot(roots, document.querySelector(".chatkit-root"));

  // B) otwarte Shadow DOM hostingowane przez elementy ck-*/chatkit
  const allEls = document.querySelectorAll<HTMLElement>("*");
  allEls.forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const looksLikeChatKitHost =
      tag.startsWith("ck-") ||
      tag.includes("chatkit") ||
      tag.includes("oai-") ||
      tag.includes("openai");

    const sr = (el as any).shadowRoot as ShadowRoot | undefined;
    if (looksLikeChatKitHost && sr) {
      // znajdź wewnątrz shadowRoot sensowne kontenery treści
      const candidates = sr.querySelectorAll<HTMLElement>(
        "[data-ck-content], .ck-content, .chatkit-message, .chatkit-root, [part='messages'], [part='content'], main, article, section"
      );
      candidates.forEach((c) => safePushRoot(roots, c));
      // jeśli nic nie znaleźliśmy, spróbujmy całego shadowRoota
      if (candidates.length === 0) {
        safePushRoot(roots, sr.host as HTMLElement);
        // lub bezpośrednio pierwszy „większy” element w shadowRoot
        const first = sr.querySelector<HTMLElement>("main, article, section, div");
        if (first) safePushRoot(roots, first);
      }
    }
  });

  return roots;
}

export default function App() {
  const { scheme, setScheme } = useColorScheme();

  // kontener wokół ChatKit (gdy treść nie jest w portalu)
  const wrapRef = useRef<HTMLDivElement>(null);

  // przechowujemy funkcję renderującą
  const katexRenderRef = useRef<((root: HTMLElement) => void) | null>(null);

  /** Przygotuj renderer KaTeX (raz) */
  useEffect(() => {
    let cancelled = false;

    loadAutoRender().then((renderMathInElement) => {
      if (cancelled) return;

      katexRenderRef.current = (root: HTMLElement) => {
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

  /** Po skończonej odpowiedzi – render po commitach DOM (2× rAF) */
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

  const handleWidgetAction = useCallback(async (action: FactAction) => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[ChatKitPanel] widget action", action);
    }
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
