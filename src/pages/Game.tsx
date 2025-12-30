import { useState, useEffect, useRef } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useBalance } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import '../Game.css'
import PIXEL_PONY_ABI_FULL from '../PixelPonyABI.json'
import ReferralHandler from '../components/ReferralHandler'

// Price API
const PRICE_API_BASE = 'https://crypto-price-aggregator.onrender.com'
const CELO_TOKEN = '0x471EcE3750Da237f93B8E339c536989b8978a438'
const PONY_TOKEN = '0x000BE46901ea6f7ac2c1418D158f2f0A80992c07'

// Contract addresses
const PIXEL_PONY_ADDRESS = '0x3e9b5F357326a399aff2988eC501E28C9DD9f3b9'
const PONY_TOKEN_ADDRESS = '0x000BE46901ea6f7ac2c1418D158f2f0A80992c07'

// Use the full ABI from the verified contract
const PIXEL_PONY_ABI = PIXEL_PONY_ABI_FULL

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
] as const

const BET_AMOUNTS = [
  { label: '100M', value: parseEther('100000000') },
  { label: '500M', value: parseEther('500000000') },
  { label: '1B', value: parseEther('1000000000') },
  { label: '10B', value: parseEther('10000000000') },
  { label: '25B', value: parseEther('25000000000') },
  { label: '50B', value: parseEther('50000000000') }
]

function formatPony(num: string): string {
  const absNum = Math.abs(parseFloat(num))
  if (absNum >= 1e12) return (absNum / 1e12).toFixed(1) + 'T'
  if (absNum >= 1e9) return (absNum / 1e9).toFixed(1) + 'B'
  if (absNum >= 1e6) return (absNum / 1e6).toFixed(1) + 'M'
  if (absNum >= 1e3) return (absNum / 1e3).toFixed(1) + 'K'
  return absNum.toFixed(2)
}

