import type { ReactNode } from "react";
import "./globals.css";
import { League_Spartan } from "next/font/google";

// подключаем шрифт League Spartan
const leagueSpartan = League_Spartan({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
// src/app/layout.tsx
export const metadata = {
  title: "Estrella",
  description: "Affiliate platform",
  icons: {
    icon: [{ url: "/icon.png" }],              // Next сам обслужит /icon.png из app/
    apple: [{ url: "/apple-icon.png" }],       // из app/
  },
};


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={leagueSpartan.className}>
      <body className="min-h-screen antialiased bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] text-white">
        {children}
      </body>
    </html>
  );
}
