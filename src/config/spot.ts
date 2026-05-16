import type { SupportedChainId } from './chains'

export const SPOT_CHAIN_ID: SupportedChainId = 42161

export const SPOT_TOKEN_ADDRESSES: Record<string, `0x${string}`> = {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    LINK: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
    UNI: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
    AAVE: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196',
    BTC: '0x0000000000000000000000000000000000000001',
    BNB: '0x0000000000000000000000000000000000000002',
    SOL: '0x0000000000000000000000000000000000000003',
    XRP: '0x0000000000000000000000000000000000000004',
    DOGE: '0x0000000000000000000000000000000000000005',
    SUI: '0x0000000000000000000000000000000000000006',
    ADA: '0x0000000000000000000000000000000000000007',
    AVAX: '0x0000000000000000000000000000000000000008',
    XLM: '0x0000000000000000000000000000000000000009',
    ATOM: '0x000000000000000000000000000000000000000A',
    LTC: '0x000000000000000000000000000000000000000B',
    BCH: '0x000000000000000000000000000000000000000C',
    MATIC: '0x000000000000000000000000000000000000000D',
    PEPE: '0x000000000000000000000000000000000000000E',
    SHIB: '0x000000000000000000000000000000000000000F',
    NEAR: '0x0000000000000000000000000000000000000010',
    TRUMP: '0x0000000000000000000000000000000000000011',
    PENGU: '0x0000000000000000000000000000000000000012',
    BONK: '0x0000000000000000000000000000000000000013',
    WIF: '0x0000000000000000000000000000000000000014',
    FLOKI: '0x0000000000000000000000000000000000000015',
    MOODENG: '0x0000000000000000000000000000000000000016',
    POPCAT: '0x0000000000000000000000000000000000000017',
    MEW: '0x0000000000000000000000000000000000000018',
    NEIRO: '0x0000000000000000000000000000000000000019',
    MEME: '0x000000000000000000000000000000000000001A',
    TURBO: '0x000000000000000000000000000000000000001B',
    DOGS: '0x000000000000000000000000000000000000001C',
}

export function getSpotTokenAddress(symbol: string): `0x${string}` {
    return SPOT_TOKEN_ADDRESSES[symbol] ?? '0x0000000000000000000000000000000000000000'
}

export interface SpotPair {
    symbol: string
    base: string
    quote: string
    binanceSymbol: string
    gmxSymbol: string | null
    coingeckoId: string
    minOrderSize: number
    pricePrecision: number
    amountPrecision: number
    logoUrl: string
}

