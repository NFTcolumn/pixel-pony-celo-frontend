import { Link } from 'react-router-dom'
import { useReadContract } from 'wagmi'
import { formatEther } from 'viem'
import './Home.css'
import PIXEL_PONY_ABI_FULL from '../PixelPonyABI.json'

const PIXEL_PONY_ADDRESS = '0x3e9b5F357326a399aff2988eC501E28C9DD9f3b9'
const PONY_TOKEN_ADDRESS = '0x000BE46901ea6f7ac2c1418D158f2f0A80992c07'

const PONY_TOKEN_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

function formatPony(num: string): string {
  const absNum = Math.abs(parseFloat(num))
  if (absNum >= 1e12) return (absNum / 1e12).toFixed(1) + 'T'
  if (absNum >= 1e9) return (absNum / 1e9).toFixed(1) + 'B'
  if (absNum >= 1e6) return (absNum / 1e6).toFixed(1) + 'M'
  if (absNum >= 1e3) return (absNum / 1e3).toFixed(1) + 'K'
  return absNum.toFixed(2)
}

export default function Home() {
  // Read game stats from contract
  const { data: gameStats } = useReadContract({
    address: PIXEL_PONY_ADDRESS,
    abi: PIXEL_PONY_ABI_FULL,
    functionName: 'getGameStats',
    chainId: 42220
  })

  // Get total PONY wagered by checking how much PONY the contract has spent
  const { data: gameContractBalance } = useReadContract({
    address: PONY_TOKEN_ADDRESS,
    abi: PONY_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [PIXEL_PONY_ADDRESS],
    chainId: 42220
  })

  // Parse stats from getGameStats()
  // Returns: [totalRaces, totalTickets, jackpotAmount, jackpotNumbers, totalPlayers, snapshotCount]
  const totalRaces = gameStats && Array.isArray(gameStats)
    ? Number(gameStats[0])
    : 0

  const jackpotPool = gameStats && Array.isArray(gameStats)
    ? formatPony(formatEther(gameStats[2]))
    : '0'

  // Total unique players from contract
  const totalPlayers = gameStats && Array.isArray(gameStats)
    ? Number(gameStats[4])
    : 0

  // Game contract balance shows how much PONY is in the game
  const ponyInGame = gameContractBalance
    ? formatPony(formatEther(gameContractBalance))
    : '0'

  return (
    <div className="home-page">
      <section className="hero">
        <img src="/logo.png" alt="Pixel Ponies" className="hero-logo" />
        <p className="hero-subtitle">16 Pixelated Ponies Racing On-Chain for No Reason</p>
        <div className="hero-buttons">
          <Link to="/game" className="cta-button primary">
            PLAY NOW
          </Link>
          <Link to="/buy" className="cta-button secondary">
            BUY $PONY
          </Link>
        </div>
      </section>

      <section className="features">
        <h2>How It Works</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">01</div>
            <h3>Connect Wallet</h3>
            <p>Connect your CELO wallet to get started</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">02</div>
            <h3>Pick Your Pony</h3>
            <p>Choose from 16 unique pixel ponies</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">03</div>
            <h3>Place Your Bet</h3>
            <p>Bet PONY tokens on your chosen pony</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">04</div>
            <h3>Race & Win</h3>
            <p>Watch the race and win big prizes</p>
          </div>
        </div>
      </section>

      <section className="stats">
        <h2>Live Stats</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{totalRaces.toLocaleString()}</div>
            <div className="stat-label">Total Races</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{jackpotPool}</div>
            <div className="stat-label">Jackpot Pool</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalPlayers}</div>
            <div className="stat-label">Unique Players</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{ponyInGame}</div>
            <div className="stat-label">PONY In Game</div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to Race?</h2>
        <p>Join the pixel pony racing revolution on CELO Chain</p>
        <Link to="/game" className="cta-button primary large">
          START RACING NOW
        </Link>
      </section>
    </div>
  )
}
