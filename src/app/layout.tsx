import type { Metadata, Viewport } from "next";
import AuthProviders from "@/components/auth/AuthProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOVARIA — A Living Virtual Nation",
  description:
    "Enter a living 3D coastal metropolis, meet animal mascot citizens, explore city districts, and help NOVARIA grow.",
  applicationName: "NOVARIA",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#081b20",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProviders>{children}</AuthProviders>
      </body>
    </html>
  );
}
