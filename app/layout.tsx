import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Empório da Música",
  description:
    "Customer support chat for Empório da Música, a musical instrument store in Campo Grande, MS.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
