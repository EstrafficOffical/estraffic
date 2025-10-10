import type { ReactNode } from "react";
import "./globals.css";
import { League_Spartan } from "next/font/google";

// подключаем шрифт League Spartan
const leagueSpartan = League_Spartan({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// метаданные приложения
export const metadata = {
  title: "Estrella",
  description: "Affiliate platform",
  icons: {
    icon: [{ url: "/icon.png" }],
    apple: [{ url: "/apple-icon.png" }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={leagueSpartan.className}>
      <head>
        {/* корректный масштаб на мобильных */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* приятный цвет статус-бара на мобилках */}
        <meta name="theme-color" content="#111111" />
        {/* укажем предпочитаемую цветовую схему */}
        <meta name="color-scheme" content="dark" />
      </head>
      <body className="min-h-screen antialiased bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] text-white">
        {children}
      </body>
    </html>
  );
}
