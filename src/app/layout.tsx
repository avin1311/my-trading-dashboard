import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}