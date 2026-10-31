import "./globals.css";
import type { Metadata } from "next";
import { SITE } from "../lib/portfolios";

export const metadata: Metadata = {
  title: `The ${SITE.title}`,
  description: "Daily market recap, model portfolios, macro and micro trends, and discussion questions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Playfair+Display:ital,wght@0,600;0,800;1,600&family=Libre+Franklin:wght@400;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
