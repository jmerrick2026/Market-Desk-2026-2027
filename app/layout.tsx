import "./globals.css";
import type { Metadata } from "next";
import { SITE } from "../lib/portfolios";

export const metadata: Metadata = {
  title: `${SITE.title} · ${SITE.course}`,
  description: `Daily market recap, class portfolios, and discussion questions for ${SITE.course} at ${SITE.school}.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
