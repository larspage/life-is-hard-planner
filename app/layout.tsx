import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeOS — principle-based planning",
  description:
    "Plan with purpose. A principle-based planning and execution system built on Franklin Covey's methodology combined with bullet journaling.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