export default function Game() {
  const { address, isConnected } = useAccount()
  const { writeContract, data: hash, isPending: isWritePending, error: writeError, reset: resetWrite } = useWriteContract()
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    pollingInterval: 5000, // Poll every 5 seconds instead of every block
  })
  const publicClient = usePublicClient()

  const [selectedHorse, setSelectedHorse] = useState<number | null>(() => {
    const saved = localStorage.getItem('selectedHorse')
    return saved ? parseInt(saved) : null
  })
  const [selectedBet, setSelectedBet] = useState<bigint | null>(() => {
    const saved = localStorage.getItem('selectedBet')
    return saved ? BigInt(saved) : null
  })
  const [statusMessage, setStatusMessage] = useState('Pick your pony and bet amount, then hit RACE!')
  const [isApproved, setIsApproved] = useState(false)
  const [showTrack, setShowTrack] = useState(false)
  const [ethBalance, setEthBalance] = useState('0')
  const [ponyBalance, setPonyBalance] = useState('0')
  const [isRacing, setIsRacing] = useState(false)
  const [raceHash, setRaceHash] = useState<`0x${string}` | null>(null)
  const [approvalHash, setApprovalHash] = useState<`0x${string}` | null>(null)
  const [lastProcessedHash, setLastProcessedHash] = useState<string | null>(null)
  const trackInnerRef = useRef<HTMLDivElement>(null)

  // Turbo mode state - pre-approve races
  const [turboMode, setTurboMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('turboMode')
    return saved === 'true'
  })

  // Price data for USD conversion
  const [celoPrice, setCeloPrice] = useState<number | null>(null)
  const [ponyPrice, setPonyPrice] = useState<number | null>(null)

  // Save selections to localStorage
  useEffect(() => {
    if (selectedHorse !== null) {
      localStorage.setItem('selectedHorse', selectedHorse.toString())
    } else {
      localStorage.removeItem('selectedHorse')
    }
  }, [selectedHorse])

  useEffect(() => {
    if (selectedBet !== null) {
      localStorage.setItem('selectedBet', selectedBet.toString())
    } else {
      localStorage.removeItem('selectedBet')
    }
  }, [selectedBet])

  // Save turbo mode to localStorage
  useEffect(() => {
    localStorage.setItem('turboMode', turboMode.toString())
  }, [turboMode])

  // Fetch CELO and PONY prices for USD conversion
  useEffect(() => {
    async function fetchPrices() {
      try {
        // Fetch CELO price
        const celoResponse = await fetch(`${PRICE_API_BASE}/price/${CELO_TOKEN}`)
        if (celoResponse.ok) {
          const celoData = await celoResponse.json()
          if (celoData.primaryPrice && celoData.primaryPrice > 0) {
            setCeloPrice(celoData.primaryPrice)
          } else if (celoData.averagePrice && celoData.averagePrice > 0) {
            setCeloPrice(celoData.averagePrice)
          }
        }

        // Fetch PONY price
        const ponyResponse = await fetch(`${PRICE_API_BASE}/price/${PONY_TOKEN}`)
        if (ponyResponse.ok) {
          const ponyData = await ponyResponse.json()
          if (ponyData.primaryPrice && ponyData.primaryPrice > 0) {
            setPonyPrice(ponyData.primaryPrice)
          } else if (ponyData.averagePrice && ponyData.averagePrice > 0) {
            setPonyPrice(ponyData.averagePrice)
          }
        }
      } catch (e) {
        console.error('Error fetching prices:', e)
      }
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  // Read jackpot
  const { data: gameStats, refetch: refetchJackpot } = useReadContract({
    address: PIXEL_PONY_ADDRESS,
    abi: PIXEL_PONY_ABI,
    functionName: 'getGameStats',
    chainId: 42220
  })

  // Read CELO balance
  const { data: ethBalanceData, refetch: refetchEthBalance } = useBalance({
    address: address,
    chainId: 42220,
    query: { enabled: !!address }
  })

  // Read PONY balance
  const { data: ponyBalanceData, refetch: refetchPonyBalance } = useReadContract({
    address: PONY_TOKEN_ADDRESS,
    abi: PONY_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: 42220,
    query: { enabled: !!address }
  })

  // Read base fee
  const { data: baseFee } = useReadContract({
    address: PIXEL_PONY_ADDRESS,
    abi: PIXEL_PONY_ABI,
    functionName: 'baseFeeAmount',
    chainId: 42220
  })

  // Log base fee for debugging
  useEffect(() => {
    if (baseFee && typeof baseFee === 'bigint') {
      console.log('Base Fee from contract:', baseFee.toString(), 'wei')
      console.log('Base Fee in CELO:', formatEther(baseFee))
    }
  }, [baseFee])

  // Read allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: PONY_TOKEN_ADDRESS,
    abi: PONY_TOKEN_ABI,
    functionName: 'allowance',
    args: address && selectedBet ? [address, PIXEL_PONY_ADDRESS] : undefined,
    chainId: 42220,
    query: { enabled: !!address && selectedBet !== null }
  })

  // Read user's lottery tickets
  const { data: userTickets, refetch: refetchTickets } = useReadContract({
    address: PIXEL_PONY_ADDRESS,
    abi: PIXEL_PONY_ABI,
    functionName: 'getUserTickets',
    args: address ? [address] : undefined,
    chainId: 42220,
    query: { enabled: !!address }
  })

  // Check if approved whenever allowance or selectedBet changes
  useEffect(() => {
    console.log('🔍 Allowance check:', {
      allowance: allowance?.toString(),
      selectedBet: selectedBet?.toString(),
      address,
      comparison: allowance && selectedBet ? `${allowance} >= ${selectedBet} = ${allowance >= selectedBet}` : 'N/A'
    })

    if (allowance && selectedBet) {
      const approved = allowance >= selectedBet
      console.log(`✅ Setting isApproved = ${approved}`)
      setIsApproved(approved)

      // Update status message based on approval state
      if (approved && selectedHorse !== null) {
        const betDisplay = formatPony(formatEther(selectedBet))
        if (turboMode) {
          setStatusMessage(`🚀 TURBO MODE: Ready to race! Pony #${selectedHorse + 1} with ${betDisplay} PONY. Click RACE!`)
        } else {
          setStatusMessage(`Ready to race! Pony #${selectedHorse + 1} with ${betDisplay} PONY. Click RACE!`)
        }
      } else if (selectedHorse !== null && selectedBet !== null) {
        const betDisplay = formatPony(formatEther(selectedBet))
        if (turboMode) {
          setStatusMessage(`🚀 TURBO MODE: Ready! Pony #${selectedHorse + 1} with ${betDisplay} PONY bet. Click STEP 1 to approve!`)
        } else {
          setStatusMessage(`Ready! Pony #${selectedHorse + 1} with ${betDisplay} PONY bet. Click STEP 1 to approve!`)
        }
      }
    } else {
      console.log('⚠️ Setting isApproved = false (no allowance or selectedBet)')
      setIsApproved(false)
    }
  }, [allowance, selectedBet, selectedHorse, turboMode, address])

  // Turbo mode: Auto-approve max allowance on first use
  useEffect(() => {
    // Only run if turbo mode is explicitly ON
    if (turboMode !== true) {
      console.log('Turbo mode OFF, skipping auto-approval')
      return
    }

    if (!address || !selectedBet) {
      console.log('Missing address or selectedBet, skipping auto-approval')
      return
    }

    // Check if we need to approve
    if (allowance && allowance >= selectedBet) {
      // Already approved
      console.log('🚀 Turbo Mode: Already approved, allowance:', allowance?.toString())
      return
    }

    // Check if already in process of approving
    if (approvalHash) {
      console.log('🚀 Turbo Mode: Approval already in progress, hash:', approvalHash)
      return
    }

    // Check if we already triggered auto-approval for this address (only once per wallet)
    const turboKey = `turbo_approved_${address}`
    if (sessionStorage.getItem(turboKey) === 'true') {
      console.log('🚀 Turbo Mode: Auto-approval already triggered for this wallet')
      return
    }

    // Auto-approve with max uint256 value for turbo mode (approve once, race forever)
    const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
    console.log('🚀 Turbo Mode: Triggering auto-approval for max allowance...')

    try {
      writeContract({
        address: PONY_TOKEN_ADDRESS,
        abi: PONY_TOKEN_ABI,
        functionName: 'approve',
        args: [PIXEL_PONY_ADDRESS, maxUint256],
        chainId: 42220
      })
      setStatusMessage('🚀 Turbo Mode: Auto-approving for infinite races...')
      sessionStorage.setItem(turboKey, 'true')
    } catch (error) {
      console.error('Turbo mode auto-approval error:', error)
      sessionStorage.removeItem(turboKey) // Clear flag if failed
    }
  }, [turboMode, address, selectedBet, allowance, approvalHash, writeContract])

  // Update balances
  useEffect(() => {
    if (ethBalanceData) {
      setEthBalance(parseFloat(formatEther(ethBalanceData.value)).toFixed(4))
    }
  }, [ethBalanceData])

  useEffect(() => {
    if (ponyBalanceData) {
      setPonyBalance(formatPony(formatEther(ponyBalanceData)))
    }
  }, [ponyBalanceData])

  // Jackpot display
  const jackpotDisplay = gameStats && Array.isArray(gameStats)
    ? (parseFloat(formatEther(gameStats[2])) / 1e9).toFixed(2) + 'B'
    : 'Loading...'

  // Debug logging
  useEffect(() => {
    console.log('Game component loaded - Turbo mode:', turboMode)
    console.log('CELO price:', celoPrice)
    console.log('PONY price:', ponyPrice)
    console.log('Base fee:', baseFee?.toString())
    console.log('Jackpot:', jackpotDisplay)
  }, [turboMode, celoPrice, ponyPrice, baseFee, jackpotDisplay])

  const selectHorse = (horseId: number) => {
    setSelectedHorse(horseId)
    if (selectedBet !== null) {
      const betDisplay = formatPony(formatEther(selectedBet))
      setStatusMessage(`Ready! Pony #${horseId + 1} with ${betDisplay} PONY bet. Click STEP 1 to approve!`)
    }
  }

  const selectBet = (amount: bigint) => {
    setSelectedBet(amount)
    setIsApproved(false)
    if (selectedHorse !== null) {
      const betDisplay = formatPony(formatEther(amount))
      setStatusMessage(`Ready! Pony #${selectedHorse + 1} with ${betDisplay} PONY bet. Click STEP 1 to approve!`)
    }
  }

  const updateStatus = () => {
    if (selectedHorse !== null && selectedBet !== null) {
      const betDisplay = formatPony(formatEther(selectedBet))
      setStatusMessage(`Ready! Pony #${selectedHorse + 1} with ${betDisplay} PONY bet. Click STEP 1 to approve!`)
    }
  }

  const handleApprove = () => {
    if (!selectedBet) return
    try {
      // Call writeContract FIRST before any state updates to maintain user interaction chain on mobile
      writeContract({
        address: PONY_TOKEN_ADDRESS,
        abi: PONY_TOKEN_ABI,
        functionName: 'approve',
        args: [PIXEL_PONY_ADDRESS, selectedBet],
        chainId: 42220
      })
      // State updates AFTER writeContract to avoid breaking mobile wallet interaction
      setStatusMessage('Approving PONY tokens...')
      setApprovalHash(null)
    } catch (error) {
      console.error('Approval error:', error)
      setStatusMessage('Approval failed')
    }
  }

  const handleRace = () => {
    console.log('🎯 handleRace called')
    console.log('  - selectedHorse:', selectedHorse)
    console.log('  - selectedBet:', selectedBet?.toString())
    console.log('  - baseFee:', baseFee?.toString())
    console.log('  - isRacing:', isRacing)
    console.log('  - isWritePending:', isWritePending)
    console.log('  - canRace:', canRace)

    if (selectedHorse === null || !selectedBet || !baseFee || isRacing) {
      console.log('❌ Race blocked by validation check')
      return
    }

    // Check if user has enough CELO (baseFee is 1 CELO, gas on CELO is ~0.0001)
    if (ethBalanceData && baseFee) {
      const minimumRequired = (baseFee as bigint) + parseEther('0.002') // 1 CELO baseFee + 0.002 gas buffer
      if (ethBalanceData.value < minimumRequired) {
        const needed = formatEther(minimumRequired)
        const have = formatEther(ethBalanceData.value)
        console.log('❌ Insufficient CELO balance')
        setStatusMessage(`Need ${needed} CELO total (${have} CELO available). Get more CELO!`)
        return
      }
    }

    console.log('✅ Racing with params:')
    console.log('  - Horse ID:', selectedHorse)
    console.log('  - Bet Amount:', selectedBet.toString(), 'wei')
    console.log('  - Bet Amount (PONY):', formatEther(selectedBet))
    console.log('  - Base Fee (value):', baseFee?.toString(), 'wei')
    console.log('  - Base Fee (CELO):', baseFee ? formatEther(baseFee as bigint) : 'N/A')
    console.log('  - User CELO Balance:', ethBalanceData ? formatEther(ethBalanceData.value) : 'unknown')

    try {
      console.log('📤 Calling writeContract...')
      // Call writeContract FIRST before any state updates to maintain user interaction chain on mobile
      // Wagmi will handle gas estimation automatically
      writeContract({
        address: PIXEL_PONY_ADDRESS,
        abi: PIXEL_PONY_ABI,
        functionName: 'placeBetAndRace',
        args: [BigInt(selectedHorse), selectedBet],
        value: baseFee as bigint,
        chainId: 42220
      })
      console.log('✅ writeContract call succeeded')

      // State updates AFTER writeContract to avoid breaking mobile wallet interaction
      setStatusMessage('Sending race transaction...')
      setIsRacing(true)
      setRaceHash(null)
    } catch (error) {
      console.error('❌ Race error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Transaction failed'

      // Better error messages
      if (errorMsg.toLowerCase().includes('insufficient')) {
        setStatusMessage('Insufficient CELO. Need ~1.002 CELO total (1 CELO entry + gas).')
      } else if (errorMsg.toLowerCase().includes('user rejected')) {
        setStatusMessage('Transaction rejected')
      } else {
        setStatusMessage(`Error: ${errorMsg.substring(0, 80)}`)
      }

      setShowTrack(false)
      setIsRacing(false)
    }
  }

  // Track race transaction hash
  useEffect(() => {
    if (hash && isRacing && !raceHash) {
      console.log('Tracking race hash:', hash)
      setRaceHash(hash)
      setStatusMessage('Race transaction sent! Waiting for results...')
    }
  }, [hash, isRacing, raceHash])

  // Handle write errors
  useEffect(() => {
    if (writeError) {
      console.error('Transaction error:', writeError)
      const errorMessage = writeError.message || 'Transaction failed'
      setStatusMessage(`Error: ${errorMessage.substring(0, 100)}`)
      setIsRacing(false)
      setShowTrack(false)

      // Reset after showing error
      setTimeout(() => {
        resetWrite()
        if (selectedHorse !== null && selectedBet !== null) {
          updateStatus()
        }
      }, 5000)
    }
  }, [writeError, resetWrite, selectedHorse, selectedBet])

  // Track approval transaction
  useEffect(() => {
    if (hash && !isRacing && !isApproved && !approvalHash) {
      console.log('Tracking approval hash:', hash)
      setApprovalHash(hash)
      setStatusMessage('Approval transaction sent! Waiting for confirmation...')
    }
  }, [hash, isRacing, isApproved, approvalHash])

  // Handle approval confirmation with more aggressive polling for mobile
  useEffect(() => {
    if (!approvalHash || !isConfirmed || approvalHash !== hash) return

    console.log('Approval confirmed! Refetching allowance...')
    setStatusMessage('Approval confirmed! Checking allowance...')

    const checkAllowance = async () => {
      // Fast polling: check immediately, then every 1 second for 15 attempts (15 seconds total)
      for (let i = 0; i < 15; i++) {
        if (i > 0) {
          // Only delay after first attempt - 1 second intervals for speed
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        setStatusMessage(`Verifying approval... (${i + 1}/15)`)
        const result = await refetchAllowance()
        console.log(`Checking allowance... attempt ${i + 1}/15, result:`, result.data?.toString())
        if (result.data && selectedBet && result.data >= selectedBet) {
          console.log('Allowance detected! Ready to race!')
          setStatusMessage(turboMode ? '🚀 TURBO MODE: Approved! Ready to race!' : '✅ Approved! Now click STEP 2: RACE!')
          setApprovalHash(null)
          resetWrite() // Clear the transaction state
          console.log('✅ Approval polling detected, resetWrite() called, isApproved should update')
          // Force one more refetch after small delay to ensure hook updates
          setTimeout(() => refetchAllowance(), 100)
          return
        }
      }
      console.log('Approval polling completed but not detected yet')
      setStatusMessage('Approval on-chain. Refresh page or try STEP 2 now.')
      setApprovalHash(null)
      resetWrite()
      // Force a final refetch
      refetchAllowance()
    }

    checkAllowance()
  }, [approvalHash, isConfirmed, hash, refetchAllowance, selectedBet, resetWrite])

  // Handle race transaction confirmation and fetch results
  useEffect(() => {
    const handleRaceComplete = async () => {
      if (!isConfirmed || !hash || !publicClient || !address) {
        return
      }
      if (!isRacing || raceHash !== hash) {
        return
      }

      // Prevent double processing
      if (lastProcessedHash === hash) {
        console.log('Race already processed, skipping...')
        return
      }

      console.log('Processing race:', hash)
      setLastProcessedHash(hash)

      try {
        console.log('Race transaction confirmed! Hash:', hash)
        setStatusMessage('Transaction confirmed! Animating race...')

        setShowTrack(true)

        console.log('Waiting for transaction receipt...')
        setStatusMessage('Waiting for blockchain confirmation...')
        let receipt = null
        let attempts = 0
        const maxAttempts = 20

        while (!receipt && attempts < maxAttempts) {
          try {
            receipt = await publicClient.getTransactionReceipt({ hash })
            console.log('Receipt found!')
          } catch (err) {
            attempts++
            console.log(`Attempt ${attempts}/${maxAttempts} - waiting for receipt...`)
            setStatusMessage(`Confirming on blockchain... (${attempts}/${maxAttempts})`)
            await new Promise(resolve => setTimeout(resolve, 3000))
          }
        }

        if (!receipt) {
          throw new Error('Transaction receipt not found after waiting. Please check CeloScan.')
        }

        console.log('Transaction receipt:', receipt)

        if (receipt.status !== 'success') {
          throw new Error('Transaction reverted or failed')
        }

        const raceLogs = receipt.logs.filter((log: any) =>
          log.address.toLowerCase() === PIXEL_PONY_ADDRESS.toLowerCase()
        )

        console.log('Found race logs:', raceLogs)

        if (raceLogs.length === 0) {
          throw new Error('No events found from PixelPony contract in transaction logs')
        }

        const { decodeEventLog } = await import('viem')

        let raceExecutedEvent = null
        for (const log of raceLogs) {
          try {
            const decodedLog = decodeEventLog({
              abi: PIXEL_PONY_ABI,
              data: log.data,
              topics: log.topics,
              strict: false
            })

            console.log('Successfully decoded:', decodedLog)

            if (decodedLog.eventName === 'RaceExecuted') {
              raceExecutedEvent = decodedLog
              break
            }
          } catch (err) {
            console.log('Could not decode this log:', err)
          }
        }

        if (!raceExecutedEvent) {
          throw new Error('RaceExecuted event not found in any logs. Check if contract ABI is correct.')
        }

        console.log('Decoded RaceExecuted event:', raceExecutedEvent)

        const { winners, payout, won } = raceExecutedEvent.args as any

        console.log('Winners:', winners)
        console.log('Payout:', payout)
        console.log('Won:', won)

        const winnerIds = winners.map((w: bigint) => Number(w))

        await animateRace(winnerIds)

        setStatusMessage(won ? 'You won!' : 'Better luck next time!')

        refetchJackpot()
        refetchPonyBalance()
        refetchEthBalance()
        refetchAllowance()

        // Cleanup state for next race
        setIsRacing(false)
        setRaceHash(null)
        resetWrite()

        return
      } catch (error: any) {
        console.error('Error in race handler:', error)
        setStatusMessage(`Error: ${error?.message || 'Unknown error'}. Check console!`)
        setShowTrack(false)
        setIsRacing(false)
        setRaceHash(null)
        setLastProcessedHash(null) // Allow retry on error
        resetWrite()
      }
    }

    handleRaceComplete()
  }, [isConfirmed, hash, publicClient, address, isRacing, raceHash, lastProcessedHash, refetchJackpot, refetchPonyBalance, refetchEthBalance, resetWrite])

  // Track when we start a race transaction
  useEffect(() => {
    if (hash && isRacing && !raceHash) {
      setRaceHash(hash)
    }
  }, [hash, isRacing, raceHash])

  // Animate race
  const animateRace = (winners: number[]): Promise<void> => {
    return new Promise((resolve) => {
      console.log('Starting race animation...')
      console.log('Winners to highlight:', winners)

      const trackContainer = trackInnerRef.current
      if (!trackContainer) {
        console.error('Track container not found!')
        resolve()
        return
      }

      const trackWidth = trackContainer.offsetWidth
      console.log('Track width:', trackWidth)
      const duration = 6000
      const startPosition = 35
      const finishPosition = trackWidth - 70
      const raceDistance = finishPosition - startPosition

      const horseSpeeds = Array(16).fill(0).map(() => 1.0 + Math.random() * 0.2)

      winners.forEach((winnerId, index) => {
        if (index === 0) horseSpeeds[winnerId] = 1.5
        else if (index === 1) horseSpeeds[winnerId] = 1.4
        else if (index === 2) horseSpeeds[winnerId] = 1.3
      })

      console.log('Horse speeds:', horseSpeeds)

      const startTime = Date.now()

      const animationInterval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        for (let i = 0; i < 16; i++) {
          const horse = document.getElementById(`racer-${i}`)
          if (!horse) continue

          const speed = horseSpeeds[i]
          const easeProgress = 1 - Math.pow(1 - progress, 2)
          const position = startPosition + (raceDistance * easeProgress * speed)

          const clampedPosition = Math.min(position, finishPosition)
          horse.style.left = clampedPosition + 'px'

          if (easeProgress >= 0.95 && winners.includes(i)) {
            horse.classList.add('winner')
          }
        }

        if (progress >= 1) {
          clearInterval(animationInterval)
          console.log('Race animation complete!')

          const announcement = document.getElementById('raceAnnouncement')
          if (announcement && selectedHorse !== null) {
            const playerWon = winners.includes(selectedHorse)

            announcement.innerHTML = `
              RACE COMPLETE!<br>
              <div style="margin-top: 15px; font-size: 18px;">
                Winners:<br>
                Pony #${winners[0] + 1}<br>
                Pony #${winners[1] + 1}<br>
                Pony #${winners[2] + 1}
              </div>
              <div style="margin-top: 15px; font-size: 20px; color: ${playerWon ? '#4ade80' : '#f87171'};">
                ${playerWon ? 'YOU WON!' : 'Better luck next time!'}
              </div>
            `
            announcement.style.display = 'block'
          }

          setTimeout(resolve, 500)
        }
      }, 50)
    })
  }

  const closeTrack = () => {
    setShowTrack(false)
    const announcement = document.getElementById('raceAnnouncement')
    if (announcement) {
      announcement.style.display = 'none'
    }
    refetchJackpot()
    refetchPonyBalance()
    refetchEthBalance()
    refetchTickets()
    refetchAllowance()
  }

  const canApprove = selectedHorse !== null && selectedBet !== null && address && !isApproved && !isRacing
  const canRace = isApproved && selectedHorse !== null && selectedBet !== null && baseFee && !isWritePending && !isRacing

  if (!isConnected) {
    return (
      <div className="container">
        <section>
          <h2>Connect Your Wallet</h2>
          <p style={{ textAlign: 'center', fontSize: '10px', padding: '20px' }}>
            Please connect your wallet to play Pixel Ponies
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="container">
      {/* Referral Handler - invisible component that handles ref links */}
      <ReferralHandler />

      {/* Header */}
      <div className="header">
        <img src="/logo.png" alt="Pixel Ponies Logo" />
        <div className="tagline">16 PIXELATED PONIES RACING ON-CHAIN FOR NO REASON</div>

        <div className="wallet-info">
          {address && `${address.slice(0, 6)}...${address.slice(-4)} | CELO`}
        </div>
        {address && (
          <>
            <div className="balance-info">
              <span>{ethBalance || '0.0000'} CELO</span>
              <span>{ponyBalance || '0'} PONY</span>
            </div>

            {/* Turbo Mode Toggle */}
            <div
              className="turbo-toggle"
              onClick={() => setTurboMode(!turboMode)}
              style={{
                cursor: 'pointer',
                padding: '8px 12px',
                marginTop: '8px',
                background: turboMode ? '#4ade80' : '#6b7280',
                borderRadius: '8px',
                fontSize: '9px',
                fontWeight: 'bold',
                color: turboMode ? '#000' : '#fff',
                textAlign: 'center',
                transition: 'all 0.2s',
                border: `2px solid ${turboMode ? '#22c55e' : '#4b5563'}`,
                userSelect: 'none'
              }}
            >
              {turboMode ? '🚀 TURBO MODE: ON' : '🐌 TURBO MODE: OFF'}
              <div style={{ fontSize: '7px', marginTop: '2px', opacity: 0.8 }}>
                {turboMode ? 'One-click racing enabled' : 'Click to enable auto-approval'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Jackpot Display */}
      <div className="jackpot-display">
        <div className="jackpot-label">JACKPOT</div>
        <div className="jackpot-amount">{jackpotDisplay}</div>
        <div style={{ fontSize: '8px', marginTop: '5px' }}>PONY</div>
      </div>

      {/* Lottery Tickets Display */}
      {address && (
        <div className="jackpot-display" style={{ marginTop: '16px', background: '#fdfd82', border: '2px solid #d4d400' }}>
          <div className="jackpot-label" style={{ color: '#333' }}>YOUR LOTTERY TICKETS</div>
          <div className="jackpot-amount" style={{ color: '#333' }}>
            {userTickets && Array.isArray(userTickets) ? userTickets.length : 0}
          </div>
          <div style={{ fontSize: '7px', marginTop: '5px', color: '#666' }}>Earn 1 ticket per race!</div>
        </div>
      )}

      {/* Status Message */}
      <div className="status-message">{statusMessage}</div>

      {/* Horse Selection */}
      <div className="horse-grid">
        {Array.from({ length: 16 }, (_, i) => {
          const spriteNum = (i % 30) + 1
          return (
            <div
              key={i}
              className={`horse-card ${selectedHorse === i ? 'selected' : ''}`}
              onClick={() => selectHorse(i)}
            >
              <img src={`/sprites/${spriteNum}.png`} className="horse-sprite" alt={`Pony ${i + 1}`} />
              <div className="horse-number">#{i + 1}</div>
            </div>
          )
        })}
      </div>

      {/* Bet Selection */}
      <div className="bet-section">
        <div className="bet-label">SELECT BET AMOUNT</div>
        <div className="bet-buttons">
          {BET_AMOUNTS.map((bet) => (
            <button
              key={bet.label}
              className={`bet-btn ${selectedBet === bet.value ? 'active' : ''}`}
              onClick={() => selectBet(bet.value)}
            >
              {bet.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <button
        className="race-btn"
        onClick={handleApprove}
        disabled={!canApprove || isWritePending}
        style={{ opacity: (!canApprove || isWritePending) ? 0.5 : 1 }}
      >
        {isApproved ? 'APPROVED!' : 'STEP 1: APPROVE PONY'}
      </button>

      {/* Manual Approval Check Button - shows after approval transaction */}
      {approvalHash && !isApproved && (
        <button
          className="race-btn"
          onClick={async () => {
            console.log('🔄 Checking approval status manually...')
            setStatusMessage('Manually checking approval...')
            const result = await refetchAllowance()
            console.log('Manual check result:', result.data?.toString(), 'vs selectedBet:', selectedBet?.toString())
            if (result.data && selectedBet && result.data >= selectedBet) {
              setStatusMessage(turboMode ? '🚀 TURBO MODE: Approved! Ready to race!' : '✅ Approval found! Click STEP 2: RACE!')
              setApprovalHash(null)
              resetWrite() // Clear the write state so race button becomes enabled
              console.log('✅ Approval confirmed, resetWrite() called')
            } else {
              setStatusMessage('Not approved yet. Wait a moment and try again.')
            }
          }}
          style={{
            background: '#ffa500',
            borderColor: '#ff8c00',
            opacity: 1,
            touchAction: 'manipulation'
          }}
        >
          🔄 CHECK APPROVAL STATUS
        </button>
      )}

      <button
        className="race-btn"
        onClick={(e) => {
          e.preventDefault()
          console.log('Race button clicked!', { canRace, isApproved, selectedHorse, selectedBet, baseFee, isWritePending, isRacing })
          if (canRace) {
            handleRace()
          } else {
            console.log('Race button disabled. Conditions:', {
              isApproved,
              hasHorse: selectedHorse !== null,
              hasBet: selectedBet !== null,
              hasBaseFee: !!baseFee,
              notPending: !isWritePending,
              notRacing: !isRacing
            })
          }
        }}
        disabled={!canRace}
        style={{ opacity: !canRace ? 0.5 : 1, touchAction: 'manipulation' }}
      >
        STEP 2: RACE!
      </button>

      {/* Race Track */}
      <div className={`track-container ${showTrack ? 'active' : ''}`}>
        <div className="track-inner" ref={trackInnerRef}>
          <button className="track-close" onClick={closeTrack}>
            CLOSE
          </button>
          <div className="race-announcement" id="raceAnnouncement"></div>
          {Array.from({ length: 16 }, (_, i) => {
            const spriteNum = (i % 30) + 1
            return (
              <div key={i} className="track-lane">
                <span className="lane-number">#{i + 1}</span>
                <img
                  id={`racer-${i}`}
                  src={`/sprites/${spriteNum}.png`}
                  className={`horse-racer ${i === selectedHorse ? 'player-horse' : ''}`}
                  alt={`Racer ${i + 1}`}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
