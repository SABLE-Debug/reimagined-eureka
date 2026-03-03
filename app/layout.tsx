import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fundamental Bias Radar",
  description: "Mobile-first trading dashboard with daily fundamental bias across 10 assets.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
