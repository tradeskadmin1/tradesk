import { createConfig, http, fallback } from "wagmi"
import { mainnet, bsc, arbitrum } from "viem/chains"
import { metaMask, coinbaseWallet, walletConnect, injected } from "wagmi/connectors"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!


const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY

export const wagmiConfig = createConfig({
    chains: [mainnet, bsc, arbitrum],

    connectors: [
        metaMask({
            dappMetadata: { name: "Tradesk" },
        }),
        coinbaseWallet({
            appName: "Tradesk",
        }),
        walletConnect({
            projectId,
            metadata: {
                name: "Tradesk",
                description: "Multi-chain trading & arbitrage platform",
                url: process.env.NEXT_PUBLIC_APP_URL ?? "https://tradesk.app",
                icons: ["https://tradesk.app/logo.png"],
            },
            showQrModal: true,
        }),
        injected({ target: "metaMask" }),
    ],

    transports: {
        [mainnet.id]: fallback([
            http(alchemyKey ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}` : ""),
            http("https://eth.llamarpc.com"),
            http("https://ethereum.publicnode.com"),
        ]),
        [bsc.id]: fallback([
            http("https://bsc-dataseed1.binance.org"),
            http("https://bsc-dataseed2.binance.org"),
            http("https://bsc.publicnode.com"),
        ]),
        [arbitrum.id]: fallback([
            http(alchemyKey ? `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}` : ""),
            http("https://arb1.arbitrum.io/rpc"),
            http("https://arbitrum.publicnode.com"),
        ]),
    },

    ssr: true,
})

declare module "wagmi" {
    interface Register {
        config: typeof wagmiConfig
    }
}

export const SUPPORTED_CHAINS = [mainnet, bsc, arbitrum]