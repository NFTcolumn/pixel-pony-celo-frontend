import { useEffect, useRef } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { isAddress } from 'viem'
import { useSearchParams } from 'react-router-dom'

const REFERRAL_ADDRESS = '0xFF5987F04850c092C2Af855894fBF1679610Df23'

const REFERRAL_ABI = [
  {
    inputs: [{ name: 'player', type: 'address' }],
    name: 'hasReferrer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_referrer', type: 'address' }],
    name: 'setReferrer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

/**
 * Invisible component that handles referral link detection and setting
 * This runs independently and won't interfere with any other functionality
 */
export default function ReferralHandler() {
  const { address, isConnected } = useAccount()
  const [searchParams] = useSearchParams()
  const { writeContract } = useWriteContract()
  const attemptedRef = useRef(false)

  // Check if user already has a referrer
  const { data: hasReferrerData } = useReadContract({
    address: REFERRAL_ADDRESS,
    abi: REFERRAL_ABI,
    functionName: 'hasReferrer',
    args: address ? [address] : undefined,
    chainId: 42220,
    query: { enabled: !!address }
  })

  useEffect(() => {
    // Only attempt once per session
    if (attemptedRef.current) return

    const refParam = searchParams.get('ref')

    // Only proceed if we have all required conditions
    if (!refParam || !address || !isConnected) return

    // Validate referrer address
    if (!isAddress(refParam)) {
      console.warn('Invalid referrer address in URL')
      return
    }

    // Don't refer yourself
    if (refParam.toLowerCase() === address.toLowerCase()) {
      console.log('Cannot refer yourself')
      return
    }

    // Check if already has referrer
    if (hasReferrerData) {
      console.log('User already has a referrer')
      return
    }

    // Mark as attempted
    attemptedRef.current = true

    // Set referrer - this will prompt user to sign
    console.log('Setting referrer:', refParam)
    writeContract({
      address: REFERRAL_ADDRESS,
      abi: REFERRAL_ABI,
      functionName: 'setReferrer',
      args: [refParam as `0x${string}`],
      chainId: 42220
    })
  }, [searchParams, address, isConnected, hasReferrerData, writeContract])

  // This component renders nothing
  return null
}