export const SPOT_PAIRS: SpotPair[] = [
    {
        symbol: 'BTC/USDT', base: 'BTC', quote: 'USDT',
        binanceSymbol: 'BTCUSDT', gmxSymbol: 'BTC', coingeckoId: 'bitcoin',
        minOrderSize: 0.00001, pricePrecision: 2, amountPrecision: 5,
        logoUrl: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    },
    {
        symbol: 'ETH/USDT', base: 'ETH', quote: 'USDT',
        binanceSymbol: 'ETHUSDT', gmxSymbol: 'ETH', coingeckoId: 'ethereum',
        minOrderSize: 0.0001, pricePrecision: 2, amountPrecision: 4,
        logoUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    },
    {
        symbol: 'BNB/USDT', base: 'BNB', quote: 'USDT',
        binanceSymbol: 'BNBUSDT', gmxSymbol: 'BNB', coingeckoId: 'binancecoin',
        minOrderSize: 0.001, pricePrecision: 2, amountPrecision: 3,
        logoUrl: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    },
    {
        symbol: 'SOL/USDT', base: 'SOL', quote: 'USDT',
        binanceSymbol: 'SOLUSDT', gmxSymbol: 'SOL', coingeckoId: 'solana',
        minOrderSize: 0.01, pricePrecision: 3, amountPrecision: 3,
        logoUrl: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
    },
    {
        symbol: 'XRP/USDT', base: 'XRP', quote: 'USDT',
        binanceSymbol: 'XRPUSDT', gmxSymbol: 'XRP', coingeckoId: 'ripple',
        minOrderSize: 1, pricePrecision: 4, amountPrecision: 1,
        logoUrl: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
    },
    {
        symbol: 'DOGE/USDT', base: 'DOGE', quote: 'USDT',
        binanceSymbol: 'DOGEUSDT', gmxSymbol: 'DOGE', coingeckoId: 'dogecoin',
        minOrderSize: 1, pricePrecision: 5, amountPrecision: 1,
        logoUrl: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
    },
    {
        symbol: 'SUI/USDT', base: 'SUI', quote: 'USDT',
        binanceSymbol: 'SUIUSDT', gmxSymbol: null, coingeckoId: 'sui',
        minOrderSize: 1, pricePrecision: 4, amountPrecision: 1,
        logoUrl: 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg',
    },
    {
        symbol: 'ADA/USDT', base: 'ADA', quote: 'USDT',
        binanceSymbol: 'ADAUSDT', gmxSymbol: null, coingeckoId: 'cardano',
        minOrderSize: 1, pricePrecision: 4, amountPrecision: 1,
        logoUrl: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
    },
    {
        symbol: 'AVAX/USDT', base: 'AVAX', quote: 'USDT',
        binanceSymbol: 'AVAXUSDT', gmxSymbol: 'AVAX', coingeckoId: 'avalanche-2',
        minOrderSize: 0.01, pricePrecision: 3, amountPrecision: 3,
        logoUrl: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
    },
    {
        symbol: 'NEAR/USDT', base: 'NEAR', quote: 'USDT',
        binanceSymbol: 'NEARUSDT', gmxSymbol: 'NEAR', coingeckoId: 'near',
        minOrderSize: 0.1, pricePrecision: 3, amountPrecision: 2,
        logoUrl: 'https://assets.coingecko.com/coins/images/10365/small/near_icon.png',
    },
    {
        symbol: 'LINK/USDT', base: 'LINK', quote: 'USDT',
        binanceSymbol: 'LINKUSDT', gmxSymbol: 'LINK', coingeckoId: 'chainlink',
        minOrderSize: 0.1, pricePrecision: 4, amountPrecision: 2,
        logoUrl: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
    },
    {
        symbol: 'ARB/USDT', base: 'ARB', quote: 'USDT',
        binanceSymbol: 'ARBUSDT', gmxSymbol: 'ARB', coingeckoId: 'arbitrum',
        minOrderSize: 0.1, pricePrecision: 4, amountPrecision: 2,
        logoUrl: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
    },
    {
        symbol: 'UNI/USDT', base: 'UNI', quote: 'USDT',
        binanceSymbol: 'UNIUSDT', gmxSymbol: 'UNI', coingeckoId: 'uniswap',
        minOrderSize: 0.1, pricePrecision: 3, amountPrecision: 2,
        logoUrl: 'https://assets.coingecko.com/coins/images/12504/small/uni.jpg',
    },
    {
        symbol: 'ATOM/USDT', base: 'ATOM', quote: 'USDT',
        binanceSymbol: 'ATOMUSDT', gmxSymbol: null, coingeckoId: 'cosmos',
        minOrderSize: 0.1, pricePrecision: 3, amountPrecision: 2,
        logoUrl: 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png',
    },
    {
        symbol: 'LTC/USDT', base: 'LTC', quote: 'USDT',
        binanceSymbol: 'LTCUSDT', gmxSymbol: null, coingeckoId: 'litecoin',
        minOrderSize: 0.001, pricePrecision: 2, amountPrecision: 3,
        logoUrl: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
    },
    {
        symbol: 'BCH/USDT', base: 'BCH', quote: 'USDT',
        binanceSymbol: 'BCHUSDT', gmxSymbol: null, coingeckoId: 'bitcoin-cash',
        minOrderSize: 0.001, pricePrecision: 2, amountPrecision: 3,
        logoUrl: 'https://assets.coingecko.com/coins/images/780/small/bitcoin-cash-circle.png',
    },
    {
        symbol: 'XLM/USDT', base: 'XLM', quote: 'USDT',
        binanceSymbol: 'XLMUSDT', gmxSymbol: null, coingeckoId: 'stellar',
        minOrderSize: 1, pricePrecision: 5, amountPrecision: 1,
        logoUrl: 'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png',
    },
    {
        symbol: 'MATIC/USDT', base: 'MATIC', quote: 'USDT',
        binanceSymbol: 'MATICUSDT', gmxSymbol: null, coingeckoId: 'matic-network',
        minOrderSize: 1, pricePrecision: 4, amountPrecision: 1,
        logoUrl: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',
    },
    {
        symbol: 'PEPE/USDT', base: 'PEPE', quote: 'USDT',
        binanceSymbol: 'PEPEUSDT', gmxSymbol: null, coingeckoId: 'pepe',
        minOrderSize: 100000, pricePrecision: 8, amountPrecision: 0,
        logoUrl: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg',
    },
    {
        symbol: 'SHIB/USDT', base: 'SHIB', quote: 'USDT',
        binanceSymbol: 'SHIBUSDT', gmxSymbol: null, coingeckoId: 'shiba-inu',
        minOrderSize: 100000, pricePrecision: 8, amountPrecision: 0,
        logoUrl: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
    },
    {
        symbol: 'TRUMP/USDT', base: 'TRUMP', quote: 'USDT',
        binanceSymbol: 'TRUMPUSDT', gmxSymbol: null, coingeckoId: 'official-trump',
        minOrderSize: 1, pricePrecision: 4, amountPrecision: 2,
        logoUrl: 'https://assets.coingecko.com/coins/images/35236/small/Trump.jpg',
    },
    {
        symbol: 'PENGU/USDT', base: 'PENGU', quote: 'USDT',
        binanceSymbol: 'PENGUUSDT', gmxSymbol: null, coingeckoId: 'pudgy-penguins',
        minOrderSize: 100, pricePrecision: 6, amountPrecision: 0,
        logoUrl: 'https://assets.coingecko.com/coins/images/35718/small/pengu.png',
    },
    {
        symbol: 'BONK/USDT', base: 'BONK', quote: 'USDT',
        binanceSymbol: 'BONKUSDT', gmxSymbol: null, coingeckoId: 'bonk',
        minOrderSize: 100000, pricePrecision: 8, amountPrecision: 0,
        logoUrl: 'https://assets.coingecko.com/coins/images/28600/small/bonk.jpg',
    },
    {
        symbol: 'WIF/USDT', base: 'WIF', quote: 'USDT',
        binanceSymbol: 'WIFUSDT', gmxSymbol: null, coingeckoId: 'dogwifhat',
        minOrderSize: 10, pricePrecision: 4, amountPrecision: 1,
        logoUrl: 'https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg',
    },
    {
        symbol: 'FLOKI/USDT', base: 'FLOKI', quote: 'USDT',
        binanceSymbol: 'FLOKIUSDT', gmxSymbol: null, coingeckoId: 'floki',
        minOrderSize: 10000, pricePrecision: 8, amountPrecision: 0,
        logoUrl: 'https://assets.coingecko.com/coins/images/16746/small/PNG_image.png',
    },
    {
        symbol: 'MOODENG/USDT', base: 'MOODENG', quote: 'USDT',
        binanceSymbol: 'MOODENGUSDT', gmxSymbol: null, coingeckoId: 'moo-deng',
        minOrderSize: 10, pricePrecision: 5, amountPrecision: 1,
        logoUrl: 'https://coin-images.coingecko.com/coins/images/50264/large/MOODENG.jpg?1726726975',
    },
    {
        symbol: 'POPCAT/USDT', base: 'POPCAT', quote: 'USDT',
        binanceSymbol: 'POPCATUSDT', gmxSymbol: null, coingeckoId: 'popcat',
        minOrderSize: 10, pricePrecision: 4, amountPrecision: 1,
        logoUrl: 'https://coin-images.coingecko.com/coins/images/33760/large/image.jpg?1702964227',
    },
    {
        symbol: 'MEW/USDT', base: 'MEW', quote: 'USDT',
        binanceSymbol: 'MEWUSDT', gmxSymbol: null, coingeckoId: 'cat-in-a-dogs-world',
        minOrderSize: 100, pricePrecision: 6, amountPrecision: 0,
        logoUrl: 'https://coin-images.coingecko.com/coins/images/36440/large/MEW.png?1711442286',
    },
    {
        symbol: 'NEIRO/USDT', base: 'NEIRO', quote: 'USDT',
        binanceSymbol: 'NEIROUSDT', gmxSymbol: null, coingeckoId: 'neiro',
        minOrderSize: 1000, pricePrecision: 7, amountPrecision: 0,
        logoUrl: 'https://coin-images.coingecko.com/coins/images/39411/large/logo_new_%281%29.png?1722541389',
    },
    {
        symbol: 'MEME/USDT', base: 'MEME', quote: 'USDT',
        binanceSymbol: 'MEMEUSDT', gmxSymbol: null, coingeckoId: 'memecoin-2',
        minOrderSize: 100, pricePrecision: 6, amountPrecision: 0,
        logoUrl: 'https://coin-images.coingecko.com/coins/images/32528/large/memecoin_%282%29.png?1698912168',
    },
    {
        symbol: 'TURBO/USDT', base: 'TURBO', quote: 'USDT',
        binanceSymbol: 'TURBOUSDT', gmxSymbol: null, coingeckoId: 'turbo',
        minOrderSize: 100, pricePrecision: 7, amountPrecision: 0,
        logoUrl: 'https://coin-images.coingecko.com/coins/images/30117/large/TurboMark-QL_200.png?1708079597',
    },
    {
        symbol: 'DOGS/USDT', base: 'DOGS', quote: 'USDT',
        binanceSymbol: 'DOGSUSDT', gmxSymbol: null, coingeckoId: 'dogs-2',
        minOrderSize: 1000, pricePrecision: 7, amountPrecision: 0,
        logoUrl: 'https://coin-images.coingecko.com/coins/images/39699/large/dogs_logo_200x200.png?1723687163',
    },
    {
        symbol: 'ETH/BTC', base: 'ETH', quote: 'BTC',
        binanceSymbol: 'ETHBTC', gmxSymbol: null, coingeckoId: 'ethereum',
        minOrderSize: 0.001, pricePrecision: 6, amountPrecision: 4,
        logoUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    },
]

export const SPOT_FEE_RATE = 0.001

export const SPOT_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const
export type SpotInterval = typeof SPOT_INTERVALS[number]

export function getPairBySymbol(symbol: string): SpotPair | undefined {
    return SPOT_PAIRS.find((p) => p.symbol === symbol)
}
