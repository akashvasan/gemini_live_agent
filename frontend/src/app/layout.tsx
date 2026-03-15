import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scene One — Location-Aware Storyboard AI",
  description: "Point. Speak. Watch your surroundings become cinema.",
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
