import type { Metadata } from "next";
import "./globals.css";
import { themeBootScript, themeCss } from "./themes";

export const metadata: Metadata = { title: "meetcal" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss() }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <div className="bgfx" aria-hidden="true" />
        <div className="drag" data-tauri-drag-region />
        {children}
      </body>
    </html>
  );
}
