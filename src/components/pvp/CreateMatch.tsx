import React, { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import PONYPVP_ABI from '../../PonyPvPABI.json'
import { ERC20BetSection } from './ERC20BetSection'

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
  },
  {
    inputs: [
      { name: 'account', type: 'address' }
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
]

interface CreateMatchProps {
  onMatchCreated: (matchId: string) => void
  onBack: () => void
}

export default function CreateMatch({ onMatchCreated, onBack }: CreateMatchProps) {
  const { address } = useAccount()
  const [selectedBet, setSelectedBet] = useState<bigint | null>(null)
  const [betInputValue, setBetInputValue] = useState('0')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [tokenType, setTokenType] = useState<'erc20' | 'nft'>('erc20')
  const [useCustomToken, setUseCustomToken] = useState(false)
  const [customToken, setCustomToken] = useState('')
  const [nftTokenId, setNftTokenId] = useState('')
  const [statusMessage, setStatusMessage] = useState('Select bet amount and token type to create a match')
  const [isApproved, setIsApproved] = useState(false)
  const [isApprovingToken, setIsApprovingToken] = useState(false)
  const [approvalHash, setApprovalHash] = useState<`0x${string}` | null>(null)
  const [isCreatingMatch, setIsCreatingMatch] = useState(false)

  const { writeContract, data: hash, reset: resetWrite } = useWriteContract()
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })
  const publicClient = usePublicClient()

  // Read entry fee
  const { data: entryFee } = useReadContract({
    address: PONYPVP_ADDRESS,
    abi: PONYPVP_ABI,
    functionName: 'entryFee',
    chainId: 42220
  })

  // Read token balance
  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: (useCustomToken && customToken ? customToken : PONY_TOKEN_ADDRESS) as `0x${string}`,
    abi: PONY_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: 42220,
    query: { enabled: !!address && tokenType === 'erc20' }
  }) as { data: bigint | undefined; refetch: () => void }

  // Read allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: (useCustomToken && customToken ? customToken : PONY_TOKEN_ADDRESS) as `0x${string}`,
    abi: PONY_TOKEN_ABI,
    functionName: 'allowance',
    args: address && selectedBet ? [address, PONYPVP_ADDRESS] : undefined,
    chainId: 42220,
    query: { enabled: !!address && selectedBet !== null && tokenType === 'erc20' }
  })

  // Check approval status
  useEffect(() => {
    if (allowance && selectedBet && tokenType === 'erc20') {
      const approved = (allowance as bigint) >= selectedBet
      setIsApproved(approved)

      if (approved && !isApprovingToken) {
        const betDisplay = formatPony(formatEther(selectedBet))
        const tokenName = getTokenName()
        setStatusMessage(`✅ Approved! ${betDisplay} ${tokenName} ready. Click STEP 2 to create match!`)
      } else if (selectedBet !== null && !isApprovingToken) {
        const betDisplay = formatPony(formatEther(selectedBet))
        const tokenName = getTokenName()
        setStatusMessage(`Ready! ${betDisplay} ${tokenName} bet. Click STEP 1 to approve!`)
      }
    } else if (tokenType === 'nft') {
      setIsApproved(true)
    } else {
      setIsApproved(false)
    }
  }, [allowance, selectedBet, tokenType, useCustomToken, isApprovingToken])

  // Track approval transaction
  useEffect(() => {
    if (hash && isApprovingToken && !approvalHash) {
      setApprovalHash(hash)
      setStatusMessage('Approval transaction sent! Waiting for confirmation...')
    }
  }, [hash, isApprovingToken, approvalHash])

  // Handle approval confirmation with polling
  useEffect(() => {
    if (!approvalHash || !isConfirmed || approvalHash !== hash) return

    setStatusMessage('Approval confirmed! Checking allowance...')

    const checkAllowance = async () => {
      for (let i = 0; i < 25; i++) {
        await new Promise(resolve => setTimeout(resolve, 500))
        setStatusMessage(`Verifying approval... (${i + 1}/25)`)
        const result = await refetchAllowance()
        if (result.data && selectedBet && (result.data as bigint) >= selectedBet) {
          const betDisplay = formatPony(formatEther(selectedBet))
          const tokenName = getTokenName()
          setStatusMessage(`✅ Approved! ${betDisplay} ${tokenName} ready. Click STEP 2 to create match!`)
          setApprovalHash(null)
          setIsApprovingToken(false)
          resetWrite()
          setTimeout(() => refetchAllowance(), 100)
          return
        }
      }
      setStatusMessage('Approval on-chain. Refresh page or try STEP 2 now.')
      setApprovalHash(null)
      setIsApprovingToken(false)
      resetWrite()
      refetchAllowance()
    }

    checkAllowance()
  }, [approvalHash, isConfirmed, hash, refetchAllowance, selectedBet, resetWrite, useCustomToken])

  // Handle match creation confirmation
  useEffect(() => {
    const handleMatchCreated = async () => {
      if (!isConfirmed || !hash || !isCreatingMatch || !publicClient) return

      try {
        setStatusMessage('Match created! Processing...')

        // Get the transaction receipt with retries
        let receipt = null
        let attempts = 0
        const maxAttempts = 30

        while (!receipt && attempts < maxAttempts) {
          try {
            receipt = await publicClient.getTransactionReceipt({ hash })
            console.log('Receipt found!')
          } catch (err) {
            attempts++
            console.log(`Attempt ${attempts}/${maxAttempts} - waiting for receipt...`)
            setStatusMessage(`Processing... (${attempts}/${maxAttempts})`)
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }

        if (!receipt) {
          throw new Error('Transaction receipt not found after waiting.')
        }

        // Extract matchId from logs
        const { decodeEventLog } = await import('viem')
        const matchLogs = receipt.logs.filter((log: any) =>
          log.address.toLowerCase() === PONYPVP_ADDRESS.toLowerCase()
        )

        for (const log of matchLogs) {
          try {
            const decodedLog = decodeEventLog({
              abi: PONYPVP_ABI,
              data: log.data,
              topics: log.topics,
              strict: false
            })

            if (decodedLog.eventName === 'MatchCreated') {
              const matchId = (decodedLog.args as any).matchId as string
              setStatusMessage('Match created successfully!')
              setIsCreatingMatch(false)
              resetWrite()
              onMatchCreated(matchId)
              return
            }
          } catch (err) {
            console.log('Could not decode log:', err)
          }
        }

        setStatusMessage('Match created! Redirecting...')
        setIsCreatingMatch(false)
        resetWrite()
      } catch (error) {
        console.error('Error getting match details:', error)
        setStatusMessage('Match created but could not get ID. Check your matches.')
        setIsCreatingMatch(false)
        resetWrite()
      }
    }

    handleMatchCreated()
  }, [isConfirmed, hash, isCreatingMatch, publicClient, resetWrite, onMatchCreated])

  const formatPony = (value: string): string => {
    const num = parseFloat(value)
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(1)}B`
    } else if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    return value
  }

  const getTokenAddress = () => {
    if (tokenType === 'nft' || (useCustomToken && customToken)) {
      return customToken
    }
    return PONY_TOKEN_ADDRESS
  }

  const getTokenName = (): string => {
    if (useCustomToken && customToken) {
      return 'tokens'
    }
    return 'PONY'
  }

  const handleSetMaxBalance = () => {
    if (tokenBalance) {
      setSelectedBet(tokenBalance as bigint)
      setBetInputValue(formatEther(tokenBalance as bigint))
      setShowCustomInput(true)
    }
  }

  const handleBetSelection = (value: bigint | null) => {
    if (value === null) {
      // Show custom input field
      setShowCustomInput(true)
      setSelectedBet(null)
      setBetInputValue('')
    } else {
      setShowCustomInput(false)
      setSelectedBet(value)
      setBetInputValue(formatEther(value))
    }
  }

  const handleCustomBetInput = (value: string) => {
    setBetInputValue(value)
    if (value && value !== '0') {
      try {
        const parsedValue = parseEther(value)
        setSelectedBet(parsedValue)
      } catch {
        setSelectedBet(null)
      }
    } else {
      setSelectedBet(null)
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
      setIsApprovingToken(true)
      setApprovalHash(null)
      await writeContract({
        address: tokenAddress as `0x${string}`,
        abi: PONY_TOKEN_ABI,
        functionName: 'approve',
        args: [PONYPVP_ADDRESS, selectedBet],
        chainId: 42220
      })
    } catch (error) {
      setStatusMessage('Approval failed')
      setIsApprovingToken(false)
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
      setIsCreatingMatch(true)

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
      setStatusMessage('Match transaction sent! Waiting for confirmation...')
    } catch (error) {
      setStatusMessage('Failed to create match')
      setIsCreatingMatch(false)
    }
  }


  return (
    <div className="container">
      <button onClick={onBack} className="back-btn">
        ← BACK TO MENU
      </button>

      <div className="status-message">{statusMessage}</div>

      {/* Token Type Selection */}
      <div className="bet-section">
        <div className="bet-label">SELECT TOKEN TYPE</div>
        <div className="bet-buttons">
          <button
            className={`bet-btn ${tokenType === 'erc20' ? 'active' : ''}`}
            onClick={() => setTokenType('erc20')}
          >
            ERC20 TOKENS
          </button>
          <button
            className={`bet-btn ${tokenType === 'nft' ? 'active' : ''}`}
            onClick={() => setTokenType('nft')}
          >
            NFT
          </button>
        </div>
      </div>

      {/* ERC20 Bet Selection */}
      {tokenType === 'erc20' ? (
        <ERC20BetSection
          useCustomToken={useCustomToken}
          setUseCustomToken={setUseCustomToken}
          customToken={customToken}
          setCustomToken={setCustomToken}
          tokenBalance={tokenBalance}
          getTokenName={getTokenName}
          formatPony={formatPony}
          showCustomInput={showCustomInput}
          selectedBet={selectedBet}
          betInputValue={betInputValue}
          handleBetSelection={handleBetSelection}
          handleCustomBetInput={handleCustomBetInput}
          handleSetMaxBalance={handleSetMaxBalance}
        /> as any
      ) : null}

      {/* NFT Token ID Input */}
      {tokenType === 'nft' && (
        <div className="input-section">
          <label>NFT Contract Address</label>
          <input
            type="text"
            className="match-input"
            placeholder="NFT contract address (0x...)"
            value={customToken}
            onChange={(e) => setCustomToken(e.target.value)}
          />
          <label style={{ marginTop: '15px' }}>NFT Token ID</label>
          <input
            type="text"
            className="match-input"
            placeholder="Enter NFT Token ID"
            value={nftTokenId}
            onChange={(e) => setNftTokenId(e.target.value)}
          />
        </div>
      )}

      {/* Entry Fee Display */}
      {entryFee && (
        <div className="info-section">
          <div className="info-item">
            Entry Fee: {formatEther(entryFee as bigint)} CELO
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {tokenType === 'erc20' && (
        <button
          className="race-btn"
          onClick={handleApprove}
          disabled={!selectedBet || isApproved}
          style={{
            opacity: (!selectedBet || isApproved) ? 0.5 : 1,
            marginBottom: '10px'
          }}
        >
          {isApproved ? '✅ APPROVED!' : 'STEP 1: APPROVE TOKENS'}
        </button>
      )}

      <button
        className="race-btn"
        onClick={handleCreateMatch}
        disabled={isCreatingMatch || (tokenType === 'erc20' && !isApproved) || !entryFee}
        style={{
          opacity: (isCreatingMatch || (tokenType === 'erc20' && !isApproved) || !entryFee) ? 0.5 : 1
        }}
      >
        {isCreatingMatch ? 'CREATING MATCH...' : tokenType === 'nft' ? 'CREATE MATCH (NFT)' : 'STEP 2: CREATE MATCH'}
      </button>
    </div>
  )
}
