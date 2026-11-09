import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Golden Rice Bowl | Online Takeaway Ordering",
  description: "Order fresh, authentic Chinese takeaway directly from The Golden Rice Bowl in Heathfield. Fast collection and home delivery.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#FDFBF7]">
        {children}
      </body>
    </html>
  );
}
