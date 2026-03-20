import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Onboarding Checklist",
  description: "Track agent onboarding progress",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
