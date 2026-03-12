import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "M5PaperS3 Home Assistant Manager",
  description: "Configure grayscale pages and flash FastEPD firmware for M5PaperS3.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
