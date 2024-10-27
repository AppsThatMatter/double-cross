import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Double Cross",
  description: "A sad attempt at a co-op game.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
      >
        {children}
      </body>
    </html>
  );
}
