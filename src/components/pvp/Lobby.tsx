import { useState, useEffect } from 'react'
import { useAccount, useReadContract, usePublicClient } from 'wagmi'
import { formatEther } from 'viem'
import PONYPVP_ABI from '../../PonyPvPABI.json'

const PONYPVP_ADDRESS = '0x739331647Fa2dBefe2c7A2E453A26Ee9f4a9965A'
const PONY_TOKEN_ADDRESS = '0x000BE46901ea6f7ac2c1418D158f2f0A80992c07'

interface LobbyProps {
  matchId: string
  onMatchJoined: () => void
  onBack: () => void
  onCreateAnother?: () => void
}

export default function Lobby({ matchId, onMatchJoined, onBack, onCreateAnother }: LobbyProps) {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [hasTransitioned, setHasTransitioned] = useState(false)

  // Read match data
  const { data: matchData, refetch: refetchMatch } = useReadContract({
    address: PONYPVP_ADDRESS,
    abi: PONYPVP_ABI,
    functionName: 'matches',
    args: matchId ? [matchId as `0x${string}`] : undefined,
    chainId: 42220,
    query: { enabled: !!matchId }
  })

  // Poll match data every 3 seconds to check if opponent joined
  useEffect(() => {
    if (!matchId || !isConnected) return

    const interval = setInterval(() => {
      refetchMatch()
    }, 3000)

    return () => clearInterval(interval)
  }, [matchId, isConnected, refetchMatch])

  // Check if match state changed to Active (opponent joined)
  useEffect(() => {
    if (!matchData || !isConnected || hasTransitioned) return

    const state = Number((matchData as any)[13])
    const opponent = (matchData as any)[2] as string

    // State 2 = Selecting, State 3 = ReadyToRace, State 4 = Completed
    if (state >= 2) {
      // Match already started or completed, go to selection view
      setHasTransitioned(true)
      onMatchJoined()
    }
    // State 1 = Joined (opponent joined, waiting for first picker)
    else if (state === 1 && opponent !== '0x0000000000000000000000000000000000000000') {
      setHasTransitioned(true)
      onMatchJoined()
    }
  }, [matchData, isConnected, hasTransitioned, onMatchJoined])

  // Listen for MatchJoined event
  useEffect(() => {
    if (!publicClient || !matchId || !isConnected || hasTransitioned) return

    const watchForJoin = async () => {
      try {
        // Watch for MatchJoined events
        const unwatch = publicClient.watchContractEvent({
          address: PONYPVP_ADDRESS,
          abi: PONYPVP_ABI,
          eventName: 'MatchJoined',
          onLogs: (logs) => {
            logs.forEach((log: any) => {
              const eventMatchId = (log.args as any).matchId
              if (eventMatchId === matchId && !hasTransitioned) {
                console.log('Match joined event detected!')
                refetchMatch()
                setHasTransitioned(true)
                setTimeout(() => {
                  onMatchJoined()
                }, 1000)
              }
            })
          }
        })

        return unwatch
      } catch (error) {
        console.error('Error watching for MatchJoined event:', error)
      }
    }

    const cleanup = watchForJoin()

    return () => {
      cleanup.then(unwatch => {
        if (unwatch) unwatch()
      })
    }
  }, [publicClient, matchId, isConnected, hasTransitioned, onMatchJoined, refetchMatch])

  // Calculate time remaining (10 minutes = 600 seconds)
  useEffect(() => {
    if (!matchData) return

    const createdAt = Number((matchData as any)[14])
    if (createdAt === 0) return

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000)
      const elapsed = now - createdAt
      const remaining = 600 - elapsed // 10 minutes = 600 seconds

      setTimeRemaining(Math.max(0, remaining))

      if (remaining <= 0) {
        // Match expired
        return
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [matchData])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatPony = (value: string) => {
    const num = parseFloat(value)
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(1)}B`
    } else if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    return value
  }

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/pvp?match=${matchId}`
    navigator.clipboard.writeText(shareUrl)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
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

  const creator = (matchData as any)[1] as string
  const betAmount = (matchData as any)[4] as bigint
  const isNFT = (matchData as any)[7] as boolean
  const betToken = (matchData as any)[3] as string
  const isCreator = address?.toLowerCase() === creator.toLowerCase()

  return (
    <div className="container">
      <button onClick={onBack} className="back-btn">
        ← BACK TO MENU
      </button>

      {/* Match Info */}
      <div className="match-info">
        <h3 style={{ textAlign: 'center', fontSize: '14px', marginBottom: '20px', color: '#000' }}>
          🎮 MATCH INFO
        </h3>

        <div className="info-row">
          <span>Match ID:</span>
          <span style={{ fontSize: '8px', wordBreak: 'break-all' }}>{matchId.slice(0, 10)}...</span>
        </div>

        <div className="info-row">
          <span>Creator:</span>
          <span style={{ fontSize: '8px' }}>
            {isCreator ? 'YOU' : `${creator.slice(0, 6)}...${creator.slice(-4)}`}
          </span>
        </div>

        <div className="info-row">
          <span>Bet:</span>
          <span>
            {isNFT
              ? `NFT Token`
              : `${formatPony(formatEther(betAmount))} ${betToken.toLowerCase() === PONY_TOKEN_ADDRESS.toLowerCase() ? 'PONY' : 'tokens'}`
            }
          </span>
        </div>
      </div>

      {/* Countdown Timer */}
      {timeRemaining !== null && (
        <div
          className="match-info"
          style={{
            background: timeRemaining < 120 ? '#fee' : '#f0fdf4',
            border: timeRemaining < 120 ? '2px solid #f87171' : '2px solid #4ade80'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#000', marginBottom: '10px' }}>
              ⏱️ TIME REMAINING
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: timeRemaining < 120 ? '#f87171' : '#22c55e',
                fontFamily: 'monospace'
              }}
            >
              {formatTime(timeRemaining)}
            </div>
            {timeRemaining === 0 && (
              <div style={{ fontSize: '12px', color: '#f87171', marginTop: '10px', fontWeight: 'bold' }}>
                ⏰ MATCH TIMED OUT<br/>
                <div style={{ fontSize: '10px', marginTop: '5px', fontWeight: 'normal' }}>
                  No opponent joined within 10 minutes.<br/>
                  Please go back and create a new match.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Link Section or Create Another Match */}
      {timeRemaining === 0 ? (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            className="race-btn"
            onClick={() => {
              if (onCreateAnother) {
                onCreateAnother()
              } else {
                onBack()
              }
            }}
            style={{
              background: '#4ade80',
              borderColor: '#22c55e',
              width: '100%'
            }}
          >
            🎮 CREATE ANOTHER MATCH
          </button>
        </div>
      ) : (
        <div className="share-section">
          <div className="share-label">📋 SHARE INVITE LINK</div>
          <div style={{ fontSize: '8px', textAlign: 'center', color: '#78350f', marginBottom: '10px' }}>
            Share this link with your opponent to join the match
          </div>
          <button
            className="race-btn"
            onClick={handleCopyLink}
            style={{
              background: copySuccess ? '#4ade80' : '#fbbf24',
              borderColor: copySuccess ? '#22c55e' : '#f59e0b',
              marginBottom: '10px'
            }}
          >
            {copySuccess ? '✅ COPIED!' : '📋 COPY INVITE LINK'}
          </button>
          <div className="share-link-box">
            <input
              type="text"
              className="share-input"
              value={`${window.location.origin}/pvp?match=${matchId}`}
              readOnly
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
          </div>
        </div>
      )}
    </div>
  )
}
