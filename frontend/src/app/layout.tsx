import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title:       "Log Classifier",
  description: "3-tier hybrid log classification: Regex → ML → LLM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}