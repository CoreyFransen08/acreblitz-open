import type { Metadata } from "next";
import "./globals.css";
import "@acreblitz/react-components/styles.css";

export const metadata: Metadata = {
  title: "JD OAuth Test - AcreBlitz",
  description: "Test app for John Deere Operations Center OAuth integration",
  icons: {
    icon: "/acreblitz_favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
