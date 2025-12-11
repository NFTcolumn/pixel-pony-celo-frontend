import { http, createConfig } from 'wagmi'
import { celo } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

export const config = createConfig({
  chains: [celo],
  connectors: [
    injected(),
    walletConnect({ projectId: 'a7c920b15e31b08a73de71a7d4a55d9e' }),
  ],
  transports: {
    [celo.id]: http()
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
