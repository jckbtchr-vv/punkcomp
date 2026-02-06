import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PunkComp",
  description: "Vote on CryptoPunks. Build the aesthetic leaderboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
