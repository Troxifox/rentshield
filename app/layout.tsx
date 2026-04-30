import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentShield",
  description:
    "A rule-based rental scam checker for students to score listings, compare options, and stay safe.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
