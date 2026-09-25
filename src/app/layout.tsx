import type { Metadata } from "next";
import { cookies } from "next/headers";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/noto-sans-malayalam/400.css";
import "@fontsource/noto-sans-malayalam/600.css";
import "./globals.css";
import { LanguageProvider } from "@/components/provider";
export const metadata: Metadata = {
  title: "SBK SLK Prediction Contest",
  description:
    "The free football prediction community of Soccer Blues of Keralam.",
  robots: { index: false, follow: false },
  icons: { icon: "/sbk-logo.png" },
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const language =
    (await cookies()).get("sbk_language")?.value === "ml" ? "ml" : "en";
  return (
    <html lang={language}>
      <body>
        <LanguageProvider initial={language}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
