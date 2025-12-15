import './Whitepaper.css'

export default function Whitepaper() {
  return (
    <div className="whitepaper-page">
      <div className="whitepaper-container">
        <h1>WHITEPAPER V1</h1>
        <p className="whitepaper-subtitle">
          INSTANT 16-HORSE RACING ON CELO
        </p>

        {/* Abstract */}
        <section className="whitepaper-section">
          <h2>Abstract</h2>
          <p>
            Pixel Pony introduces a straightforward, transparent gaming ecosystem that combines instant single-player horse racing with sustainable tokenomics. Built on Celo with security-hardened smart contracts, the protocol generates revenue through platform fees while protecting players and the ecosystem with an innovative pull-based jackpot failsafe system.
          </p>
        </section>

        {/* Protocol Overview */}
        <section className="whitepaper-section whitepaper-highlight">
          <h2>1. Protocol Overview</h2>

          <h3>Game Mechanics</h3>
          <ul>
            <li><strong>Instant racing:</strong> Bet placed → Race executes immediately → Result determined</li>
            <li><strong>Single-player focus:</strong> Each bet creates its own race</li>
            <li><strong>16 horses per race</strong> with enhanced on-chain randomness (10 entropy sources)</li>
            <li><strong>Fair multipliers:</strong> 10x (1st), 2.5x (2nd), 1x (3rd place)</li>
            <li><strong>Pure on-chain execution:</strong> No external dependencies</li>
            <li><strong>Lottery system</strong> with progressive jackpot</li>
          </ul>

          <h3 style={{ margin: '16px 0 8px' }}>Key Innovation: PULL-BASED JACKPOT FAILSAFE</h3>
          <p>
            Pixel Pony protects the gaming ecosystem with an innovative failsafe mechanism:
          </p>
          <ul>
            <li>Jackpot automatically triggers distribution if it exceeds 50% of game supply</li>
            <li>Players claim their proportional share (based on total wagered)</li>
            <li>Each player pays only their own gas (~$2-5)</li>
            <li>Scalable to unlimited players (no gas limit issues)</li>
            <li>Fully autonomous after deployment</li>
            <li>Prevents game supply lockup</li>
          </ul>
        </section>

        {/* Tokenomics */}
        <section className="whitepaper-section">
          <h2>2. Tokenomics Structure</h2>
          <h3>Total Supply: 100 Trillion PONY Tokens</h3>

          <p><strong>Initial Distribution:</strong></p>
          <ul>
            <li><strong>Game Contract:</strong> 50T tokens (50%) - For gameplay rewards and payouts</li>
            <li><strong>Liquidity Pool:</strong> 40T tokens (40%) - For DEX liquidity</li>
            <li><strong>Marketing:</strong> 5T tokens (5%) - Marketing and growth initiatives</li>
            <li><strong>Dev Operations:</strong> 5T tokens (5%) - Development and operations</li>
          </ul>

          <h3 style={{ margin: '16px 0 8px' }}>Security Features:</h3>
          <ul>
            <li>✅ <strong>No minting</strong> capability after deployment</li>
            <li>✅ <strong>Fixed pragma</strong> (Solidity 0.8.20) - No compiler variations</li>
            <li>✅ <strong>Zero address validation</strong> - All inputs validated</li>
            <li>✅ <strong>ReentrancyGuard</strong> - Protection against reentrancy attacks</li>
            <li>✅ <strong>Checked transfers</strong> - All token transfers verified</li>
            <li>✅ <strong>Gas optimized</strong> - Efficient execution</li>
            <li>✅ <strong>Pull-based claims</strong> - Scalable failsafe system</li>
            <li>✅ <strong>Ownership renounceable</strong> - Can become fully immutable</li>
            <li>✅ <strong>Transparent</strong> - Verified source code on Blockscout</li>
          </ul>
        </section>

        {/* Revenue Model */}
        <section className="whitepaper-section whitepaper-highlight">
          <h2>3. Revenue Model</h2>

          <h3>Platform Fees (10% of all bets in PONY)</h3>
          <p><strong>Fee Distribution:</strong></p>
          <ul>
            <li><strong>Dev Wallet:</strong> 50% of platform fee (5% of total bets)</li>
            <li><strong>Marketing Wallet:</strong> 25% of platform fee (2.5% of total bets)</li>
            <li><strong>Jackpot Pool:</strong> 25% of platform fee (2.5% of total bets)</li>
          </ul>

          <p style={{ marginTop: '12px' }}>
            <strong>Remaining 90% goes to:</strong>
          </p>
          <ul>
            <li><strong>Winner Payouts:</strong> Direct payouts to winning bettors (10x, 2.5x, 1x)</li>
            <li><strong>Game Operations:</strong> Sustainable gameplay</li>
          </ul>

          <h3 style={{ margin: '16px 0 8px' }}>CELO Entry Fees (1 CELO per bet)</h3>
          <ul>
            <li><strong>Dev Wallet:</strong> 50% of CELO fees</li>
            <li><strong>Marketing Wallet:</strong> 50% of CELO fees</li>
          </ul>
        </section>

        {/* Player Economics */}
        <section className="whitepaper-section">
          <h2>4. Player Economics</h2>

          <h3>Win Probabilities</h3>
          <ul>
            <li>3 winning positions out of 16 horses</li>
            <li>~18.75% chance to win something</li>
            <li>Fair odds with house edge</li>
          </ul>

          <h3 style={{ margin: '16px 0 8px' }}>Expected Value (per 10B PONY bet)</h3>
          <ul>
            <li>1st place (6.25% chance): 100B PONY</li>
            <li>2nd place (6.25% chance): 25B PONY</li>
            <li>3rd place (6.25% chance): 10B PONY</li>
            <li>Loss (81.25% chance): 0 PONY</li>
            <li>Platform takes: 1B PONY (10%)</li>
            <li><strong>Expected return: ~8.4B PONY (84% RTP)</strong></li>
          </ul>
        </section>

        {/* Technical Implementation */}
        <section className="whitepaper-section whitepaper-highlight">
          <h2>5. Technical Implementation</h2>

          <h3>Enhanced Randomness - 10 Entropy Sources</h3>
          <ul>
            <li>block.timestamp</li>
            <li>block.prevrandao</li>
            <li>block.number</li>
            <li>raceId</li>
            <li>horseId</li>
            <li>msg.sender</li>
            <li>tx.gasprice</li>
            <li>totalRaces</li>
            <li>nonce (incremented)</li>
            <li>jackpotPool</li>
          </ul>

          <h3 style={{ margin: '16px 0 8px' }}>Network Deployment</h3>
          <ul>
            <li><strong>Celo</strong> (Chain ID: 42220)</li>
            <li><strong>EVM compatible:</strong> Standard Solidity</li>
            <li><strong>Low gas costs:</strong> Optimized for Celo</li>
            <li><strong>Fast finality:</strong> Quick transaction confirmation</li>
          </ul>
        </section>

        {/* Mainnet Deployment */}
        <section className="whitepaper-section">
          <h2>6. Mainnet Deployment Info</h2>
          <h3>Celo Contracts (LIVE)</h3>

          <div className="contract-box">
            <p><strong>PonyTokenV1 (PONY)</strong></p>
            <p className="contract-address">
              Address: 0x000BE46901ea6f7ac2c1418D158f2f0A80992c07
            </p>
            <p>Status: ✅ Deployed & Verified</p>
            <p>Total Supply: 100,000,000,000,000 PONY (100 Trillion)</p>
          </div>

          <div className="contract-box">
            <p><strong>PixelPonyV2 (Racing Game)</strong></p>
            <p className="contract-address">
              Address: 0x3e9b5F357326a399aff2988eC501E28C9DD9f3b9
            </p>
            <p>Status: ✅ Deployed & Verified</p>
            <p>Game Reserve: 50,000,000,000,000 PONY (50 Trillion)</p>
          </div>

          <div className="contract-box">
            <p><strong>Referral Contract</strong></p>
            <p className="contract-address">
              Address: 0xFF5987F04850c092C2Af855894fBF1679610Df23
            </p>
            <p>Status: ✅ Deployed & Verified</p>
          </div>
        </section>

        {/* Conclusion */}
        <section className="whitepaper-section whitepaper-highlight">
          <h2>Conclusion</h2>
          <p style={{ marginBottom: '12px' }}>
            Pixel Pony V1 represents a straightforward approach to blockchain gaming: instant races, fair odds, transparent tokenomics, and innovative failsafe protection.
          </p>

          <p><strong>Key Highlights:</strong></p>
          <ul>
            <li>✅ Deployed on Celo</li>
            <li>✅ Zero security vulnerabilities</li>
            <li>✅ Verified source code</li>
            <li>✅ Pull-based failsafe (scalable to unlimited players)</li>
            <li>✅ Fair tokenomics</li>
            <li>✅ Gas efficient</li>
            <li>✅ Instant gameplay</li>
          </ul>

          <p style={{ marginTop: '16px', fontStyle: 'italic' }}>
            The future of gaming is instant. The future of tokens is utility-driven. The future of jackpots is fair. Pixel Pony delivers all three.
          </p>
        </section>

        <div className="whitepaper-cta">
          <a href="/game" className="whitepaper-cta-button">
            🎮 PLAY NOW 🎮
          </a>
        </div>

        <div className="whitepaper-version">
          Version 1.0 - January 2025
        </div>
      </div>
    </div>
  )
}
