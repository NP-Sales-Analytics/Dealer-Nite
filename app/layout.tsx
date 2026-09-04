import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pylox — Penerimaan Tamu",
  description: "Pencatatan kehadiran tamu undangan",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Jangan kunci zoom: admin di lapangan perlu memperbesar nama toko yang mirip.
  maximumScale: 5,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // colorScheme dipaksa terang supaya kontrol native (scrollbar, autofill,
    // keyboard) tidak ikut dark mode OS. Aplikasi ini light-only.
    <html lang="id" className="light" style={{ colorScheme: "light" }}>
      <body className={`${outfit.variable} font-sans antialiased`}>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
