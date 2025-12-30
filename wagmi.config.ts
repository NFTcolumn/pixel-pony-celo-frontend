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
    [celo.id]: http('https://1rpc.io/celo', {
      batch: false,
      retryCount: 3,
      retryDelay: 1000,
      timeout: 10000, // 10 second timeout for RPC requests
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
