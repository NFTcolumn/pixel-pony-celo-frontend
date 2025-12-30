import { http, createConfig } from 'wagmi'
import { celo, mainnet, base, polygon, optimism, arbitrum } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

export const config = createConfig({
  chains: [celo, mainnet, base, polygon, optimism, arbitrum],
  connectors: [
    injected(),
    walletConnect({ projectId: 'a7c920b15e31b08a73de71a7d4a55d9e' }),
  ],
  transports: {
    [celo.id]: http('https://api.tatum.io/v3/blockchain/node/celo-mainnet/t-695438d3445c47886798da81-b449be95ffbe4731983879c7', {
      batch: false,
      retryCount: 2,
      retryDelay: 2000,
      timeout: 30000,
    }),
    [mainnet.id]: http(),
    [base.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
