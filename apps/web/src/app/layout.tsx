import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VSC Training · Coach",
  description: "Piattaforma italiana per coaching e programmazione sportiva"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}