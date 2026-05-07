import type { Metadata } from "next";
import { Syne, Space_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import Web3bg from "./components/3bg";
import { Providers } from "./providers";
import Nav from './components/nav'
import Footer from './components/footer'

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-syne',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
});


const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-sans',
});


export const metadata: Metadata = {
  title: "Tradesk",
  description: "Web3 Finance App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${spaceMono.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body
        className="relative min-h-screen overflow-x-hidden bg-linear-to-br from-black via-[#0B0F14] to-[#121821]">
        <Providers>
          <div className="fixed inset-0 -z-10">
            <Web3bg />
          </div>
          <Nav />
          <main className="relative z-10 flex flex-col min-h-screen">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}