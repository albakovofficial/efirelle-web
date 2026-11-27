import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer/Footer";
import { Header } from "@/components/layout/Header/Header";
import { MobileNav } from "@/components/layout/MobileNav/MobileNav";
import { getCurrentViewer } from "@/data/api";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Efirelle — живые трансляции", template: "%s · Efirelle" },
  description: "Платформа живых трансляций: игры, музыка, творчество и общение в реальном времени.",
};

export const viewport: Viewport = {
  themeColor: "#f6f5f9",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const viewer = await getCurrentViewer();
  return (
    <html lang="ru" className={manrope.variable}>
      <body>
        <Header viewer={viewer} />
        {children}
        <Footer />
        <MobileNav />
      </body>
    </html>
  );
}
