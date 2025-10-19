// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "katex/dist/katex.min.css";

// 👇 klientowy fix klawiatury
import ViewportFix from "@/components/ViewportFix";

export const metadata: Metadata = {
  title: "AgentKit demo",
  description: "Demo of ChatKit with hosted workflow",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <head>
        {/* Reaguj na klawiaturę mobilną i notchy */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />
        {/* ChatKit script przed interakcją */}
        <Script
          src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
          strategy="beforeInteractive"
        />
      </head>
      {/* body bez własnego scrolla; scroll w kontenerze czatu */}
      <body className="antialiased">
        {/* Ustawia --vvh i przewija aktywny input nad klawiaturę */}
        <ViewportFix />
        {children}
      </body>
    </html>
  );
}
