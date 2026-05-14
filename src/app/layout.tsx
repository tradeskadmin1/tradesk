import type { Metadata } from "next";
import { Syne, Space_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import PublicNav from './components/public-shell'
import FooterShell from './components/footer-shell'
import Web3bgClient from './components/web3bg-client'

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
  title: {
    default: "Tradesk — Professional Decentralized Trading",
    template: "%s | Tradesk",
  },
  description:
    "Trade crypto spot and perpetuals across Ethereum, Arbitrum and BNB Chain. Best-price DEX aggregation, cross-exchange arbitrage scanner, and up to 50× leverage — all non-custodial.",
  keywords: [
    "decentralized exchange",
    "crypto trading",
    "DEX aggregator",
    "perpetual futures",
    "arbitrage scanner",
    "DeFi trading platform",
    "Ethereum trading",
    "Arbitrum DEX",
    "on-chain trading",
    "non-custodial exchange",
    "cross-chain trading",
    "crypto perpetuals",
    "Tradesk",
  ],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://tradesk-admin1.vercel.app"
  ),
  openGraph: {
    type: "website",
    siteName: "Tradesk",
    title: "Tradesk — Professional Decentralized Trading",
    description:
      "Trade crypto spot and perpetuals across Ethereum, Arbitrum and BNB Chain. Best-price DEX aggregation, cross-exchange arbitrage scanner, and up to 50× leverage — all non-custodial.",
    url: "/",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Tradesk logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Tradesk — Professional Decentralized Trading",
    description:
      "Trade crypto spot and perpetuals across Ethereum, Arbitrum and BNB Chain. DEX aggregation, arbitrage scanner, and 50× leverage — non-custodial.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${spaceMono.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="relative min-h-screen overflow-x-hidden bg-linear-to-br from-black via-[#0B0F14] to-[#121821]">
        <Providers>
          <div className="fixed inset-0 -z-10">
            <Web3bgClient />
          </div>
          <PublicNav />
          <main className="relative z-10 flex flex-col min-h-screen">
            {children}
          </main>
          <FooterShell />
        </Providers>
      </body>
    </html>
  );
}