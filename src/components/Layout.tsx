import { Link, Outlet } from 'react-router-dom'
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { useState, useEffect } from 'react'
import { celo } from 'wagmi/chains'
import './Layout.css'

export default function Layout() {
  const { address, isConnected, chain } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const [showConnectors, setShowConnectors] = useState(false)

  // Auto-switch to Celo when wallet connects or chain changes
  useEffect(() => {
    if (isConnected && chain && chain.id !== celo.id) {
      console.log(`Wrong chain detected: ${chain.id}, switching to BNB (${celo.id})...`)
      switchChain({ chainId: celo.id })
    }
  }, [isConnected, chain, switchChain])

  // Additional check on mount - force BNB if connected to wrong chain
  useEffect(() => {
    if (isConnected && chain && chain.id !== celo.id) {
      console.log('Initial check: switching to Celo')
      switchChain({ chainId: celo.id })
    }
  }, [])


  return (
    <div className="layout">
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
            <Link to="/referrals">Referrals</Link>
            <Link to="/story">Story</Link>
            <Link to="/whitepaper">Whitepaper</Link>
            <Link to="/buy">Buy</Link>
          </nav>

          <div className="wallet-section">
            {isConnected && address ? (
              <>
                {chain && chain.id !== celo.id && (
                  <button
                    onClick={() => switchChain({ chainId: celo.id })}
                    className="connect-btn"
                    style={{ background: '#ff6b6b', marginRight: '8px' }}
                  >
                    Switch to Celo
                  </button>
                )}
                <button onClick={() => disconnect()} className="disconnect-btn">
                  Disconnect
                </button>
              </>
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
              <a href="https://bscscan.com/address/0xde2f957BF8B9459e9E998b98789Af02920404ad8" target="_blank" rel="noopener noreferrer">PONY Token</a>
              <a href="https://bscscan.com/address/0x2B4652Bd6149E407E3F57190E25cdBa1FC9d37d8" target="_blank" rel="noopener noreferrer">Game Contract</a>
              <a href="https://bscscan.com/address/0x6ab297799335E7b0f60d9e05439Df156cf694Ba7" target="_blank" rel="noopener noreferrer">Vault</a>
              <a href="https://bscscan.com/address/0x1AAEc9089CA654869BDE20E128fC421D14Dc1a4C" target="_blank" rel="noopener noreferrer">Referral Contract</a>
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
