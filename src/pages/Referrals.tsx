import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther, isAddress } from 'viem'
import { useSearchParams } from 'react-router-dom'
import './Referrals.css'

const REFERRAL_ADDRESS = '0x2B4652Bd6149E407E3F57190E25cdBa1FC9d37d8'

const REFERRAL_ABI = [
  {
    inputs: [{ name: '_referrer', type: 'address' }],
    name: 'setReferrer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'player', type: 'address' }],
    name: 'hasReferrer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'minClaimAmount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_referrer', type: 'address' }],
    name: 'getReferrerStats',
    outputs: [
      { name: 'totalReferredRaces', type: 'uint256' },
      { name: 'pendingRewards', type: 'uint256' },
      { name: 'unpaidDirectRacesCount', type: 'uint256' },
      { name: 'unpaidSubRacesCount', type: 'uint256' },
      { name: 'totalEarned', type: 'uint256' },
      { name: 'totalClaimed', type: 'uint256' },
      { name: 'referredBy', type: 'address' },
      { name: 'currentCommissionBP', type: 'uint256' },
      { name: 'canClaim', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_referrer', type: 'address' }],
    name: 'getNextTierInfo',
    outputs: [
      { name: 'currentTier', type: 'uint256' },
      { name: 'currentCommissionBP', type: 'uint256' },
      { name: 'racesUntilNextTier', type: 'uint256' },
      { name: 'nextCommissionBP', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_referrer', type: 'address' }],
    name: 'getCommissionRate',
    outputs: [
      { name: 'basisPoints', type: 'uint256' },
      { name: 'percentage', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getGlobalStats',
    outputs: [
      { name: '_totalRewardsFunded', type: 'uint256' },
      { name: '_totalRewardsClaimed', type: 'uint256' },
      { name: '_totalReferrers', type: 'uint256' },
      { name: '_lastProcessedRaceId', type: 'uint256' },
      { name: '_contractBalance', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_referrer', type: 'address' }],
    name: 'getReferredPlayerCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_referrer', type: 'address' }],
    name: 'calculateUnpaidRewards',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

export default function Referrals() {
  const { address, isConnected } = useAccount()
  const [searchParams] = useSearchParams()
  const [referralLink, setReferralLink] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })

  // Read contract data
  const { data: hasReferrerData, refetch: refetchHasReferrer } = useReadContract({
    address: REFERRAL_ADDRESS,
    abi: REFERRAL_ABI,
    functionName: 'hasReferrer',
    args: address ? [address] : undefined,
    chainId: 42220,
    query: { enabled: !!address }
  })

  const { data: referrerStatsData, refetch: refetchReferrerStats } = useReadContract({
    address: REFERRAL_ADDRESS,
    abi: REFERRAL_ABI,
    functionName: 'getReferrerStats',
    args: address ? [address] : undefined,
    chainId: 42220,
    query: { enabled: !!address }
  })

  const { data: tierInfoData } = useReadContract({
    address: REFERRAL_ADDRESS,
    abi: REFERRAL_ABI,
    functionName: 'getNextTierInfo',
    args: address ? [address] : undefined,
    chainId: 42220,
    query: { enabled: !!address }
  })

  const { data: commissionRateData } = useReadContract({
    address: REFERRAL_ADDRESS,
    abi: REFERRAL_ABI,
    functionName: 'getCommissionRate',
    args: address ? [address] : undefined,
    chainId: 42220,
    query: { enabled: !!address }
  })

  const { data: playerCountData } = useReadContract({
    address: REFERRAL_ADDRESS,
    abi: REFERRAL_ABI,
    functionName: 'getReferredPlayerCount',
    args: address ? [address] : undefined,
    chainId: 42220,
    query: { enabled: !!address }
  })

  const { data: globalStatsData } = useReadContract({
    address: REFERRAL_ADDRESS,
    abi: REFERRAL_ABI,
    functionName: 'getGlobalStats',
    chainId: 42220
  })

  const { data: minClaimAmountData } = useReadContract({
    address: REFERRAL_ADDRESS,
    abi: REFERRAL_ABI,
    functionName: 'minClaimAmount',
    chainId: 42220
  })

  const { data: unpaidRewardsData } = useReadContract({
    address: REFERRAL_ADDRESS,
    abi: REFERRAL_ABI,
    functionName: 'calculateUnpaidRewards',
    args: address ? [address] : undefined,
    chainId: 42220,
    query: { enabled: !!address }
  })

  // Generate referral link
  useEffect(() => {
    if (address) {
      const baseUrl = window.location.origin
      setReferralLink(`${baseUrl}/game?ref=${address}`)
    }
  }, [address])

  // Handle referral link from URL
  useEffect(() => {
    const handleReferralFromUrl = async () => {
      const refParam = searchParams.get('ref')
      if (!refParam || !address || !isConnected) return

      // Validate referrer address
      if (!isAddress(refParam)) {
        console.warn('Invalid referrer address')
        return
      }

      // Don't refer yourself
      if (refParam.toLowerCase() === address.toLowerCase()) {
        console.log('Cannot refer yourself')
        return
      }

      // Check if already has referrer
      if (hasReferrerData) {
        console.log('Already has a referrer')
        return
      }

      // Set referrer
      setStatusMessage('Setting up referral...')
      try {
        writeContract({
          address: REFERRAL_ADDRESS,
          abi: REFERRAL_ABI,
          functionName: 'setReferrer',
          args: [refParam as `0x${string}`],
          chainId: 42220
        })
      } catch (error) {
        console.error('Error setting referrer:', error)
        setStatusMessage('Failed to set referrer')
      }
    }

    handleReferralFromUrl()
  }, [searchParams, address, isConnected, hasReferrerData, writeContract])

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      setStatusMessage('Referrer set successfully!')
      refetchHasReferrer()
      refetchReferrerStats()
      setTimeout(() => setStatusMessage(''), 3000)
    }
  }, [isConfirmed, refetchHasReferrer, refetchReferrerStats])

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const handleClaim = async () => {
    if (!address) return
    setStatusMessage('Claiming rewards...')
    try {
      writeContract({
        address: REFERRAL_ADDRESS,
        abi: REFERRAL_ABI,
        functionName: 'claim',
        chainId: 42220
      })
    } catch (error) {
      console.error('Error claiming:', error)
      setStatusMessage('Failed to claim rewards')
    }
  }

  // Parse referrer stats data
  const totalReferredRaces = referrerStatsData && Array.isArray(referrerStatsData) ? Number(referrerStatsData[0]) : 0
  const pendingRewards = referrerStatsData && Array.isArray(referrerStatsData)
    ? parseFloat(formatEther(referrerStatsData[1])).toFixed(5)
    : '0.00000'
  const unpaidDirectRaces = referrerStatsData && Array.isArray(referrerStatsData) ? Number(referrerStatsData[2]) : 0
  const unpaidSubRaces = referrerStatsData && Array.isArray(referrerStatsData) ? Number(referrerStatsData[3]) : 0
  const totalEarned = referrerStatsData && Array.isArray(referrerStatsData)
    ? parseFloat(formatEther(referrerStatsData[4])).toFixed(5)
    : '0.00000'
  const totalClaimed = referrerStatsData && Array.isArray(referrerStatsData)
    ? parseFloat(formatEther(referrerStatsData[5])).toFixed(5)
    : '0.00000'
  const canClaim = referrerStatsData && Array.isArray(referrerStatsData) ? Boolean(referrerStatsData[8]) : false

  // Parse tier info
  const currentTier = tierInfoData && Array.isArray(tierInfoData) ? Number(tierInfoData[0]) : 0
  // const currentCommissionBP = tierInfoData && Array.isArray(tierInfoData) ? Number(tierInfoData[1]) : 500
  const racesUntilNextTier = tierInfoData && Array.isArray(tierInfoData) ? Number(tierInfoData[2]) : 0
  // const nextCommissionBP = tierInfoData && Array.isArray(tierInfoData) ? Number(tierInfoData[3]) : 1000

  // Parse commission rate
  const commissionPercentage = commissionRateData && Array.isArray(commissionRateData)
    ? Number(commissionRateData[1])
    : 5

  // Player count
  const referredPlayerCount = playerCountData ? Number(playerCountData) : 0

  // Min claim amount
  const minClaimAmount = minClaimAmountData ? parseFloat(formatEther(minClaimAmountData)).toFixed(4) : '0.01'

  // Unpaid rewards (earned but not yet funded)
  const unpaidRewards = unpaidRewardsData
    ? parseFloat(formatEther(unpaidRewardsData)).toFixed(5)
    : '0.00000'

  // Calculate true total earned (contract's totalEarned + unpaid rewards)
  const trueTotalEarned = (
    parseFloat(totalEarned) + parseFloat(unpaidRewards)
  ).toFixed(5)

  // Global stats
  const totalRewardsFunded = globalStatsData && Array.isArray(globalStatsData)
    ? parseFloat(formatEther(globalStatsData[0])).toFixed(4)
    : '0.0000'
  const totalRewardsClaimed = globalStatsData && Array.isArray(globalStatsData)
    ? parseFloat(formatEther(globalStatsData[1])).toFixed(4)
    : '0.0000'
  const totalReferrers = globalStatsData && Array.isArray(globalStatsData)
    ? Number(globalStatsData[2])
    : 0

  // Tier names for display - Note: Contract currently treats 40+ as 50%
  const tierNames = ['Bronze (5%)', 'Silver (10%)', 'Gold (20%)', 'Platinum (30%)', 'Ruby (40%)', 'Diamond (50%)']

  // Adjust tier based on actual races since contract groups 40+ together
  let adjustedTier = currentTier
  if (currentTier === 4 && totalReferredRaces >= 50) {
    adjustedTier = 5
  } else if (currentTier === 4 && totalReferredRaces >= 40) {
    adjustedTier = 4
  }

  const currentTierName = tierNames[adjustedTier] || 'Bronze (5%)'
  const nextTierName = adjustedTier < 5 ? tierNames[adjustedTier + 1] : 'Max Tier'

  if (!isConnected) {
    return (
      <div className="referrals-page">
        <section className="connect-prompt">
          <h2>Referral Program</h2>
          <p>
            Connect your wallet to access your referral dashboard
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="referrals-page">
      <div className="referrals-container">
        <h1>REFERRAL PROGRAM</h1>
        <p className="referrals-subtitle">
          EARN REWARDS BY SHARING PIXEL PONIES
        </p>

        {statusMessage && (
          <div className="status-message">
            {statusMessage}
          </div>
        )}

        {/* Your Referral Link */}
        <section className="referral-section">
          <h2>🔗 YOUR REFERRAL LINK</h2>
          <div className="referral-link-box">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="referral-link-input"
            />
            <button
              onClick={copyReferralLink}
              className={`copy-button ${copySuccess ? 'success' : 'default'}`}
            >
              {copySuccess ? 'COPIED!' : 'COPY LINK'}
            </button>
          </div>
          <p className="referral-hint">
            Share this link to earn rewards from every race your friends play!
          </p>
        </section>

        {/* Your Rewards */}
        <section className="rewards-section">
          <h2>💰 YOUR REWARDS</h2>

          {/* Unpaid Rewards (Earned but not funded yet) */}
          <div className="rewards-card" style={{ marginBottom: '1rem' }}>
            <p className="rewards-label">💎 UNPAID REWARDS (Earned)</p>
            <p className="rewards-value">
              {unpaidRewards} CELO
            </p>
            <p className="rewards-info">
              ⏳ Waiting for contract funding
            </p>
          </div>

          {/* Claimable Rewards (Funded and ready to claim) */}
          <div className="rewards-card">
            <p className="rewards-label">✅ CLAIMABLE REWARDS (Funded)</p>
            <p className="rewards-value">
              {pendingRewards} CELO
            </p>
            <p className="rewards-info">
              🏆 Current Commission: {commissionPercentage}% | Tier: {currentTierName}
            </p>
            <p className="rewards-info">
              🏇 Direct Refs: {commissionPercentage}% | Sub-Refs: 5%
            </p>
            <button
              onClick={handleClaim}
              disabled={!canClaim || isPending}
              className="claim-button"
              style={{ opacity: isPending ? 0.5 : 1 }}
            >
              {isPending
                ? 'CLAIMING...'
                : canClaim
                ? 'CLAIM REWARDS'
                : `NEED MIN ${minClaimAmount} CELO TO CLAIM`
              }
            </button>
          </div>
        </section>

        {/* How It Works */}
        <section className="how-it-works">
          <h2>📋 HOW IT WORKS</h2>
          <ul style={{ textAlign: 'center', listStyle: 'none', padding: 0 }}>
            <li>Share your referral link with friends</li>
            <li>🎯 Tiered Commissions (of 0.01 CELO race fee):
              <ul style={{ marginTop: '0.5rem', listStyle: 'none', padding: 0 }}>
                <li>Bronze (0-9 races): 5%</li>
                <li>Silver (10-19 races): 10%</li>
                <li>Gold (20-29 races): 20%</li>
                <li>Platinum (30-39 races): 30%</li>
                <li>Ruby (40-49 races): 40%</li>
                <li>Diamond (50+ races): 50%</li>
              </ul>
            </li>
            <li>💎 Multi-Level: Earn 5% on sub-referrals (people your referrals bring)</li>
            <li>Claim rewards when you reach min {minClaimAmount} CELO</li>
            <li>No limit on referrals - earn forever! 💰</li>
          </ul>
        </section>

        {/* Your Stats */}
        <section className="stats-section">
          <h2>📊 YOUR STATS</h2>
          <div className="stats-grid">
            <div className="stat-box">
              <p className="stat-box-label">TOTAL REFERRED RACES</p>
              <p className="stat-box-value">{totalReferredRaces}</p>
            </div>
            <div className="stat-box">
              <p className="stat-box-label">REFERRED PLAYERS</p>
              <p className="stat-box-value">{referredPlayerCount}</p>
            </div>
            <div className="stat-box">
              <p className="stat-box-label">PENDING REWARDS</p>
              <p className="stat-box-value">{unpaidRewards} CELO</p>
            </div>
            <div className="stat-box">
              <p className="stat-box-label">TOTAL EARNED</p>
              <p className="stat-box-value">{trueTotalEarned} CELO</p>
            </div>
            <div className="stat-box">
              <p className="stat-box-label">TOTAL CLAIMED</p>
              <p className="stat-box-value">{totalClaimed} CELO</p>
            </div>
            <div className="stat-box">
              <p className="stat-box-label">CAN CLAIM?</p>
              <p className="stat-box-value">{canClaim ? '✅ YES' : '❌ NO'}</p>
            </div>
          </div>
        </section>

        {/* Tier Progress */}
        <section className="tier-section">
          <h2>🎖️ TIER PROGRESS</h2>
          <div className="stats-grid">
            <div className="stat-box">
              <p className="stat-box-label">CURRENT TIER</p>
              <p className="stat-box-value">{currentTierName}</p>
            </div>
            <div className="stat-box">
              <p className="stat-box-label">CURRENT COMMISSION</p>
              <p className="stat-box-value">{commissionPercentage}%</p>
            </div>
            {adjustedTier < 5 && (
              <>
                <div className="stat-box">
                  <p className="stat-box-label">NEXT TIER</p>
                  <p className="stat-box-value">{nextTierName}</p>
                </div>
                <div className="stat-box">
                  <p className="stat-box-label">RACES UNTIL NEXT</p>
                  <p className="stat-box-value">
                    {adjustedTier === 4 ? Math.max(0, 50 - totalReferredRaces) : racesUntilNextTier}
                  </p>
                </div>
              </>
            )}
          </div>
          {adjustedTier === 5 && (
            <p className="rewards-info" style={{ textAlign: 'center', marginTop: '1rem' }}>
              🎉 Congratulations! You've reached the maximum tier!
            </p>
          )}
        </section>

        {/* Multi-Level Stats */}
        {(unpaidDirectRaces > 0 || unpaidSubRaces > 0) && (
          <section className="multi-level-section">
            <h2>📈 UNPAID RACES BREAKDOWN</h2>
            <div className="stats-grid">
              <div className="stat-box">
                <p className="stat-box-label">DIRECT REFERRAL RACES</p>
                <p className="stat-box-value">{unpaidDirectRaces}</p>
              </div>
              <div className="stat-box">
                <p className="stat-box-label">SUB-REFERRAL RACES</p>
                <p className="stat-box-value">{unpaidSubRaces}</p>
              </div>
            </div>
            <p className="rewards-info" style={{ textAlign: 'center', marginTop: '1rem' }}>
              💡 These will be paid when the contract is next funded
            </p>
          </section>
        )}

        {/* Global Stats */}
        <section className="global-stats">
          <h2>🌐 GLOBAL REFERRAL STATS</h2>
          <div className="stats-grid">
            <div className="stat-box">
              <p className="stat-box-label">TOTAL REFERRERS</p>
              <p className="stat-box-value">{totalReferrers}</p>
            </div>
            <div className="stat-box">
              <p className="stat-box-label">TOTAL FUNDED</p>
              <p className="stat-box-value">{totalRewardsFunded} CELO</p>
            </div>
            <div className="stat-box">
              <p className="stat-box-label">TOTAL CLAIMED</p>
              <p className="stat-box-value">{totalRewardsClaimed} CELO</p>
            </div>
          </div>
        </section>

        <div className="referrals-cta">
          <a href="/game" className="referrals-cta-button">
            🎮 PLAY NOW 🎮
          </a>
        </div>
      </div>
    </div>
  )
}
