import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";

import "@/styles/tokens.css";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Empório da Música",
  description:
    "Customer support chat for Empório da Música, a musical instrument store in Campo Grande, MS.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#070c1a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body>{children}</body>
    </html>
  );
}
