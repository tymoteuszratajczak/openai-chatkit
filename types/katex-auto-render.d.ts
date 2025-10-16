// types/katex-auto-render.d.ts
declare module "katex/contrib/auto-render" {
  export interface Delimiter {
    left: string;
    right: string;
    display: boolean;
  }

  export interface AutoRenderOptions {
    delimiters?: Delimiter[];
    throwOnError?: boolean;
    // możesz rozszerzyć o inne pola KaTeX jeśli będziesz potrzebować:
    // macros?: Record<string, string>;
    // errorColor?: string;
    // fleqn?: boolean;
    // leqno?: boolean;
    // ignoredTags?: string[];
    // ignoredClasses?: string[];
  }

  export default function renderMathInElement(
    el: HTMLElement | DocumentFragment,
    options?: AutoRenderOptions
  ): void;
}
