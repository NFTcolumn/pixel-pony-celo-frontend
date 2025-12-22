import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import '../PVP.css'
import PONYPVP_ABI from '../PonyPvPABI.json'
import CreateMatch from '../components/pvp/CreateMatch'
import Lobby from '../components/pvp/Lobby'
import JoinMatch from '../components/pvp/JoinMatch'
import HorseSelection from '../components/pvp/HorseSelection'
import RaceOverlay from '../components/pvp/RaceOverlay'

const PONYPVP_ADDRESS = '0x739331647Fa2dBefe2c7A2E453A26Ee9f4a9965A'

type ViewType = 'menu' | 'create' | 'lobby' | 'join' | 'selection' | 'race'

export default function PVP() {
  const { address, isConnected } = useAccount()
  const [currentView, setCurrentView] = useState<ViewType>('menu')
  const [matchId, setMatchId] = useState('')
  const [raceWinners, setRaceWinners] = useState<number[]>([])
  const [myHorses, setMyHorses] = useState<number[]>([])
  const [showRaceOverlay, setShowRaceOverlay] = useState(false)
  const [activeMatches, setActiveMatches] = useState<any[]>([])
  const [completedMatches, setCompletedMatches] = useState<any[]>([])
  const [timedOutMatches, setTimedOutMatches] = useState<any[]>([])
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [copiedMatchId, setCopiedMatchId] = useState<string | null>(null)

  const { writeContract, data: executeHash } = useWriteContract()
  const { isSuccess: raceExecuted } = useWaitForTransactionReceipt({ hash: executeHash })

  // Read user's matches
  const { data: userMatches, refetch: refetchMatches } = useReadContract({
    address: PONYPVP_ADDRESS,
    abi: PONYPVP_ABI,
    functionName: 'getUserMatches',
    args: address ? [address] : undefined,
    chainId: 42220,
    query: { enabled: !!address }
  })

  // Read match states for all user matches
  const matchContracts = userMatches && Array.isArray(userMatches)
    ? (userMatches as any[]).slice(-10).map((matchId) => ({
      address: PONYPVP_ADDRESS as `0x${string}`,
      abi: PONYPVP_ABI as any,
      functionName: 'getMatch',
      args: [matchId],
      chainId: 42220
    }))
    : []

  const { data: matchesData } = useReadContracts({
    contracts: matchContracts as any,
    query: { enabled: matchContracts.length > 0 }
  })

  // Also read timestamps using 'matches' mapping for pending matches
  const timestampContracts = userMatches && Array.isArray(userMatches)
    ? (userMatches as any[]).slice(-10).map((matchId) => ({
      address: PONYPVP_ADDRESS as `0x${string}`,
      abi: PONYPVP_ABI as any,
      functionName: 'matches',
      args: [matchId],
      chainId: 42220
    }))
    : []

  const { data: timestampData } = useReadContracts({
    contracts: timestampContracts as any,
    query: { enabled: timestampContracts.length > 0 }
  })

  // Separate matches into active, completed, and timed-out
  useEffect(() => {
    if (!userMatches || !Array.isArray(userMatches) || !matchesData || !timestampData) return

    const active: any[] = []
    const completed: any[] = []
    const timedOut: any[] = []
    const recentMatches = (userMatches as any[]).slice(-10)
    const now = Math.floor(Date.now() / 1000)

    matchesData.forEach((match, index) => {
      if (match.status === 'success' && match.result) {
        const matchId = recentMatches[index]
        const state = Number((match.result as any)[5])
        const winners = (match.result as any)[9] as number[]
        const hasWinners = winners && winners.length === 3 && Number(winners[0]) !== 0

        const creator = (match.result as any)[0] as string
        const opponent = (match.result as any)[1] as string

        // Only show matches where the connected wallet actually participated
        const isCreator = address?.toLowerCase() === creator.toLowerCase()
        const isOpponent = address?.toLowerCase() === opponent.toLowerCase()
        const isParticipant = isCreator || isOpponent

        // Skip matches where this wallet didn't participate
        if (!isParticipant) return

        // Get timestamp from parallel read (index 14 in 'matches' mapping)
        const timestampMatch = timestampData[index]
        const createdAt = timestampMatch?.status === 'success' && timestampMatch.result
          ? Number((timestampMatch.result as any)[14])
          : 0

        // Check if timed out (10 minutes = 600 seconds, only for state 0 = Pending)
        const elapsed = now - createdAt
        const isTimedOut = state === 0 && elapsed > 600 && createdAt > 0

        const matchInfo = {
          id: matchId.toString(),
          state,
          data: match.result
        }

        // Match is completed if:
        // 1. State is 5 (Cancelled)
        // 2. OR if winners are set (race was executed - executeRace distributes winnings immediately)
        // Note: State 3 (ReadyToRace) with winners = race is complete!
        if (state === 5 || hasWinners) {
          completed.push(matchInfo)
        } else if (isTimedOut) {
          timedOut.push(matchInfo)
        } else {
          active.push(matchInfo)
        }
      }
    })

    setActiveMatches(active.reverse())
    setCompletedMatches(completed.reverse())
    setTimedOutMatches(timedOut.reverse())
  }, [userMatches, matchesData, timestampData, address])

  // Read match data (if viewing a specific match)
  const { data: matchData, refetch: refetchMatch } = useReadContract({
    address: PONYPVP_ADDRESS,
    abi: PONYPVP_ABI,
    functionName: 'getMatch',
    args: matchId ? [matchId as `0x${string}`] : undefined,
    chainId: 42220,
    query: { enabled: !!matchId }
  })

  // Check URL parameters for match ID on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const matchParam = urlParams.get('match')
    if (matchParam) {
      setMatchId(matchParam)
      setCurrentView('join')
    }
  }, [])

  // Handle race execution result
  useEffect(() => {
    if (!raceExecuted || !executeHash) return

    console.log('Race executed successfully!')
    refetchMatch()

    // Small delay to ensure blockchain state is updated
    setTimeout(() => {
      refetchMatch()
    }, 2000)
  }, [raceExecuted, executeHash, refetchMatch])

  // Watch for match state changes
  useEffect(() => {
    if (!matchData || !address) return

    const state = Number((matchData as any)[5])
    const winners = (matchData as any)[9] as number[]

    // State 3 = ReadyToRace
    const hasWinners = winners && winners.length === 3 && winners[0] !== 0

    // If no winners yet, execute race automatically
    if (state === 3 && !hasWinners && currentView === 'selection' && !executeHash) {
      console.log('All horses selected! Auto-executing race...')
      handleAllHorsesSelected()
    }

    // If winners are set, race is complete (executeRace already distributed winnings)
    if (hasWinners && currentView === 'selection') {
      console.log('Race completed! Winners:', winners)
      setRaceWinners(winners)

      // Get my horses
      const creator = (matchData as any)[0] as string
      const creatorHorses = (matchData as any)[6] as number[]
      const opponentHorses = (matchData as any)[7] as number[]
      const isCreator = address?.toLowerCase() === creator.toLowerCase()

      setMyHorses(isCreator ? creatorHorses : opponentHorses)

      // Show race overlay
      setShowRaceOverlay(true)
      setCurrentView('race')
    }
  }, [matchData, address, currentView, executeHash])

  const handleMatchCreated = (newMatchId: string) => {
    setMatchId(newMatchId)
    setCurrentView('lobby')
  }

  const handleMatchJoined = () => {
    refetchMatch()
    setCurrentView('selection')
  }

  const handleAllHorsesSelected = async () => {
    if (!matchId) return

    try {
      console.log('All horses selected! Executing race...')

      // Execute the race on-chain
      await writeContract({
        address: PONYPVP_ADDRESS,
        abi: PONYPVP_ABI,
        functionName: 'executeRace',
        args: [matchId as `0x${string}`],
        chainId: 42220
      })

      // The race will show after transaction confirms via useEffect above
    } catch (error) {
      console.error('Error executing race:', error)
    }
  }

  const handleCloseRace = () => {
    setShowRaceOverlay(false)
    setCurrentView('menu')
    setMatchId('')
    refetchMatches()
    // Clear URL parameter
    window.history.replaceState({}, '', '/pvp')
  }

  const handleBackToMenu = () => {
    setCurrentView('menu')
    setMatchId('')
    // Clear URL parameter
    window.history.replaceState({}, '', '/pvp')
  }

  if (!isConnected) {
    return (
      <div className="container">
        <div className="status-message">
          Please connect your wallet to play PVP
        </div>
      </div>
    )
  }

  // Show race overlay
  if (currentView === 'race') {
    return (
      <RaceOverlay
        isOpen={showRaceOverlay}
        winners={raceWinners}
        myHorses={myHorses}
        matchId={matchId}
        onClose={handleCloseRace}
      />
    )
  }

  // Show create match
  if (currentView === 'create') {
    return (
      <CreateMatch
        onMatchCreated={handleMatchCreated}
        onBack={handleBackToMenu}
      />
    )
  }

  // Show lobby (waiting for opponent)
  if (currentView === 'lobby') {
    return (
      <Lobby
        matchId={matchId}
        onMatchJoined={handleMatchJoined}
        onBack={handleBackToMenu}
        onCreateAnother={() => setCurrentView('create')}
      />
    )
  }

  // Show join match (for invite links)
  if (currentView === 'join') {
    return (
      <JoinMatch
        matchId={matchId}
        onMatchJoined={handleMatchJoined}
        onBack={handleBackToMenu}
      />
    )
  }

  // Show horse selection
  if (currentView === 'selection') {
    return (
      <HorseSelection
        matchId={matchId}
        onAllHorsesSelected={handleAllHorsesSelected}
        onBack={handleBackToMenu}
      />
    )
  }

  // Main menu
  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <h2 style={{ fontSize: '16px', color: '#000' }}>🎮 PLAYER VS PLAYER</h2>
        <div className="tagline">COMPETE HEAD-TO-HEAD FOR GLORY AND PRIZES</div>
        <div className="wallet-info">
          {address && `${address.slice(0, 6)}...${address.slice(-4)}`}
        </div>
      </div>

      {/* Status Message */}
      <div className="status-message">
        Welcome to PVP! Create a match or join one using an invite link
      </div>

      {/* How to Play */}
      <div className="info-section">
        <h3>HOW TO PLAY PVP</h3>
        <div className="info-list">
          <div className="info-item">
            🎯 <strong>Create a Match:</strong> Choose your bet amount and create a match
          </div>
          <div className="info-item">
            🔗 <strong>Share Invite:</strong> Copy the invite link and send it to your opponent
          </div>
          <div className="info-item">
            ⏰ <strong>10 Minute Timer:</strong> Opponent must join within 10 minutes
          </div>
          <div className="info-item">
            🐴 <strong>Pick Horses:</strong> Pick 4 horses per turn, 2 turns per player (8 total)
          </div>
          <div className="info-item">
            🏁 <strong>Race Time:</strong> Watch the race and see whose horses win!
          </div>
          <div className="info-item">
            🏆 <strong>Winner Takes All:</strong> Most horses in top 3 positions wins the pot
          </div>
        </div>
      </div>

      {/* Main Menu */}
      <div className="pvp-menu" style={{ marginTop: '20px' }}>
        <button
          className="menu-btn"
          onClick={() => setCurrentView('create')}
        >
          🎲 CREATE NEW MATCH
        </button>
      </div>

      {/* Active Matches */}
      {activeMatches.length > 0 && (
        <div className="info-section">
          <h3>🏁 YOUR ACTIVE MATCHES</h3>
          <div className="info-list">
            {activeMatches.map((match: any, idx) => (
              <button
                key={idx}
                className="info-item"
                onClick={() => {
                  setMatchId(match.id)
                  // Route to correct view based on state
                  if (match.state === 0) {
                    setCurrentView('lobby') // Created - waiting for opponent
                  } else if (match.state === 1) {
                    setCurrentView('lobby') // Joined - waiting for first pick
                  } else if (match.state === 2 || match.state === 3) {
                    setCurrentView('selection') // Selecting or ReadyToRace
                  }
                }}
                style={{ cursor: 'pointer', textAlign: 'left' }}
              >
                Match #{match.id.slice(0, 10)}...
                <span style={{ fontSize: '10px', color: '#666', marginLeft: '8px' }}>
                  {match.state === 0 ? '⏳ Waiting' :
                    match.state === 1 ? '🎯 Joined' :
                      match.state === 2 ? '🐴 Selecting' :
                        match.state === 3 ? '🏁 Ready' :
                        '❓ Unknown'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Completed Races */}
      {completedMatches.length > 0 && (
        <div className="info-section" style={{ marginTop: '20px' }}>
          <h3>✅ COMPLETED RACES</h3>
          <div className="info-list">
            {completedMatches.map((match: any, idx) => {
              const winners = (match.data as any)[9] as number[]
              const creator = (match.data as any)[0] as string
              const creatorHorses = (match.data as any)[6] as number[]
              const opponentHorses = (match.data as any)[7] as number[]
              const betAmount = (match.data as any)[3] as bigint
              const isNFT = (match.data as any)[4] as boolean
              const isCreator = address?.toLowerCase() === creator.toLowerCase()
              const myHorses = isCreator ? creatorHorses : opponentHorses

              // Calculate actual winnings based on positions won
              const pot = betAmount * 2n
              const afterFee = pot * 9750n / 10000n // After 2.5% fee

              let myWinnings = 0n

              // Check if winners are properly set (not just [0,0,0])
              const hasValidWinners = winners && winners.length === 3 && Number(winners[0]) !== 0

              // Check each position (convert BigInt winners to numbers for comparison)
              if (hasValidWinners) {
                const winner1 = Number(winners[0])
                const winner2 = Number(winners[1])
                const winner3 = Number(winners[2])

                const firstPlace = myHorses.includes(winner1)
                const secondPlace = myHorses.includes(winner2)
                const thirdPlace = myHorses.includes(winner3)

                if (!isNFT) {
                  if (firstPlace) myWinnings += afterFee * 8000n / 10000n  // 80%
                  if (secondPlace) myWinnings += afterFee * 1750n / 10000n // 17.5%
                  if (thirdPlace) myWinnings += afterFee * 250n / 10000n   // 2.5%
                }
              }

              // Calculate profit/loss
              const myProfit = myWinnings - betAmount
              const didIWin = myProfit > 0n

              console.log('Match:', match.id.slice(0, 10), 'Winnings:', myWinnings, 'Bet:', betAmount, 'Profit:', myProfit)

              // Format the profit/loss for display
              const formatProfit = (profit: bigint) => {
                const isPositive = profit >= 0n
                const absProfit = isPositive ? profit : -profit
                const num = Number(absProfit) / 1e18 // Convert from wei to tokens

                if (num >= 1000000000) {
                  return `${isPositive ? '+' : '-'}${(num / 1000000000).toFixed(1)}B`
                } else if (num >= 1000000) {
                  return `${isPositive ? '+' : '-'}${(num / 1000000).toFixed(1)}M`
                } else if (num >= 1000) {
                  return `${isPositive ? '+' : '-'}${(num / 1000).toFixed(1)}K`
                }
                return `${isPositive ? '+' : '-'}${num.toFixed(2)}`
              }

              return (
                <button
                  key={idx}
                  className="info-item"
                  onClick={() => {
                    setMatchId(match.id)
                    setRaceWinners(Array.from(winners))
                    setMyHorses(Array.from(myHorses))
                    setShowRaceOverlay(true)
                    setCurrentView('race')
                  }}
                  style={{
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: didIWin ? '#f0fdf4' : '#fef2f2',
                    borderColor: didIWin ? '#4ade80' : '#f87171'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span>Match #{match.id.slice(0, 10)}...</span>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: hasValidWinners ? (didIWin ? '#22c55e' : '#f87171') : '#666',
                    }}>
                      {!hasValidWinners ? '⏳ Processing...' : (didIWin ? '🎉 WON ' : '😢 LOST ')}{hasValidWinners ? formatProfit(myProfit) : ''}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Timed Out Matches */}
      {timedOutMatches.length > 0 && (
        <div className="info-section" style={{ marginTop: '20px' }}>
          <h3>⏰ TIMED OUT MATCHES</h3>
          <div className="info-list">
            {timedOutMatches.map((match: any, idx) => {
              const isCopied = copiedMatchId === match.id
              return (
                <button
                  key={idx}
                  className="info-item"
                  onMouseDown={() => {
                    const timer = setTimeout(() => {
                      navigator.clipboard.writeText(match.id)
                      setCopiedMatchId(match.id)
                      setTimeout(() => setCopiedMatchId(null), 2000)
                    }, 2000)
                    setLongPressTimer(timer)
                  }}
                  onMouseUp={() => {
                    if (longPressTimer) {
                      clearTimeout(longPressTimer)
                      setLongPressTimer(null)
                    }
                  }}
                  onMouseLeave={() => {
                    if (longPressTimer) {
                      clearTimeout(longPressTimer)
                      setLongPressTimer(null)
                    }
                  }}
                  onTouchStart={() => {
                    const timer = setTimeout(() => {
                      navigator.clipboard.writeText(match.id)
                      setCopiedMatchId(match.id)
                      setTimeout(() => setCopiedMatchId(null), 2000)
                    }, 2000)
                    setLongPressTimer(timer)
                  }}
                  onTouchEnd={() => {
                    if (longPressTimer) {
                      clearTimeout(longPressTimer)
                      setLongPressTimer(null)
                    }
                  }}
                  onClick={() => {
                    if (!longPressTimer) {
                      window.open(`https://celoscan.io/address/${PONYPVP_ADDRESS}#code`, '_blank')
                    }
                  }}
                  style={{
                    cursor: 'pointer',
                    background: isCopied ? '#dcfce7' : '#fee',
                    border: isCopied ? '2px solid #22c55e' : '2px solid #f87171',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '10px', color: isCopied ? '#166534' : '#991b1b' }}>
                    {isCopied ? '✅ Match ID Copied!' : `Match #${match.id.slice(0, 10)}... - Expired (no opponent joined)`}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
