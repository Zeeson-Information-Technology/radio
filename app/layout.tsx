import type { Metadata } from "next";
import "./globals.css";
import Navigation from "./components/Navigation";
import { ModalProvider } from "@/lib/contexts/ModalContext";
import { ToastProvider } from "@/lib/contexts/ToastContext";
import ToastContainer from "@/components/ui/ToastContainer";

export const metadata: Metadata = {
  title: {
    default: "Al-Manhaj Radio - Authentic Islamic Knowledge",
    template: "%s | Al-Manhaj Radio"
  },
  description: "Listen to authentic Islamic lectures following the prophetic methodology. Live sessions with knowledgeable scholars and 24/7 Islamic content.",
  keywords: "Al-Manhaj, Al-Manhaj Radio, Islamic lectures, Quran recitation, Sunnah, authentic Islam, Islamic knowledge, manhaj, Salaf",
  authors: [{ name: "Al-Manhaj Radio" }],
  openGraph: {
    title: "Al-Manhaj Radio - Authentic Islamic Knowledge",
    description: "Listen to authentic Islamic lectures following the prophetic methodology.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-white antialiased" suppressHydrationWarning>
        <ToastProvider>
          <ModalProvider>
            <Navigation />
            
            {/* Add padding to account for fixed navbar */}
            <div className="pt-16">
              <main>{children}</main>
            </div>
            
            {/* Toast notifications */}
            <ToastContainer />
          </ModalProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
