import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat with your docs",
  description: "Ask questions and get grounded, cited answers from your documents.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
