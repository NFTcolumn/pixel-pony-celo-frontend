import { Link, Outlet } from 'react-router-dom'
import { useAccount, useConnect, useDisconnect, useReadContract } from 'wagmi'
import { useState } from 'react'
import './Layout.css'
import TokenPriceBar from './TokenPriceBar'
import ChainSwitcher from './ChainSwitcher'

const PONY_TOKEN_ADDRESS = '0x000BE46901ea6f7ac2c1418D158f2f0A80992c07'
const MIN_PONY_BALANCE = BigInt('1000000000000000000000000000000') // 1 trillion PONY (18 decimals)

const PONY_TOKEN_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

export default function Layout() {
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()
  const [showConnectors, setShowConnectors] = useState(false)

  // Check PONY balance for PVP access
  const { data: ponyBalance } = useReadContract({
    address: PONY_TOKEN_ADDRESS,
    abi: PONY_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: 42220,
    query: { enabled: !!address && isConnected }
  })

  const hasPVPAccess = ponyBalance && ponyBalance >= MIN_PONY_BALANCE


  return (
    <div className="layout">
      <ChainSwitcher />
      <TokenPriceBar />

      <header className="site-header">
        <div className="header-container">
          <div className="logo-section">
            <Link to="/">
              <img src="/logo.png" alt="Pixel Ponies" className="site-logo" />
            </Link>
            <div className="tagline">16 PIXELATED PONIES RACING ON-CHAIN</div>
          </div>

          <nav className="main-nav">
            <Link to="/">Home</Link>
            <Link to="/game">Game</Link>
            {hasPVPAccess ? <Link to="/pvp">PVP</Link> : null}
            <Link to="/referrals">Referrals</Link>
            <Link to="/story">Story</Link>
            <Link to="/whitepaper">Whitepaper</Link>
            <Link to="/buy">Buy</Link>
          </nav>

          <div className="wallet-section">
            {isConnected && address ? (
              <button onClick={() => disconnect()} className="disconnect-btn">
                Disconnect
              </button>
            ) : (
              <div className="connect-dropdown">
                <button
                  onClick={() => setShowConnectors(!showConnectors)}
                  className="connect-btn"
                >
                  Connect Wallet
                </button>
                {showConnectors && (
                  <div className="connector-menu">
                    {connectors.map((connector) => (
                      <button
                        key={connector.id}
                        onClick={() => {
                          connect({ connector })
                          setShowConnectors(false)
                        }}
                        className="connector-option"
                      >
                        {connector.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-section">
            <h4>Pixel Ponies</h4>
            <p>On-chain horse racing on Celo</p>
          </div>
          <div className="footer-section">
            <h4>Links</h4>
            <nav className="footer-nav">
              <Link to="/terms">Terms</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/whitepaper">Whitepaper</Link>
            </nav>
          </div>
          <div className="footer-section">
            <h4>Social</h4>
            <div className="social-links">
              <a href="https://x.com/pxponies" target="_blank" rel="noopener noreferrer">Twitter</a>
              <a href="https://t.me/pixelponies" target="_blank" rel="noopener noreferrer">Telegram</a>
            </div>
          </div>
          <div className="footer-section">
            <h4>Contracts</h4>
            <div className="contract-links">
              <a href="https://explorer.celo.org/mainnet/address/0x000BE46901ea6f7ac2c1418D158f2f0A80992c07" target="_blank" rel="noopener noreferrer">PONY Token</a>
              <a href="https://explorer.celo.org/mainnet/address/0x3e9b5F357326a399aff2988eC501E28C9DD9f3b9" target="_blank" rel="noopener noreferrer">Game Contract</a>
              <a href="https://explorer.celo.org/mainnet/address/0x739331647Fa2dBefe2c7A2E453A26Ee9f4a9965A" target="_blank" rel="noopener noreferrer">PVP Contract</a>
              <a href="https://explorer.celo.org/mainnet/address/0x0A777DaB9527c1f85612E4EBd41bfB8677d4e10a" target="_blank" rel="noopener noreferrer">Vault</a>
              <a href="https://explorer.celo.org/mainnet/address/0xFF5987F04850c092C2Af855894fBF1679610Df23" target="_blank" rel="noopener noreferrer">Referral Contract</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>2024 Pixel Ponies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
