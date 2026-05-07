import { createConfig, http, fallback } from "wagmi"
import { mainnet, polygon, arbitrum, base, bsc, optimism, avalanche, } from "viem/chains"
import { metaMask, coinbaseWallet, walletConnect, injected } from "wagmi/connectors"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!

export const wagmiConfig = createConfig({
    chains: [mainnet, arbitrum, base, polygon, bsc, optimism, avalanche],

    connectors: [
        metaMask({
            dappMetadata: {
                name: "Tradesk",
            },
        }),
        coinbaseWallet({
            appName: "Tradesk",
        }),
        walletConnect({
            projectId,
            metadata: {
                name: "Tradesk",
                description: "Multi-chain arbitrage trading platform",
            },
            showQrModal: true,
        }),
        injected({ target: "metaMask" }),
    ],
    transports: {
        [mainnet.id]: fallback([http("https://eth.llamarpc.com"), http("https://ethereum.publicnode.com")]),
        [arbitrum.id]: fallback([http("https://arb1.arbitrum.io/rpc"), http("https://arbitrum.publicnode.com")]),
        [base.id]: fallback([http("https://mainnet.base.org"), http("https://base.publicnode.com")]),
        [polygon.id]: fallback([http("https://polygon-rpc.com"), http("https://polygon.publicnode.com")]),
        [bsc.id]: fallback([http("https://bsc-dataseed.binance.org"), http("https://bsc.publicnode.com")]),
        [optimism.id]: fallback([http("https://mainnet.optimism.io"), http("https://optimism.publicnode.com")]),
        [avalanche.id]: fallback([http("https://api.avax.network/ext/bc/C/rpc"), http("https://avalanche.publicnode.com")]),
    },
    ssr: true,
})
declare module "wagmi" {
    interface Register {
        config: typeof wagmiConfig
    }
}

export const SUPPORTED_CHAINS = [mainnet, arbitrum, base, polygon, bsc, optimism, avalanche]