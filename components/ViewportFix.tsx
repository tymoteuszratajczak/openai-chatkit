"use client";
import { useEffect } from "react";

export default function ViewportFix() {
  useEffect(() => {
    if (!window.visualViewport) return;

    const onResize = () => {
      // przewiń aktywny input/textarea w widok
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.getAttribute("contenteditable") === "true")) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      // dopasuj scroll, gdy viewport się zmniejsza
      document.documentElement.style.setProperty(
        "--vvh",
        `${window.visualViewport!.height}px`
      );
    };

    onResize();
    window.visualViewport.addEventListener("resize", onResize);
    window.visualViewport.addEventListener("scroll", onResize);

    return () => {
      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onResize);
    };
  }, []);

  return null;
}
