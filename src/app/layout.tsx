import type { Metadata } from "next";
import "./globals.css";
import "./dearplume.css";

export const metadata: Metadata = {
  title: "Dearplume — little notes, a lot of heart",
  description: "A private little space for heartfelt notes, favorite pictures, and password-protected sharing.",
  icons: { icon: "/dearplume-logo.svg" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
