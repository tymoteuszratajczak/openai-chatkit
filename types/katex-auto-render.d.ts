declare module "katex/contrib/auto-render" {
  export interface Delimiter {
    left: string;
    right: string;
    display: boolean;
  }

  export interface AutoRenderOptions {
    delimiters?: Delimiter[];
    throwOnError?: boolean;
    /** brakowało w @types — dodajemy, żeby TS nie krzyczał */
    ignoredTags?: string[];
  }

  export default function renderMathInElement(
    el: HTMLElement | DocumentFragment,
    options?: AutoRenderOptions
  ): void;
}
