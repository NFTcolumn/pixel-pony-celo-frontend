import { useEffect, useState } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { celo } from 'wagmi/chains'
import './ChainSwitcher.css'

interface ChainSwitcherProps {
  onClose?: () => void
}

export default function ChainSwitcher({ onClose }: ChainSwitcherProps) {
  const { chain, isConnected } = useAccount()
  const { switchChain, isPending, error } = useSwitchChain()
  const [showModal, setShowModal] = useState(false)
  const [isAddingNetwork, setIsAddingNetwork] = useState(false)

  // Detect wrong chain and show modal
  useEffect(() => {
    console.log('ChainSwitcher - isConnected:', isConnected, 'chain:', chain?.id, 'celo:', celo.id)
    if (isConnected && chain && chain.id !== celo.id) {
      console.log('ChainSwitcher - WRONG CHAIN DETECTED, showing modal')
      setShowModal(true)
    } else {
      console.log('ChainSwitcher - correct chain or not connected')
      setShowModal(false)
    }
  }, [isConnected, chain])

  const handleSwitchChain = async () => {
    try {
      await switchChain({ chainId: celo.id })
      setShowModal(false)
      onClose?.()
    } catch (err: any) {
      // If switch fails, user might not have the network added
      if (err?.code === 4902 || err?.message?.includes('Unrecognized chain')) {
        setIsAddingNetwork(true)
      }
    }
  }

  const handleAddNetwork = async () => {
    try {
      // Add Celo network to wallet
      if (typeof window !== 'undefined' && window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0xa4ec', // 42220 in hex
              chainName: 'Celo Mainnet',
              nativeCurrency: {
                name: 'CELO',
                symbol: 'CELO',
                decimals: 18,
              },
              rpcUrls: ['https://forno.celo.org'],
              blockExplorerUrls: ['https://celoscan.io'],
            },
          ],
        })
        // After adding, try to switch
        await handleSwitchChain()
        setIsAddingNetwork(false)
      }
    } catch (err) {
      console.error('Failed to add network:', err)
    }
  }

  if (!showModal) return null

  return (
    <>
      <div className="chain-switcher-overlay" />
      <div className="chain-switcher-modal">
        <div className="modal-header">
          <h2>WRONG NETWORK</h2>
        </div>

        <div className="modal-body">
          <div className="warning-icon">⚠️</div>

          <p className="current-chain">
            Current: <span className="chain-name">{chain?.name || 'Unknown'}</span>
          </p>

          <p className="required-chain">
            Required: <span className="chain-name">Celo Mainnet</span>
          </p>

          <div className="modal-message">
            {isAddingNetwork ? (
              <>
                <p>Celo network not found in your wallet.</p>
                <p>Click below to add it automatically.</p>
              </>
            ) : (
              <>
                <p>You're connected to the wrong network.</p>
                <p>Please switch to Celo Mainnet to continue.</p>
              </>
            )}
          </div>

          {error && (
            <div className="error-message">
              Error: {error.message}
            </div>
          )}
        </div>

        <div className="modal-actions">
          {isAddingNetwork ? (
            <button
              className="primary-btn"
              onClick={handleAddNetwork}
              disabled={isPending}
            >
              {isPending ? 'ADDING...' : 'ADD CELO NETWORK'}
            </button>
          ) : (
            <button
              className="primary-btn"
              onClick={handleSwitchChain}
              disabled={isPending}
            >
              {isPending ? 'SWITCHING...' : 'SWITCH TO CELO'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// Extend window type for ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}
