import type { Metadata } from "next";
import Ticker from "@/components/Ticker";
import "./globals.css";

export const metadata: Metadata = {
  title: "PVP",
  description: "Vote on CryptoPunks. Build the aesthetic leaderboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Ticker />
        {children}
      </body>
    </html>
  );
}
