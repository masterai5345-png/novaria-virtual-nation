import type { Metadata, Viewport } from "next";
import AuthProviders from "@/components/auth/AuthProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOVARIA — Desa Virtual 3D",
  description:
    "Jelajahi Desa Nol NOVARIA, gunakan maskot hewan acak dan KTP warga, berinteraksi melalui chat global, dan ikuti pembangunan desa berdasarkan aspirasi komunitas.",
  applicationName: "NOVARIA",
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
