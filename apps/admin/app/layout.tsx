import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProvider } from "@/components/app-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "SYLORA Admin",
  description: "SYLORA platform administration console",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
