import "./globals.css";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";

const sevenSegmentFont = localFont({
  src: "../public/fonts/7segment.woff",
  display: "swap",
  variable: "--font-seven-segment",
  weight: "400",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <html
        lang="en"
        suppressHydrationWarning
        className={sevenSegmentFont.variable}
      >
        <head />
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
