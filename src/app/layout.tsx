import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentFlow Kenya | Find a place to call home",
  description:
    "Explore rental homes across all 47 counties in Kenya and find a place that feels right.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
