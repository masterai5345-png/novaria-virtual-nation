import type { Metadata, Viewport } from "next";
import AuthProviders from "@/components/auth/AuthProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kota Maskot — NOVARIA",
  description:
    "Masuki kota 3D penuh warga maskot dari berbagai spesies hewan, jelajahi distrik, dan bantu NOVARIA berkembang.",
  applicationName: "Kota Maskot",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#081b20",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <AuthProviders>{children}</AuthProviders>
      </body>
    </html>
  );
}
