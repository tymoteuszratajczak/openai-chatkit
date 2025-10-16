"use client";

import { useCallback, useRef } from "react";
import { ChatKitPanel, type FactAction } from "@/components/ChatKitPanel";
import { useColorScheme } from "@/hooks/useColorScheme";
import renderMathInElement from "katex/contrib/auto-render";
import "katex/dist/katex.min.css";

const loadAutoRender = () =>
  import("katex/contrib/auto-render/auto-render").then((m) => m.default);

export default function App() {
  const { scheme, setScheme } = useColorScheme();
  const wrapRef = useRef<HTMLDivElement>(null);

  const renderMath = useCallback(async () => {
    if (!wrapRef.current) return;
    const renderMathInElement = await loadAutoRender();
    renderMathInElement(wrapRef.current, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
      ],
      throwOnError: false,
    });
  }, []);

  const handleWidgetAction = useCallback(async (action: FactAction) => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[ChatKitPanel] widget action", action);
    }
  }, []);

  const handleResponseEnd = useCallback(() => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[ChatKitPanel] response end");
    }
    renderMath(); // <--- tu renderuje wzory po odpowiedzi
  }, [renderMath]);

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
