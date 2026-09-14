import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";

export const metadata: Metadata = {
  title: "Office Attendance",
  description: "Office attendance and employee management.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans flex flex-col min-h-screen">
        <AuthProvider>
          <main className="flex-grow">
            {children}
          </main>
        </AuthProvider>
        <footer className="py-6 text-center">
          <a
            href="https://www.linkedin.com/in/shoziburr/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors duration-200"
          >
            Developed by Shozibur Rahman
          </a>
        </footer>
      </body>
    </html>
  );
}
