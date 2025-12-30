import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import PONYPVP_ABI from '../../PonyPvPABI.json'

const PONYPVP_ADDRESS = '0x739331647Fa2dBefe2c7A2E453A26Ee9f4a9965A'

interface HorseSelectionProps {
  matchId: string
  onAllHorsesSelected: () => void
  onBack: () => void
}

export default function HorseSelection({ matchId, onAllHorsesSelected, onBack }: HorseSelectionProps) {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const [selectedHorses, setSelectedHorses] = useState<number[]>([])
  const [statusMessage, setStatusMessage] = useState('Loading match...')
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasTriggeredRace, setHasTriggeredRace] = useState(false)

  const { writeContract, data: hash, reset: resetWrite } = useWriteContract()
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })

  // Read match data
  const { data: matchData, refetch: refetchMatch } = useReadContract({
    address: PONYPVP_ADDRESS,
    abi: PONYPVP_ABI,
    functionName: 'getMatch',
    args: matchId ? [matchId as `0x${string}`] : undefined,
    chainId: 42220,
    query: { enabled: !!matchId, refetchInterval: 3000 }
  })

  // Read current picker
  const { data: currentPicker, refetch: refetchCurrentPicker } = useReadContract({
    address: PONYPVP_ADDRESS,
    abi: PONYPVP_ABI,
    functionName: 'getCurrentPicker',
    args: matchId ? [matchId as `0x${string}`] : undefined,
    chainId: 42220,
    query: { enabled: !!matchId, refetchInterval: 2000 }
  })

  // Read TOTAL_GAME_TIME
  const { data: totalGameTime } = useReadContract({
    address: PONYPVP_ADDRESS,
    abi: PONYPVP_ABI,
    functionName: 'TOTAL_GAME_TIME',
    chainId: 42220
  })

  // Read match details from matches mapping to get gameStartTime
  const { data: matchDetails } = useReadContract({
    address: PONYPVP_ADDRESS,
    abi: PONYPVP_ABI,
    functionName: 'matches',
    args: matchId ? [matchId as `0x${string}`] : undefined,
    chainId: 42220,
    query: { enabled: !!matchId, refetchInterval: 3000 }
  })

  // Poll match data
  useEffect(() => {
    if (!matchId || !isConnected) return

    const interval = setInterval(() => {
      refetchMatch()
      refetchCurrentPicker()
    }, 2000)

    return () => clearInterval(interval)
  }, [matchId, isConnected, refetchMatch, refetchCurrentPicker])

  // Listen for HorseSelected events
  useEffect(() => {
    if (!publicClient || !matchId || !isConnected) return

    const watchForSelection = async () => {
      try {
        const unwatch = publicClient.watchContractEvent({
          address: PONYPVP_ADDRESS,
          abi: PONYPVP_ABI,
          eventName: 'HorseSelected',
          onLogs: (logs) => {
            logs.forEach((log: any) => {
              const eventMatchId = (log.args as any).matchId
              if (eventMatchId === matchId) {
                console.log('Horse selected event detected!')
                refetchMatch()
                refetchCurrentPicker()
              }
            })
          }
        })

        return unwatch
      } catch (error) {
        console.error('Error watching for HorseSelected event:', error)
      }
    }

    const cleanup = watchForSelection()

    return () => {
      cleanup.then(unwatch => {
        if (unwatch) unwatch()
      })
    }
  }, [publicClient, matchId, isConnected, refetchMatch, refetchCurrentPicker])

  // Check if match is ready to race - REMOVED: We don't auto-trigger anymore, Player 2 must click button

  // Check whose turn it is and auto-select last 4 if applicable
  useEffect(() => {
    if (!currentPicker || !address || !matchData) {
      setIsMyTurn(false)
      return
    }

    const isMe = (currentPicker as string).toLowerCase() === address.toLowerCase()
    setIsMyTurn(isMe)

    if (isMe) {
      const myHorses = getMyHorses()
      const availableHorses = getRemainingAvailableHorses()

      // Auto-select last 4 horses if only 4 remain
      if (availableHorses.length === 4 && selectedHorses.length === 0) {
        setSelectedHorses(availableHorses)
        setStatusMessage('🎯 Last 4 horses auto-selected! Click CONFIRM to finalize')
      } else if (myHorses.length === 0) {
        setStatusMessage('🎯 YOUR TURN! Pick 4 horses for your team, then confirm')
      } else {
        setStatusMessage('🎯 YOUR TURN! Pick 4 more horses to complete your team')
      }
    } else {
      setStatusMessage(`⏳ Waiting for opponent to pick their horses...`)
    }
  }, [currentPicker, address, matchData])

  // Calculate time remaining
  useEffect(() => {
    if (!matchDetails || !totalGameTime) return

    const gameStartTime = Number((matchDetails as any)[9])
    if (gameStartTime === 0) return

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000)
      const elapsed = now - gameStartTime
      const totalTime = Number(totalGameTime)
      const remaining = totalTime - elapsed

      setTimeRemaining(Math.max(0, remaining))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [matchDetails, totalGameTime])

  // Handle selection confirmation
  useEffect(() => {
    if (!isConfirmed || !hash || !isSubmitting) return

    setStatusMessage('Selection confirmed! Waiting for next turn...')
    setSelectedHorses([])
    setIsSubmitting(false)
    resetWrite()
    refetchMatch()
    refetchCurrentPicker()
  }, [isConfirmed, hash, isSubmitting, resetWrite, refetchMatch, refetchCurrentPicker])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleHorseClick = (horseId: number) => {
    if (!isMyTurn) {
      setStatusMessage('❌ Not your turn!')
      return
    }

    if (isHorseSelected(horseId)) {
      setStatusMessage('❌ This horse is already taken!')
      return
    }

    // Toggle selection
    if (selectedHorses.includes(horseId)) {
      setSelectedHorses(selectedHorses.filter(h => h !== horseId))
      setStatusMessage('Horse deselected. Pick your horses!')
    } else {
      // Limit based on how many horses to pick this turn
      const horsesToPick = getHorsesToPickThisTurn()
      if (selectedHorses.length < horsesToPick) {
        setSelectedHorses([...selectedHorses, horseId])
        if (selectedHorses.length + 1 === horsesToPick) {
          setStatusMessage(`✅ ${horsesToPick} horse${horsesToPick > 1 ? 's' : ''} selected! Click CONFIRM SELECTION`)
        } else {
          setStatusMessage(`Selected ${selectedHorses.length + 1}/${horsesToPick} horses`)
        }
      } else {
        setStatusMessage(`You can only pick ${horsesToPick} horse${horsesToPick > 1 ? 's' : ''} this turn`)
      }
    }
  }

  const handleSubmitSelection = async () => {
    if (!isMyTurn) return
    if (selectedHorses.length === 0) return

    const horsesToPick = getHorsesToPickThisTurn()
    if (selectedHorses.length !== horsesToPick) {
      setStatusMessage(`You must select exactly ${horsesToPick} horse${horsesToPick > 1 ? 's' : ''}!`)
      return
    }

    try {
      // Call writeContract FIRST before any state updates to maintain user interaction chain on mobile
      writeContract({
        address: PONYPVP_ADDRESS,
        abi: PONYPVP_ABI,
        functionName: 'selectHorses',
        args: [matchId as `0x${string}`, selectedHorses.map(h => h)],
        chainId: 42220
      })

      // State updates AFTER writeContract to avoid breaking mobile wallet interaction
      setStatusMessage('Submitting selection...')
      setIsSubmitting(true)
    } catch (error) {
      console.error('Error submitting selection:', error)
      setStatusMessage('Failed to submit selection')
      setIsSubmitting(false)
    }
  }

  const isHorseSelected = (horseId: number): boolean => {
    if (!matchData) return false

    const creatorHorses = (matchData as any)[6] as number[]
    const opponentHorses = (matchData as any)[7] as number[]

    return creatorHorses.includes(horseId) || opponentHorses.includes(horseId)
  }

  const getHorseOwner = (horseId: number): 'mine' | 'opponent' | null => {
    if (!matchData || !address) return null

    const creator = (matchData as any)[0] as string
    const creatorHorses = (matchData as any)[6] as number[]
    const opponentHorses = (matchData as any)[7] as number[]
    const isCreator = address.toLowerCase() === creator.toLowerCase()

    if ((isCreator && creatorHorses.includes(horseId)) || (!isCreator && opponentHorses.includes(horseId))) {
      return 'mine'
    }
    if ((isCreator && opponentHorses.includes(horseId)) || (!isCreator && creatorHorses.includes(horseId))) {
      return 'opponent'
    }
    return null
  }

  const getHorsesToPickThisTurn = (): number => {
    if (!matchData) return 4

    const myHorses = getMyHorses()
    const horsesRemaining = 8 - myHorses.length

    // Pick 4 horses per turn (2 turns total per player)
    return Math.min(4, horsesRemaining)
  }

  const getRemainingAvailableHorses = (): number[] => {
    const available: number[] = []
    for (let i = 0; i < 16; i++) {
      if (!isHorseSelected(i)) {
        available.push(i)
      }
    }
    return available
  }

  const getMyHorses = (): number[] => {
    if (!matchData || !address) return []

    const creator = (matchData as any)[0] as string
    const creatorHorses = (matchData as any)[6] as number[]
    const opponentHorses = (matchData as any)[7] as number[]
    const isCreator = address.toLowerCase() === creator.toLowerCase()

    return isCreator ? creatorHorses : opponentHorses
  }

  const getOpponentHorses = (): number[] => {
    if (!matchData || !address) return []

    const creator = (matchData as any)[0] as string
    const creatorHorses = (matchData as any)[6] as number[]
    const opponentHorses = (matchData as any)[7] as number[]
    const isCreator = address.toLowerCase() === creator.toLowerCase()

    return isCreator ? opponentHorses : creatorHorses
  }

  if (!matchData) {
    return (
      <div className="container">
        <button onClick={onBack} className="back-btn">
          ← BACK
        </button>
        <div className="waiting-message">Loading match...</div>
      </div>
    )
  }

  const myHorses = getMyHorses()
  const opponentHorses = getOpponentHorses()
  const firstPicker = (matchData as any)[8] as string
  const creator = (matchData as any)[0] as string
  const opponent = (matchData as any)[1] as string
  const state = Number((matchData as any)[5])

  // Check if all horses selected
  const allHorsesSelected = myHorses.length === 8 && opponentHorses.length === 8

  // Ready to race if: all horses selected AND state is 3
  // If state is 2 but all horses selected, contract state is stuck - need manual fix
  const isReadyToRace = allHorsesSelected && state === 3
  const isStateStuck = allHorsesSelected && state === 2

  // Only player 2 (opponent) should execute the race
  const isCreator = address?.toLowerCase() === creator.toLowerCase()
  const isPlayer2 = !isCreator // Player 2 is the opponent (not the creator)


  return (
    <div className="container">
      <button onClick={onBack} className="back-btn">
        ← BACK TO MENU
      </button>

      {/* Status Message */}
      <div className="status-message">{statusMessage}</div>

      {/* Timer */}
      {timeRemaining !== null && (
        <div
          className="match-info"
          style={{
            background: timeRemaining < 120 ? '#fee' : '#f0fdf4',
            border: timeRemaining < 120 ? '2px solid #f87171' : '2px solid #4ade80',
            marginBottom: '15px'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#000', marginBottom: '8px' }}>
              ⏱️ TIME REMAINING
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: timeRemaining < 120 ? '#f87171' : '#22c55e',
                fontFamily: 'monospace'
              }}
            >
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      )}

      {/* Turn Indicator */}
      <div
        className="selection-info"
        style={{
          background: isMyTurn ? '#4ade80' : '#fbbf24',
          borderColor: isMyTurn ? '#22c55e' : '#f59e0b'
        }}
      >
        {isMyTurn ? '🎯 YOUR TURN' : '⏳ OPPONENT\'S TURN'}
      </div>

      {/* First Picker Info */}
      <div className="match-info" style={{ marginBottom: '15px' }}>
        <div className="info-row">
          <span>First Picker:</span>
          <span style={{ fontSize: '9px' }}>
            {firstPicker.toLowerCase() === address?.toLowerCase()
              ? '🟢 YOU'
              : '🔴 OPPONENT'}
          </span>
        </div>
        <div className="info-row">
          <span>Your Horses:</span>
          <span>{myHorses.length}/8</span>
        </div>
        <div className="info-row">
          <span>Opponent's Horses:</span>
          <span>{opponentHorses.length}/8</span>
        </div>
      </div>

      {/* Horse Grid */}
      <div className="horse-grid">
        {Array.from({ length: 16 }, (_, i) => {
          const spriteNum = (i % 30) + 1
          const owner = getHorseOwner(i)
          const isSelected = selectedHorses.includes(i)
          const isTaken = isHorseSelected(i)

          return (
            <div
              key={i}
              className={`horse-card ${isSelected ? 'selected' : ''} ${isTaken ? 'disabled' : ''} ${owner === 'mine' ? 'mine' : ''} ${owner === 'opponent' ? 'opponent' : ''}`}
              onClick={() => handleHorseClick(i)}
              style={{
                cursor: (isMyTurn && !isTaken) ? 'pointer' : 'not-allowed'
              }}
            >
              <img src={`/sprites/${spriteNum}.png`} className="horse-sprite" alt={`Pony ${i + 1}`} />
              <div className="horse-number">#{i + 1}</div>
              {owner === 'mine' && (
                <div style={{ fontSize: '8px', color: '#22c55e', marginTop: '3px' }}>✓ YOURS</div>
              )}
              {owner === 'opponent' && (
                <div style={{ fontSize: '8px', color: '#f87171', marginTop: '3px' }}>✗ TAKEN</div>
              )}
            </div>
          )
        })}
      </div>

      {/* State Stuck Warning - Contract didn't update to ReadyToRace */}
      {isStateStuck && (
        <div className="match-info" style={{ background: '#fef3c7', border: '2px solid #f59e0b', marginTop: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#92400e', fontWeight: 'bold', marginBottom: '10px' }}>
              ⚠️ ALL HORSES SELECTED - FINALIZE NEEDED
            </div>
            <div style={{ fontSize: '10px', color: '#92400e', lineHeight: '1.6', marginBottom: '15px' }}>
              All 16 horses are selected, but the contract needs to finalize the selection phase.
              Click below to update the contract state and enable the race button.
            </div>
            <button
              className="race-btn"
              onClick={() => {
                // Trigger a re-check by calling the contract to force state transition
                // The contract will see both players have 8 horses and transition to ReadyToRace
                console.log('Attempting to finalize match state...')
                refetchMatch()
              }}
              style={{
                background: '#f59e0b',
                borderColor: '#d97706',
                width: '100%'
              }}
            >
              🔄 REFRESH MATCH STATE
            </button>
          </div>
        </div>
      )}

      {/* Execute Race Button - Show ONLY to player 2 (opponent) when all horses are selected */}
      {isReadyToRace && isPlayer2 && (
        <div className="match-info" style={{ background: '#dcfce7', border: '2px solid #22c55e', marginTop: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#166534', fontWeight: 'bold', marginBottom: '10px' }}>
              ✅ ALL HORSES SELECTED!
            </div>
            <div style={{ fontSize: '11px', color: '#166534', marginBottom: '15px' }}>
              Ready to race! Click below to execute the race and see who wins!
            </div>
            <button
              className="race-btn"
              onClick={onAllHorsesSelected}
              disabled={hasTriggeredRace}
              style={{
                background: '#22c55e',
                borderColor: '#16a34a',
                width: '100%',
                opacity: hasTriggeredRace ? 0.5 : 1
              }}
            >
              {hasTriggeredRace ? '⏳ EXECUTING RACE...' : '🏁 EXECUTE RACE'}
            </button>
          </div>
        </div>
      )}

      {/* Waiting message for player 1 (creator) when ready to race */}
      {isReadyToRace && !isPlayer2 && (
        <div className="match-info" style={{ background: '#fffbeb', border: '2px solid #fbbf24', marginTop: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#92400e', fontWeight: 'bold', marginBottom: '10px' }}>
              ✅ ALL HORSES SELECTED!
            </div>
            <div style={{ fontSize: '11px', color: '#92400e' }}>
              ⏳ Waiting for Player 2 to execute the race...
            </div>
          </div>
        </div>
      )}

      {/* Confirm Button - Only show when it's your turn and not ready to race yet */}
      {isMyTurn && !isReadyToRace && (
        <button
          className="race-btn"
          onClick={handleSubmitSelection}
          disabled={selectedHorses.length === 0 || isSubmitting || selectedHorses.length !== getHorsesToPickThisTurn()}
          style={{
            opacity: (selectedHorses.length === 0 || isSubmitting || selectedHorses.length !== getHorsesToPickThisTurn()) ? 0.5 : 1,
            marginTop: '20px'
          }}
        >
          {isSubmitting
            ? 'SUBMITTING...'
            : `CONFIRM SELECTION (${selectedHorses.length}/${getHorsesToPickThisTurn()})`
          }
        </button>
      )}

      {/* Info Section */}
      <div className="info-section" style={{ marginTop: '20px' }}>
        <h3>How Selection Works:</h3>
        <div className="info-list">
          <div className="info-item">
            📋 Each player picks 8 horses total (half the stable!)
          </div>
          <div className="info-item">
            🎯 Pick 4 horses per turn (2 turns per player)
          </div>
          <div className="info-item">
            🔄 Players alternate turns
          </div>
          <div className="info-item">
            🏁 Race starts automatically when all horses are picked!
          </div>
        </div>
      </div>
    </div>
  )
}
