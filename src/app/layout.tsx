import type { Metadata } from "next";
import "./globals.css";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = {
  title: "NSE Analytics - Trading Strategy Dashboard",
  description: "Supertrend + RSI + MACD Confluence Strategy Dashboard for NSE stocks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}