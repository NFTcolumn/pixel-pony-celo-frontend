import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import '../PVP.css'
import PONYPVP_ABI from '../PonyPvPABI.json'

const PONYPVP_ADDRESS = '0x5377EA69528665c23a0213D49cC79332CF8B8d22'
const PONY_TOKEN_ADDRESS = '0x000BE46901ea6f7ac2c1418D158f2f0A80992c07'

const PONY_TOKEN_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
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

export default function PVP() {
  const { address, isConnected } = useAccount()
  const { writeContract } = useWriteContract()

  const [statusMessage, setStatusMessage] = useState('Player vs Player Racing')
  const [selectedBet, setSelectedBet] = useState<bigint | null>(null)
  const [matchId, setMatchId] = useState('')
  const [currentView, setCurrentView] = useState<'main' | 'match'>('main')
  const [viewingMatchId, setViewingMatchId] = useState<string>('')
  const [selectedHorses, setSelectedHorses] = useState<number[]>([])

  // Token selection
  const [tokenType, setTokenType] = useState<'erc20' | 'nft'>('erc20')
  const [customToken, setCustomToken] = useState('')
  const [useCustomToken, setUseCustomToken] = useState(false)
  const [nftTokenId, setNftTokenId] = useState('')
  const [betInputValue, setBetInputValue] = useState('100000000') // Default 100M

  // Read PONY balance
  const { data: ponyBalanceData } = useReadContract({
    address: PONY_TOKEN_ADDRESS,
    abi: PONY_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: 42220
  })

  // Read custom token balance
  const { data: customTokenBalanceData } = useReadContract({
    address: (useCustomToken && customToken ? customToken : PONY_TOKEN_ADDRESS) as `0x${string}`,
    abi: PONY_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: 42220,
    query: {
      enabled: !!address && (useCustomToken ? !!customToken : true)
    }
  })

  // Read entry fee
  const { data: entryFee } = useReadContract({
    address: PONYPVP_ADDRESS,
    abi: PONYPVP_ABI,
    functionName: 'entryFee',
    chainId: 42220
  })

  // Read user matches
  const { data: userMatches, refetch: refetchMatches } = useReadContract({
    address: PONYPVP_ADDRESS,
    abi: PONYPVP_ABI,
    functionName: 'getUserMatches',
    args: address ? [address] : undefined,
    chainId: 42220
  })

  // Read specific match details
  const { data: matchData, refetch: refetchMatch } = useReadContract({
    address: PONYPVP_ADDRESS,
    abi: PONYPVP_ABI,
    functionName: 'getMatch',
    args: viewingMatchId ? [viewingMatchId as `0x${string}`] : undefined,
    chainId: 42220
  })

  // Get current picker for viewing match
  const { data: currentPicker } = useReadContract({
    address: PONYPVP_ADDRESS,
    abi: PONYPVP_ABI,
    functionName: 'getCurrentPicker',
    args: viewingMatchId ? [viewingMatchId as `0x${string}`] : undefined,
    chainId: 42220
  })

  const ponyBalance = ponyBalanceData ? formatPony(formatEther(ponyBalanceData)) : '0'

  // Get max bet based on user's wallet balance
  const getMaxBet = () => {
    const balanceData = useCustomToken ? customTokenBalanceData : ponyBalanceData
    if (!balanceData || balanceData === BigInt(0)) {
      return '1000000' // Minimum if no balance
    }
    // Return the user's actual token balance in wei as string
    return balanceData.toString()
  }

  // Get formatted max bet for display
  const getMaxBetFormatted = () => {
    const maxBet = getMaxBet()
    try {
      return formatPony(formatEther(BigInt(maxBet)))
    } catch {
      return '0'
    }
  }

  const getTokenAddress = () => {
    return useCustomToken && customToken ? customToken : PONY_TOKEN_ADDRESS
  }

  // Handle input change
  const handleBetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setBetInputValue(value)
      if (value !== '') {
        setSelectedBet(parseEther(value))
      }
    }
  }

  // Handle increment button click
  const handleIncrementBet = (increment: string) => {
    const currentValue = betInputValue === '' ? '0' : betInputValue
    const newValue = (BigInt(currentValue) + BigInt(increment)).toString()

    // Check if new value exceeds max bet
    const maxBet = getMaxBet()
    if (BigInt(newValue) > BigInt(maxBet)) {
      setBetInputValue(maxBet)
      setSelectedBet(parseEther(maxBet))
    } else {
      setBetInputValue(newValue)
      setSelectedBet(parseEther(newValue))
    }
  }

  const handleApprove = async () => {
    if (tokenType === 'nft') {
      setStatusMessage('NFT approval: Use your wallet to approve the NFT directly, then create match')
      return
    }
    if (!selectedBet) return
    try {
      const tokenAddress = getTokenAddress()
      setStatusMessage('Approving tokens...')
      await writeContract({
        address: tokenAddress as `0x${string}`,
        abi: PONY_TOKEN_ABI,
        functionName: 'approve',
        args: [PONYPVP_ADDRESS, selectedBet],
        chainId: 42220
      })
      setStatusMessage('Approved! Now create your match.')
    } catch (error) {
      setStatusMessage('Approval failed')
    }
  }

  const handleCreateMatch = async () => {
    if (!entryFee) return

    // Validation
    if (tokenType === 'erc20' && !selectedBet) {
      setStatusMessage('Please select a bet amount for ERC20')
      return
    }
    if (tokenType === 'nft' && !nftTokenId) {
      setStatusMessage('Please enter NFT token ID')
      return
    }
    if (useCustomToken && !customToken) {
      setStatusMessage('Please enter custom token address')
      return
    }

    try {
      setStatusMessage('Creating match...')
      const tokenAddress = getTokenAddress()
      const isNFT = tokenType === 'nft'
      const betAmount = isNFT ? BigInt(0) : selectedBet!
      const tokenId = isNFT ? BigInt(nftTokenId) : BigInt(0)

      await writeContract({
        address: PONYPVP_ADDRESS,
        abi: PONYPVP_ABI,
        functionName: 'createMatch',
        args: [tokenAddress, betAmount, isNFT, tokenId],
        value: entryFee as bigint,
        chainId: 42220
      })
      setStatusMessage('Match created! Check "My Matches" below.')
      // Refetch matches
      refetchMatches()
    } catch (error) {
      setStatusMessage('Failed to create match')
    }
  }

  // Helper functions
  const formatMatchState = (state: number) => {
    const states = ['Waiting for Opponent', 'Selecting Horses', 'Ready to Race', 'Completed', 'Cancelled']
    return states[state] || 'Unknown'
  }

  const getAvailableHorses = () => {
    if (!matchData) return Array.from({length: 16}, (_, i) => i)
    const creatorHorses = (matchData as any)[6] || []
    const opponentHorses = (matchData as any)[7] || []
    const takenHorses = [...creatorHorses, ...opponentHorses].map((h: any) => Number(h))
    return Array.from({length: 16}, (_, i) => i).filter(h => !takenHorses.includes(h))
  }

  const toggleHorseSelection = (horseId: number) => {
    if (selectedHorses.includes(horseId)) {
      setSelectedHorses(selectedHorses.filter(h => h !== horseId))
    } else if (selectedHorses.length < 4) {
      setSelectedHorses([...selectedHorses, horseId])
    }
  }

  const handleJoinMatch = async () => {
    if (!matchId || !entryFee) return
    try {
      setStatusMessage('Joining match...')
      // matchId is already a bytes32 hex string
      await writeContract({
        address: PONYPVP_ADDRESS,
        abi: PONYPVP_ABI,
        functionName: 'joinMatch',
        args: [matchId as `0x${string}`],
        value: entryFee as bigint,
        chainId: 42220
      })
      setStatusMessage('Joined match!')
      // Refetch matches after joining
      refetchMatches()
    } catch (error) {
      setStatusMessage('Failed to join match')
    }
  }

  const handleSelectHorses = async () => {
    if (!viewingMatchId || selectedHorses.length !== 4) {
      setStatusMessage('Please select exactly 4 horses')
      return
    }
    try {
      setStatusMessage('Selecting horses...')
      // Convert number array to uint8 array
      const horseIds = selectedHorses.map(h => h)
      await writeContract({
        address: PONYPVP_ADDRESS,
        abi: PONYPVP_ABI,
        functionName: 'selectHorses',
        args: [viewingMatchId as `0x${string}`, horseIds],
        chainId: 42220
      })
      setStatusMessage('Horses selected!')
      setSelectedHorses([])
      // Refetch match data
      refetchMatch()
    } catch (error) {
      setStatusMessage('Failed to select horses')
    }
  }

  const handleExecuteRace = async () => {
    if (!viewingMatchId) return
    try {
      setStatusMessage('Executing race...')
      await writeContract({
        address: PONYPVP_ADDRESS,
        abi: PONYPVP_ABI,
        functionName: 'executeRace',
        args: [viewingMatchId as `0x${string}`],
        chainId: 42220
      })
      setStatusMessage('Race completed! Winners have been paid automatically.')
      // Refetch match data
      refetchMatch()
    } catch (error) {
      setStatusMessage('Failed to execute race')
    }
  }

  const handleViewMatch = (matchId: string) => {
    setViewingMatchId(matchId)
    setCurrentView('match')
  }

  if (!isConnected) {
    return (
      <div className="container">
        <section>
          <h2>Connect Your Wallet</h2>
          <p style={{ textAlign: 'center', fontSize: '10px', padding: '20px' }}>
            Please connect your wallet to play PVP
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <img src="/logo.png" alt="Pixel Ponies Logo" />
        <div className="tagline">PLAYER VS PLAYER RACING</div>
        <div className="wallet-info">
          {address && `${address.slice(0, 6)}...${address.slice(-4)} | ${ponyBalance} PONY`}
        </div>
      </div>

      <div className="status-message">{statusMessage}</div>

      <div className="info-section">
        <h3>How PVP Works</h3>
        <div className="info-list">
          <div className="info-item">1. Create a match or join with a match ID</div>
          <div className="info-item">2. Each player picks 8 horses (4-4-4-4 phases)</div>
          <div className="info-item">3. All 16 horses race</div>
          <div className="info-item">4. Winners: 80% / 17.5% / 2.5% (ERC20) or Winner Takes All (NFT)</div>
          <div className="info-item">5. UNLIMITED BETS: Bet any amount up to your wallet balance!</div>
          <div className="info-item">Entry Fee: {entryFee ? formatEther(entryFee as bigint) : '0.001'} CELO per player</div>
        </div>
      </div>

      <div className="bet-section">
        <div className="bet-label">TOKEN TYPE</div>
        <div className="bet-buttons">
          <button
            className={`bet-btn ${tokenType === 'erc20' ? 'active' : ''}`}
            onClick={() => setTokenType('erc20')}
          >
            ERC20
          </button>
          <button
            className={`bet-btn ${tokenType === 'nft' ? 'active' : ''}`}
            onClick={() => setTokenType('nft')}
          >
            NFT
          </button>
        </div>
      </div>

      <div className="bet-section">
        <div className="bet-label">TOKEN ADDRESS</div>
        <div style={{ marginBottom: '10px' }}>
          <button
            className={`bet-btn ${!useCustomToken ? 'active' : ''}`}
            onClick={() => setUseCustomToken(false)}
            style={{ width: '100%', marginBottom: '5px' }}
          >
            Use PONY Token (Default)
          </button>
          <button
            className={`bet-btn ${useCustomToken ? 'active' : ''}`}
            onClick={() => setUseCustomToken(true)}
            style={{ width: '100%' }}
          >
            Use Custom Token
          </button>
        </div>
        {useCustomToken && (
          <input
            type="text"
            value={customToken}
            onChange={(e) => setCustomToken(e.target.value)}
            placeholder="Enter token contract address"
            className="match-input"
          />
        )}
      </div>

      {tokenType === 'nft' && (
        <div className="input-section">
          <label>NFT TOKEN ID (1:1 Matching)</label>
          <p style={{ fontSize: '8px', color: '#666', marginBottom: '8px', textAlign: 'center' }}>
            Both players bet 1 NFT from the same collection. Winner takes both NFTs.
          </p>
          <input
            type="text"
            value={nftTokenId}
            onChange={(e) => setNftTokenId(e.target.value)}
            placeholder="Enter your NFT token ID"
            className="match-input"
          />
        </div>
      )}

      {tokenType === 'erc20' ? (
        <>
          <div className="bet-section">
            <div className="bet-label">BET AMOUNT (in tokens)</div>
            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <input
                  type="text"
                  value={betInputValue}
                  onChange={handleBetInputChange}
                  placeholder="Enter bet amount"
                  className="match-input"
                  style={{ flex: 1, textAlign: 'center' }}
                />
                <div style={{ fontSize: '10px', color: '#666', minWidth: '80px', textAlign: 'right' }}>
                  {formatPony(betInputValue)} tokens
                </div>
              </div>

              {/* Increment Buttons - Row 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
                <button
                  className="bet-btn"
                  onClick={() => handleIncrementBet('1000')}
                  style={{ padding: '10px', fontSize: '11px' }}
                >
                  +1K
                </button>
                <button
                  className="bet-btn"
                  onClick={() => handleIncrementBet('10000')}
                  style={{ padding: '10px', fontSize: '11px' }}
                >
                  +10K
                </button>
                <button
                  className="bet-btn"
                  onClick={() => handleIncrementBet('100000')}
                  style={{ padding: '10px', fontSize: '11px' }}
                >
                  +100K
                </button>
              </div>

              {/* Increment Buttons - Row 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
                <button
                  className="bet-btn"
                  onClick={() => handleIncrementBet('1000000')}
                  style={{ padding: '10px', fontSize: '11px' }}
                >
                  +1M
                </button>
                <button
                  className="bet-btn"
                  onClick={() => handleIncrementBet('10000000')}
                  style={{ padding: '10px', fontSize: '11px' }}
                >
                  +10M
                </button>
                <button
                  className="bet-btn"
                  onClick={() => handleIncrementBet('100000000')}
                  style={{ padding: '10px', fontSize: '11px' }}
                >
                  +100M
                </button>
              </div>

              {/* Increment Buttons - Row 3 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
                <button
                  className="bet-btn"
                  onClick={() => handleIncrementBet('1000000000')}
                  style={{ padding: '10px', fontSize: '11px' }}
                >
                  +1B
                </button>
                <button
                  className="bet-btn"
                  onClick={() => handleIncrementBet('10000000000')}
                  style={{ padding: '10px', fontSize: '11px' }}
                >
                  +10B
                </button>
                <button
                  className="bet-btn"
                  onClick={() => handleIncrementBet('100000000000')}
                  style={{ padding: '10px', fontSize: '11px' }}
                >
                  +100B
                </button>
              </div>

              <div style={{ fontSize: '8px', color: '#666', textAlign: 'center', marginTop: '8px' }}>
                Max Balance: {getMaxBetFormatted()}
              </div>
            </div>
          </div>

          <button className="race-btn" onClick={handleApprove} disabled={!selectedBet}>
            STEP 1: APPROVE {useCustomToken ? 'TOKEN' : 'PONY'}
          </button>

          <button className="race-btn" onClick={handleCreateMatch}>
            STEP 2: CREATE MATCH
          </button>
        </>
      ) : (
        <button className="race-btn" onClick={handleCreateMatch}>
          CREATE NFT MATCH
        </button>
      )}

      <div className="input-section">
        <label>OR JOIN A MATCH</label>
        <input
          type="text"
          value={matchId}
          onChange={(e) => setMatchId(e.target.value)}
          placeholder="Enter match ID"
          className="match-input"
        />
      </div>

      <button className="race-btn" onClick={handleJoinMatch} disabled={!matchId}>
        JOIN MATCH
      </button>

      {/* My Matches Section */}
      {currentView === 'main' && userMatches && Array.isArray(userMatches) && userMatches.length > 0 ? (
        <div className="bet-section">
          <div className="bet-label">MY MATCHES ({userMatches.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(userMatches as string[]).map((mid: string) => (
              <button
                key={mid}
                onClick={() => handleViewMatch(mid)}
                className="race-btn"
                style={{ fontSize: '10px' }}
              >
                View Match: {mid.slice(0, 10)}...{mid.slice(-6)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Match Viewing Interface */}
      {currentView === 'match' && matchData ? (
        <>
          <button
            className="back-btn"
            onClick={() => {
              setCurrentView('main')
              setViewingMatchId('')
              setSelectedHorses([])
            }}
          >
            ← BACK TO MAIN
          </button>

          <div className="match-info">
            <h3 style={{ fontSize: '12px', marginBottom: '15px', textAlign: 'center' }}>Match Details</h3>
            <div className="info-row">
              <span>Match ID:</span>
              <span style={{ fontSize: '8px' }}>{viewingMatchId.slice(0, 10)}...{viewingMatchId.slice(-6)}</span>
            </div>
            <div className="info-row">
              <span>State:</span>
              <span>{formatMatchState(Number((matchData as any)[5]))}</span>
            </div>
            <div className="info-row">
              <span>Creator:</span>
              <span style={{ fontSize: '8px' }}>{String((matchData as any)[0]).slice(0, 6)}...{String((matchData as any)[0]).slice(-4)}</span>
            </div>
            {(matchData as any)[1] !== '0x0000000000000000000000000000000000000000' && (
              <div className="info-row">
                <span>Opponent:</span>
                <span style={{ fontSize: '8px' }}>{String((matchData as any)[1]).slice(0, 6)}...{String((matchData as any)[1]).slice(-4)}</span>
              </div>
            )}
            <div className="info-row">
              <span>Bet Amount:</span>
              <span>{(matchData as any)[4] ? formatPony(formatEther((matchData as any)[3])) : '0'} tokens</span>
            </div>
            {Number((matchData as any)[5]) === 1 && currentPicker ? (
              <div className="info-row">
                <span>Current Turn:</span>
                <span style={{ fontSize: '8px', color: currentPicker === address ? '#4ade80' : '#ff6b6b' }}>
                  {currentPicker === address ? 'YOUR TURN' : 'OPPONENT'}
                </span>
              </div>
            ) : null}
          </div>

          {/* Horse Selection Interface - only show if state is Active (1) */}
          {Number((matchData as any)[5]) === 1 && currentPicker === address && (
            <>
              <div className="selection-info">
                SELECT 4 HORSES ({selectedHorses.length}/4 selected)
              </div>

              <div className="horse-grid">
                {getAvailableHorses().map(horseId => (
                  <div
                    key={horseId}
                    className={`horse-card ${selectedHorses.includes(horseId) ? 'selected' : ''}`}
                    onClick={() => toggleHorseSelection(horseId)}
                  >
                    <div className="horse-sprite">
                      <img
                        src={`/horses/horse${horseId}.png`}
                        alt={`Horse ${horseId}`}
                        style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
                      />
                    </div>
                    <div className="horse-number">#{horseId}</div>
                  </div>
                ))}
              </div>

              <button
                className="race-btn"
                onClick={handleSelectHorses}
                disabled={selectedHorses.length !== 4}
              >
                CONFIRM HORSE SELECTION ({selectedHorses.length}/4)
              </button>
            </>
          )}

          {/* Show selected horses for both players */}
          {(((matchData as any)[6]?.length > 0) || ((matchData as any)[7]?.length > 0)) && (
            <div className="bet-section">
              <div className="bet-label">SELECTED HORSES</div>
              {(matchData as any)[6]?.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '9px', marginBottom: '5px', color: '#4ade80' }}>Creator's Horses:</div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {(matchData as any)[6].map((h: any) => (
                      <span key={Number(h)} style={{ fontSize: '10px', padding: '5px 10px', background: '#f0fdf4', borderRadius: '5px', border: '1px solid #4ade80' }}>
                        #{Number(h)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(matchData as any)[7]?.length > 0 && (
                <div>
                  <div style={{ fontSize: '9px', marginBottom: '5px', color: '#f87171' }}>Opponent's Horses:</div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {(matchData as any)[7].map((h: any) => (
                      <span key={Number(h)} style={{ fontSize: '10px', padding: '5px 10px', background: '#fef2f2', borderRadius: '5px', border: '1px solid #f87171' }}>
                        #{Number(h)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Execute Race Button - only show if state is ReadyToRace (2) */}
          {Number((matchData as any)[5]) === 2 && (
            <button className="race-btn" onClick={handleExecuteRace}>
              EXECUTE RACE 🏁
            </button>
          )}

          {/* Race Results - only show if state is Completed (3) */}
          {Number((matchData as any)[5]) === 3 && (matchData as any)[9] && (
            <div className="results-section">
              <h3>RACE RESULTS</h3>
              <div className="winners-list">
                <div className="winner-item">
                  <span>🥇 1st Place:</span>
                  <span>Horse #{Number((matchData as any)[9][0])}</span>
                </div>
                <div className="winner-item">
                  <span>🥈 2nd Place:</span>
                  <span>Horse #{Number((matchData as any)[9][1])}</span>
                </div>
                <div className="winner-item">
                  <span>🥉 3rd Place:</span>
                  <span>Horse #{Number((matchData as any)[9][2])}</span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
