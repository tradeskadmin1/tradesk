import type { SupportedChainId } from './chains'

export interface TokenConfig {
    symbol: string
    name: string
    decimals: number
    addresses: Partial<Record<SupportedChainId, `0x${string}`>>
    coingeckoId: string
    logoUrl?: string
}


export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as const

export const TOKENS: Record<string, TokenConfig> = {
    ETH: {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        addresses: {
            1: NATIVE_TOKEN_ADDRESS,
            42161: NATIVE_TOKEN_ADDRESS,
        },
        coingeckoId: 'ethereum',
    },
    WETH: {
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        addresses: {
            1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            56: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
            42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        },
        coingeckoId: 'weth',
    },
    WBTC: {
        symbol: 'WBTC',
        name: 'Wrapped Bitcoin',
        decimals: 8,
        addresses: {
            1: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
            56: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
            42161: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
        },
        coingeckoId: 'wrapped-bitcoin',
    },
    BNB: {
        symbol: 'BNB',
        name: 'BNB',
        decimals: 18,
        addresses: {
            56: NATIVE_TOKEN_ADDRESS,
        },
        coingeckoId: 'binancecoin',
    },
    WBNB: {
        symbol: 'WBNB',
        name: 'Wrapped BNB',
        decimals: 18,
        addresses: {
            56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        },
        coingeckoId: 'wbnb',
    },
    USDC: {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        addresses: {
            1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
            42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        },
        coingeckoId: 'usd-coin',
    },
    USDT: {
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        addresses: {
            1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            56: '0x55d398326f99059fF775485246999027B3197955',
            42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        },
        coingeckoId: 'tether',
    },
    ARB: {
        symbol: 'ARB',
        name: 'Arbitrum',
        decimals: 18,
        addresses: {
            42161: '0x912CE59144191C1204E64559FE8253a0e49E6548',
        },
        coingeckoId: 'arbitrum',
    },
    LINK: {
        symbol: 'LINK',
        name: 'Chainlink',
        decimals: 18,
        addresses: {
            1: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
            56: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD',
            42161: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
        },
        coingeckoId: 'chainlink',
    },
    UNI: {
        symbol: 'UNI',
        name: 'Uniswap',
        decimals: 18,
        addresses: {
            1: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
            42161: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
        },
        coingeckoId: 'uniswap',
    },
    AAVE: {
        symbol: 'AAVE',
        name: 'Aave',
        decimals: 18,
        addresses: {
            1: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
            42161: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196',
        },
        coingeckoId: 'aave',
    },

    // ── New tokens ─────────────────────────────────────────────────────────────

    MATIC: {
        symbol: 'MATIC',
        name: 'Polygon',
        decimals: 18,
        addresses: {
            1:  '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
            56: '0xCC42724C6683B7E57334c4E856f4c9965ED682bD',
        },
        coingeckoId: 'matic-network',
    },
    PEPE: {
        symbol: 'PEPE',
        name: 'Pepe',
        decimals: 18,
        addresses: {
            1: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
        },
        coingeckoId: 'pepe',
    },
    SHIB: {
        symbol: 'SHIB',
        name: 'Shiba Inu',
        decimals: 18,
        addresses: {
            1:  '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
            56: '0x2859e4544C4bB03966803b044A93563Bd2D0DD4D',
        },
        coingeckoId: 'shiba-inu',
    },
    GMX: {
        symbol: 'GMX',
        name: 'GMX',
        decimals: 18,
        addresses: {
            42161: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
        },
        coingeckoId: 'gmx',
    },
    CAKE: {
        symbol: 'CAKE',
        name: 'PancakeSwap',
        decimals: 18,
        addresses: {
            56: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
        },
        coingeckoId: 'pancakeswap-token',
    },
    CRV: {
        symbol: 'CRV',
        name: 'Curve DAO',
        decimals: 18,
        addresses: {
            1:     '0xD533a949740bb3306d119CC777fa900bA034cd52',
            42161: '0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978',
        },
        coingeckoId: 'curve-dao-token',
    },
    LDO: {
        symbol: 'LDO',
        name: 'Lido DAO',
        decimals: 18,
        addresses: {
            1:     '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
            42161: '0x13Ad51ed4F1B7e9Dc168d8a00cB3f4dDD85EfA60',
        },
        coingeckoId: 'lido-dao',
    },
    MKR: {
        symbol: 'MKR',
        name: 'Maker',
        decimals: 18,
        addresses: {
            1: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
        },
        coingeckoId: 'maker',
    },
    SNX: {
        symbol: 'SNX',
        name: 'Synthetix',
        decimals: 18,
        addresses: {
            1: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
        },
        coingeckoId: 'havven',
    },
    ONEINCH: {
        symbol: '1INCH',
        name: '1inch',
        decimals: 18,
        addresses: {
            1:  '0x111111111117dC0aa78b770fA6A738034120C302',
            56: '0x111111111117dC0aa78b770fA6A738034120C302',
        },
        coingeckoId: '1inch',
    },
    GRT: {
        symbol: 'GRT',
        name: 'The Graph',
        decimals: 18,
        addresses: {
            1:     '0xc944E90C64B2c07662A292be6244BDf05Cda44a7',
            42161: '0x9623063377AD1B27544C965cCd7342f7EA7e88C7',
        },
        coingeckoId: 'the-graph',
    },

    // ── Bridge / cross-chain tokens ────────────────────────────────────────────

    STG: {
        symbol: 'STG',
        name: 'Stargate Finance',
        decimals: 18,
        addresses: {
            1:     '0xAf5191B0de278C7286d6C7CC6ab6BB8a73bA2cd6',
            56:    '0xB0D502E938ed5F4df2E681fE6E419ff29631d62b',
            42161: '0x6694340fc020c5E6B96567843da2DF01b2CE1Eb6',
        },
        coingeckoId: 'stargate-finance',
    },
    WOO: {
        symbol: 'WOO',
        name: 'WOO Network',
        decimals: 18,
        addresses: {
            1:     '0x4691937a7508860F876c9c0a2a617E7d9E945D4B',
            56:    '0x4691937a7508860F876c9c0a2a617E7d9E945D4B',
            42161: '0xcAFcD85D8ca7Ad1e1C6F82F651fA15E33AEfD07d',
        },
        coingeckoId: 'woo-network',
    },

    // ── Yield / DeFi infrastructure ────────────────────────────────────────────

    PENDLE: {
        symbol: 'PENDLE',
        name: 'Pendle Finance',
        decimals: 18,
        addresses: {
            1:     '0x808507121B80c02388fAEd98D3723f4e29eC01A5',
            42161: '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8',
        },
        coingeckoId: 'pendle',
    },
    CVX: {
        symbol: 'CVX',
        name: 'Convex Finance',
        decimals: 18,
        addresses: {
            1: '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
        },
        coingeckoId: 'convex-finance',
    },
    YFI: {
        symbol: 'YFI',
        name: 'Yearn Finance',
        decimals: 18,
        addresses: {
            1:     '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
            42161: '0x82e3A8F066a6989666b031d916c43672085b1582',
        },
        coingeckoId: 'yearn-finance',
    },
    FXS: {
        symbol: 'FXS',
        name: 'Frax Share',
        decimals: 18,
        addresses: {
            1:     '0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0',
            42161: '0x9d2F299715D94d8A7E6F5eaa8E654E8c74a988A7',
        },
        coingeckoId: 'frax-share',
    },

    // ── DEX governance tokens ──────────────────────────────────────────────────

    SUSHI: {
        symbol: 'SUSHI',
        name: 'SushiSwap',
        decimals: 18,
        addresses: {
            1:     '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
            56:    '0x947950BcC74888a40Ffa2593C5798F11Fc9124C',
            42161: '0xd4d42F0b6DEF4CE0383636770eF773390d85c61A',
        },
        coingeckoId: 'sushi',
    },
    BAL: {
        symbol: 'BAL',
        name: 'Balancer',
        decimals: 18,
        addresses: {
            1:     '0xba100000625a3754423978a60c9317c58a424e3D',
            42161: '0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B',
        },
        coingeckoId: 'balancer',
    },
    COMP: {
        symbol: 'COMP',
        name: 'Compound',
        decimals: 18,
        addresses: {
            1:     '0xc00e94Cb662C3520282E6f5717214004A7f26888',
            42161: '0x354A6dA3fcde098F8389cad84b0182725c6C91dE',
        },
        coingeckoId: 'compound-governance-token',
    },
    JOE: {
        symbol: 'JOE',
        name: 'Trader Joe',
        decimals: 18,
        addresses: {
            42161: '0x371c7ec6D8039ff7933a2AA28EB827Ffe1F52f07',
        },
        coingeckoId: 'joe',
    },

    // ── Arbitrum-native tokens ─────────────────────────────────────────────────

    RDNT: {
        symbol: 'RDNT',
        name: 'Radiant Capital',
        decimals: 18,
        addresses: {
            56:    '0xf7DE7E8A6bd59ED41a4b5fe50278b3B7f31384dF',
            42161: '0x3082CC23568eA640225c2467653dB90e9250AaA0',
        },
        coingeckoId: 'radiant-capital',
    },
    MAGIC: {
        symbol: 'MAGIC',
        name: 'Treasure',
        decimals: 18,
        addresses: {
            1:     '0xB0c7a3Ba49C7a6EaBa6cD4a96C55a1391070Ac9A',
            42161: '0x539bdE0d7Dbd336b79148AA742883198BBF60342',
        },
        coingeckoId: 'magic',
    },

    // ── BSC-specific high-volume tokens ───────────────────────────────────────

    XRP: {
        symbol: 'XRP',
        name: 'XRP (BSC)',
        decimals: 18,
        addresses: {
            56: '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBe',
        },
        coingeckoId: 'ripple',
    },
    ADA: {
        symbol: 'ADA',
        name: 'Cardano (BSC)',
        decimals: 18,
        addresses: {
            56: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47',
        },
        coingeckoId: 'cardano',
    },
    DOT: {
        symbol: 'DOT',
        name: 'Polkadot (BSC)',
        decimals: 18,
        addresses: {
            56: '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402',
        },
        coingeckoId: 'polkadot',
    },
    DOGE: {
        symbol: 'DOGE',
        name: 'Dogecoin (BSC)',
        decimals: 8,
        addresses: {
            56: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43',
        },
        coingeckoId: 'dogecoin',
    },
}

export function getTokenAddress(
    symbol: string,
    chainId: SupportedChainId,
): `0x${string}` | undefined {
    // Handle '1INCH' key stored as 'ONEINCH'
    const key = symbol === '1INCH' ? 'ONEINCH' : symbol
    return TOKENS[key]?.addresses[chainId]
}

export function getTokenByAddress(
    address: string,
    chainId: SupportedChainId,
): TokenConfig | undefined {
    const lower = address.toLowerCase()
    return Object.values(TOKENS).find(
        (t) => t.addresses[chainId]?.toLowerCase() === lower,
    )
}
