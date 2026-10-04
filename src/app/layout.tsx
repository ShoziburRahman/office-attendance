import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { UpdateProvider } from "@/providers/UpdateProvider";

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').then(
                    (reg) => console.log('SW registered', reg),
                    (err) => console.log('SW registration failed', err)
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body className="font-sans flex flex-col min-h-screen">
        <UpdateProvider>
          <AuthProvider>
            <main className="flex-grow">
              {children}
            </main>
          </AuthProvider>
        </UpdateProvider>
        <footer className="py-6 text-center">
          <a
            href="https://www.linkedin.com/in/shoziburr/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-teal-600 hover:teal-700 transition-colors duration-200"
          >
            Developed by Shozibur Rahman
          </a>
        </footer>
      </body>
    </html>
  );
}
