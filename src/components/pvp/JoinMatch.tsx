import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import PONYPVP_ABI from '../../PonyPvPABI.json'

const PONYPVP_ADDRESS = '0x739331647Fa2dBefe2c7A2E453A26Ee9f4a9965A'
const PONY_TOKEN_ADDRESS = '0x000BE46901ea6f7ac2c1418D158f2f0A80992c07'

const PONY_TOKEN_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
]

interface JoinMatchProps {
  matchId: string
  onMatchJoined: () => void
  onBack: () => void
}

export default function JoinMatch({ matchId, onMatchJoined, onBack }: JoinMatchProps) {
  const { address } = useAccount()
  const [statusMessage, setStatusMessage] = useState('Loading match...')
  const [isApproved, setIsApproved] = useState(false)
  const [isApprovingToken, setIsApprovingToken] = useState(false)
  const [approvalHash, setApprovalHash] = useState<`0x${string}` | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [opponentNftTokenId, setOpponentNftTokenId] = useState('')

  const { writeContract, data: hash, reset: resetWrite } = useWriteContract()
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })

  // Read entry fee
  const { data: entryFee } = useReadContract({
    address: PONYPVP_ADDRESS,
    abi: PONYPVP_ABI,
    functionName: 'entryFee',
    chainId: 42220
  })

  // Read match data
  const { data: matchData, refetch: refetchMatch } = useReadContract({
    address: PONYPVP_ADDRESS,
    abi: PONYPVP_ABI,
    functionName: 'getMatch',
    args: matchId ? [matchId as `0x${string}`] : undefined,
    chainId: 42220,
    query: { enabled: !!matchId }
  })

  // Read allowance (only for ERC20)
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: matchData ? ((matchData as any)[2] as `0x${string}`) : PONY_TOKEN_ADDRESS,
    abi: PONY_TOKEN_ABI,
    functionName: 'allowance',
    args: address && matchData ? [address, PONYPVP_ADDRESS] : undefined,
    chainId: 42220,
    query: {
      enabled: !!address && !!matchData && !((matchData as any)[4])
    }
  })

  // Check approval status
  useEffect(() => {
    if (!matchData) return

    const isNFT = (matchData as any)[4]
    const betAmount = (matchData as any)[3] as bigint

    if (isNFT) {
      setIsApproved(true)
      setStatusMessage('NFT match. Enter your NFT Token ID and join!')
    } else if (allowance && betAmount) {
      const approved = (allowance as bigint) >= betAmount
      setIsApproved(approved)

      if (approved && !isApprovingToken) {
        setStatusMessage(`✅ Approved! Ready to join. Entry fee: ${formatEther(entryFee as bigint || BigInt(0))} CELO`)
      } else if (!isApprovingToken) {
        setStatusMessage(`Approve ${formatPony(formatEther(betAmount))} tokens to join`)
      }
    }
  }, [allowance, matchData, isApprovingToken, entryFee])

  // Track approval transaction
  useEffect(() => {
    if (hash && isApprovingToken && !approvalHash) {
      setApprovalHash(hash)
      setStatusMessage('Approval transaction sent! Waiting for confirmation...')
    }
  }, [hash, isApprovingToken, approvalHash])

  // Handle approval confirmation with simpler polling
  useEffect(() => {
    if (!approvalHash || !isConfirmed || approvalHash !== hash || !matchData) return

    setStatusMessage('Approval confirmed! Checking allowance...')
    setApprovalHash(null)
    setIsApprovingToken(false)
    resetWrite()

    // Simple delayed refetch - works better on mobile
    const checkAllowance = async () => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await refetchAllowance()
      setStatusMessage('✅ Tokens approved! You can now join the match.')
    }

    checkAllowance()
  }, [approvalHash, isConfirmed, hash, refetchAllowance, matchData, resetWrite])

  // Handle join confirmation
  useEffect(() => {
    if (!isConfirmed || !hash || !isJoining) return

    setStatusMessage('Joined successfully! Loading match...')
    setIsJoining(false)
    resetWrite()
    setTimeout(() => {
      refetchMatch()
      onMatchJoined()
    }, 1000)
  }, [isConfirmed, hash, isJoining, resetWrite, refetchMatch, onMatchJoined])

  const formatPony = (value: string) => {
    const num = parseFloat(value)
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(1)}B`
    } else if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    return value
  }

  const handleApprove = () => {
    if (!matchData) return

    const betAmount = (matchData as any)[3] as bigint
    const tokenAddress = (matchData as any)[2] as `0x${string}`

    try {
      console.log('Attempting to approve:', {
        tokenAddress,
        spender: PONYPVP_ADDRESS,
        amount: betAmount.toString()
      })

      // Call writeContract FIRST before any state updates to maintain user interaction chain on mobile
      writeContract({
        address: tokenAddress,
        abi: PONY_TOKEN_ABI,
        functionName: 'approve',
        args: [PONYPVP_ADDRESS, betAmount],
        chainId: 42220
      })

      // State updates AFTER writeContract to avoid breaking mobile wallet interaction
      setStatusMessage('Opening wallet to approve tokens...')
      setIsApprovingToken(true)
      setApprovalHash(null)
    } catch (error: any) {
      console.error('Approval error:', error)
      // Check if user rejected
      if (error?.message?.includes('User rejected') || error?.code === 4001) {
        setStatusMessage('❌ Approval rejected by user')
      } else {
        setStatusMessage(`❌ Approval failed: ${error?.message || 'Unknown error'}`)
      }
      setIsApprovingToken(false)
      resetWrite()
    }
  }

  const handleJoinMatch = () => {
    if (!entryFee || !matchData) return

    const isNFT = (matchData as any)[4]

    if (isNFT && !opponentNftTokenId) {
      setStatusMessage('Please enter your NFT token ID')
      return
    }

    try {
      // Call writeContract FIRST before any state updates to maintain user interaction chain on mobile
      writeContract({
        address: PONYPVP_ADDRESS,
        abi: PONYPVP_ABI,
        functionName: 'joinMatch',
        args: [matchId as `0x${string}`, isNFT ? BigInt(opponentNftTokenId) : BigInt(0)],
        value: entryFee as bigint,
        chainId: 42220
      })

      // State updates AFTER writeContract to avoid breaking mobile wallet interaction
      setStatusMessage('Joining match...')
      setIsJoining(true)
    } catch (error) {
      console.error('Error joining match:', error)
      setStatusMessage('Failed to join match')
      setIsJoining(false)
    }
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

  const creator = (matchData as any)[0] as string
  const betAmount = (matchData as any)[3] as bigint
  const isNFT = (matchData as any)[4] as boolean
  const betToken = (matchData as any)[2] as string
  const matchState = Number((matchData as any)[5])
  const nftTokenId = (matchData as any)[8]

  // Check if user is the creator
  if (address?.toLowerCase() === creator.toLowerCase()) {
    return (
      <div className="container">
        <button onClick={onBack} className="back-btn">
          ← BACK
        </button>
        <div className="waiting-message">
          ❌ You cannot join your own match!
        </div>
      </div>
    )
  }

  // Check if match is already full
  if (matchState !== 0) {
    return (
      <div className="container">
        <button onClick={onBack} className="back-btn">
          ← BACK
        </button>
        <div className="waiting-message">
          This match is no longer available to join.
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <button onClick={onBack} className="back-btn">
        ← BACK TO MENU
      </button>

      <div className="status-message">{statusMessage}</div>

      {/* Match Info */}
      <div className="match-info">
        <h3 style={{ textAlign: 'center', fontSize: '14px', marginBottom: '15px', color: '#000' }}>
          🎮 JOIN THIS MATCH
        </h3>

        <div className="info-row">
          <span>Creator:</span>
          <span style={{ fontSize: '9px' }}>{creator.slice(0, 6)}...{creator.slice(-4)}</span>
        </div>

        <div className="info-row">
          <span>Entry Fee:</span>
          <span>{formatEther(entryFee as bigint || BigInt(0))} CELO</span>
        </div>

        <div className="info-row">
          <span>Bet Amount:</span>
          <span>
            {isNFT
              ? `NFT (Token ID: ${nftTokenId?.toString() || 'N/A'})`
              : `${formatPony(formatEther(betAmount))} ${betToken.toLowerCase() === PONY_TOKEN_ADDRESS.toLowerCase() ? 'PONY' : 'tokens'}`
            }
          </span>
        </div>
      </div>

      {/* NFT Token ID Input */}
      {isNFT && (
        <div className="input-section">
          <label>Your NFT Token ID</label>
          <input
            type="text"
            className="match-input"
            placeholder="Enter your NFT Token ID"
            value={opponentNftTokenId}
            onChange={(e) => setOpponentNftTokenId(e.target.value)}
          />
        </div>
      )}

      {/* Approve Button for ERC20 */}
      {!isNFT && !isApproved && (
        <button
          className="race-btn"
          onClick={handleApprove}
          disabled={isApprovingToken}
          style={{
            opacity: isApprovingToken ? 0.5 : 1,
            marginBottom: '10px'
          }}
        >
          {isApprovingToken ? 'APPROVING...' : 'STEP 1: APPROVE TOKENS'}
        </button>
      )}

      {/* Join Button */}
      <button
        className="race-btn"
        onClick={handleJoinMatch}
        disabled={isJoining || (!isNFT && !isApproved) || !entryFee}
        style={{
          opacity: (isJoining || (!isNFT && !isApproved) || !entryFee) ? 0.5 : 1,
          background: '#10b981',
          borderColor: '#059669'
        }}
      >
        {isJoining
          ? 'JOINING...'
          : isNFT
            ? 'JOIN MATCH (NFT)'
            : isApproved
              ? 'STEP 2: JOIN MATCH'
              : 'JOIN MATCH'
        }
      </button>

      {/* Info Section */}
      <div className="info-section" style={{ marginTop: '20px' }}>
        <h3>What happens next:</h3>
        <div className="info-list">
          <div className="info-item">
            1️⃣ Join the match with your bet
          </div>
          <div className="info-item">
            2️⃣ Game determines who picks first
          </div>
          <div className="info-item">
            3️⃣ Take turns picking 4 horses each
          </div>
          <div className="info-item">
            4️⃣ Watch the race and see who wins!
          </div>
        </div>
      </div>
    </div>
  )
}
