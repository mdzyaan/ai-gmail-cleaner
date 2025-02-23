import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gmail Cleanup - Marketing Email Cleaner",
  description: "Clean up your Gmail inbox from marketing and promotional emails using AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
