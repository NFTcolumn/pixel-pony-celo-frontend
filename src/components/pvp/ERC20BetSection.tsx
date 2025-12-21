import React from 'react'
import { formatEther, parseEther } from 'viem'

const BET_AMOUNTS = [
  { label: '100M', value: parseEther('100000000') },
  { label: '500M', value: parseEther('500000000') },
  { label: '1B', value: parseEther('1000000000') },
  { label: '5B', value: parseEther('5000000000') },
  { label: '10B', value: parseEther('10000000000') },
  { label: 'CUSTOM', value: null }
]

interface ERC20BetSectionProps {
  useCustomToken: boolean
  setUseCustomToken: (value: boolean) => void
  customToken: string
  setCustomToken: (value: string) => void
  tokenBalance: bigint | undefined
  getTokenName: () => string
  formatPony: (value: string) => string
  showCustomInput: boolean
  selectedBet: bigint | null
  betInputValue: string
  handleBetSelection: (value: bigint | null) => void
  handleCustomBetInput: (value: string) => void
  handleSetMaxBalance: () => void
}

export function ERC20BetSection({
  useCustomToken,
  setUseCustomToken,
  customToken,
  setCustomToken,
  tokenBalance,
  getTokenName,
  formatPony,
  showCustomInput,
  selectedBet,
  betInputValue,
  handleBetSelection,
  handleCustomBetInput,
  handleSetMaxBalance
}: ERC20BetSectionProps): React.JSX.Element {
  return (
    <>
      {/* Custom Token Option */}
      <div className="input-section">
        <label>
          <input
            type="checkbox"
            checked={useCustomToken}
            onChange={(e) => setUseCustomToken(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Use Custom Token
        </label>
        {useCustomToken && (
          <input
            type="text"
            className="match-input"
            placeholder="Custom token address (0x...)"
            value={customToken}
            onChange={(e) => setCustomToken(e.target.value)}
            style={{ marginTop: '10px' }}
          />
        )}
      </div>

      <div className="bet-section">
        <div className="bet-label">
          SELECT BET AMOUNT ({getTokenName()})
          {tokenBalance !== undefined && tokenBalance !== null && (
            <span style={{ fontSize: '10px', marginLeft: '10px', color: '#666' }}>
              Balance: {formatPony(formatEther(tokenBalance as bigint))} {getTokenName()}
            </span>
          )}
        </div>
        <div className="bet-buttons">
          {BET_AMOUNTS.map((bet, idx) => (
            <button
              key={idx}
              className={`bet-btn ${!showCustomInput && selectedBet === bet.value ? 'active' : ''} ${showCustomInput && bet.value === null ? 'active' : ''}`}
              onClick={() => handleBetSelection(bet.value)}
            >
              {bet.label}
            </button>
          ))}
        </div>

        {/* Custom Bet Input - Inside bet-section */}
        {showCustomInput && (
          <div style={{ marginTop: '10px' }}>
            <input
              type="text"
              className="match-input"
              placeholder={`Enter amount (e.g., 100000000)`}
              value={betInputValue}
              onChange={(e) => handleCustomBetInput(e.target.value)}
              style={{ width: '100%' }}
            />
            {tokenBalance !== undefined && tokenBalance !== null && (
              <button
                className="bet-btn"
                onClick={handleSetMaxBalance}
                style={{ marginTop: '5px', width: '100%', fontSize: '10px' }}
              >
                MAX: {formatPony(formatEther(tokenBalance as bigint))} {getTokenName()}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
