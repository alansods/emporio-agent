import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { cookies } from "next/headers";

import { Providers } from "@/components/Providers/Providers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, parseLocale } from "@/lib/i18n/locale";

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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const locale = parseLocale(cookieStore.get(LOCALE_COOKIE)?.value) ?? DEFAULT_LOCALE;

  return (
    <html lang={locale} className={`${inter.variable} ${sora.variable}`}>
      <body>
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
