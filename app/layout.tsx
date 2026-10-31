import "./globals.css";
import type { Metadata } from "next";
import { SITE } from "../lib/portfolios";

export const metadata: Metadata = {
  title: `${SITE.title} · ${SITE.course}`,
  description: `Daily market recap, class portfolios, and discussion questions for ${SITE.course}.`,
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
