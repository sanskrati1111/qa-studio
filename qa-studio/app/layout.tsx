import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "QA Test Studio",
  description: "Automated functional & UI comparison testing between two URLs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <div className="min-h-screen bg-workspace">
          <header className="border-b border-line">
            <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
              <a href="/" className="flex items-center gap-2.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-signal" />
                <span className="font-display text-[17px] font-semibold tracking-tight text-ink">
                  QA Test Studio
                </span>
              </a>
              <nav className="flex items-center gap-6 text-[13px] font-medium text-ink-dim">
                <a href="/" className="hover:text-ink transition-colors">New run</a>
                <a href="/history" className="hover:text-ink transition-colors">History</a>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
