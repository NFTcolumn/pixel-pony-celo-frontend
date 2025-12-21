import { useRef, useEffect, useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import PONYPVP_ABI from '../../PonyPvPABI.json'

const PONYPVP_ADDRESS = '0x739331647Fa2dBefe2c7A2E453A26Ee9f4a9965A'

interface RaceOverlayProps {
  isOpen: boolean
  winners: number[]
  myHorses: number[]
  matchId: string
  onClose: () => void
}

export default function RaceOverlay({ isOpen, winners, myHorses, matchId, onClose }: RaceOverlayProps) {
  const trackInnerRef = useRef<HTMLDivElement>(null)
  const [isClaiming, setIsClaiming] = useState(false)
  const [hasClaimed, setHasClaimed] = useState(false)

  const { writeContract, data: claimHash } = useWriteContract()
  const { isSuccess: claimConfirmed } = useWaitForTransactionReceipt({ hash: claimHash })

  const handleClaimWinnings = async () => {
    if (isClaiming || hasClaimed) return

    try {
      setIsClaiming(true)
      await writeContract({
        address: PONYPVP_ADDRESS,
        abi: PONYPVP_ABI,
        functionName: 'claimWinnings',
        args: [matchId as `0x${string}`],
        chainId: 42220
      })
    } catch (error) {
      console.error('Error claiming winnings:', error)
      setIsClaiming(false)
    }
  }

  useEffect(() => {
    if (claimConfirmed) {
      setHasClaimed(true)
      setIsClaiming(false)
    }
  }, [claimConfirmed])

  useEffect(() => {
    if (!isOpen || winners.length === 0) return

    const animateRace = (): Promise<void> => {
      return new Promise((resolve) => {
        const trackContainer = trackInnerRef.current
        if (!trackContainer) {
          resolve()
          return
        }

        const trackWidth = trackContainer.offsetWidth
        const duration = 6000
        const startPosition = 35
        const finishPosition = trackWidth - 70
        const raceDistance = finishPosition - startPosition

        const horseSpeeds = Array(16).fill(0).map(() => 1.0 + Math.random() * 0.2)

        // Set winner speeds
        winners.forEach((winnerId, index) => {
          if (index === 0) horseSpeeds[winnerId] = 1.5
          else if (index === 1) horseSpeeds[winnerId] = 1.4
          else if (index === 2) horseSpeeds[winnerId] = 1.3
        })

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

            const announcement = document.getElementById('raceAnnouncement')
            if (announcement) {
              const myWinningHorses = winners.filter(w => myHorses.includes(w))
              const didIWin = myWinningHorses.length > 0

              announcement.innerHTML = `
                RACE COMPLETE!<br>
                <div style="margin-top: 15px; font-size: 18px;">
                  Winners:<br>
                  🥇 Pony #${winners[0] + 1}<br>
                  🥈 Pony #${winners[1] + 1}<br>
                  🥉 Pony #${winners[2] + 1}
                </div>
                <div style="margin-top: 15px; font-size: 24px; font-weight: bold; color: ${didIWin ? '#4ade80' : '#f87171'};">
                  ${didIWin
                    ? `🎉 YOU WON! 🎉<br><div style="font-size: 14px; margin-top: 10px;">Your winning horses: ${myWinningHorses.map(h => `#${h + 1}`).join(', ')}</div><div style="font-size: 12px; margin-top: 10px; color: #666;">Claiming your winnings...</div>`
                    : '😢 YOU LOST!<br><div style="font-size: 14px; margin-top: 10px;">Better luck next time!</div>'}
                </div>
              `
              announcement.style.display = 'block'
            }

            // Auto-claim winnings if I won
            setTimeout(() => {
              const myWinningHorses = winners.filter(w => myHorses.includes(w))
              if (myWinningHorses.length > 0) {
                handleClaimWinnings()
              }
              resolve()
            }, 1000)
          }
        }, 50)
      })
    }

    animateRace()
  }, [isOpen, winners, myHorses])

  if (!isOpen) return null

  return (
    <div className={`track-container ${isOpen ? 'active' : ''}`}>
      <div className="track-inner" ref={trackInnerRef}>
        <button className="track-close" onClick={onClose}>
          CLOSE
        </button>
        <div className="race-announcement" id="raceAnnouncement"></div>
        {Array.from({ length: 16 }, (_, i) => {
          const spriteNum = (i % 30) + 1
          const isMyHorse = myHorses.includes(i)
          return (
            <div key={i} className="track-lane">
              <span className="lane-number">#{i + 1}</span>
              <img
                id={`racer-${i}`}
                src={`/sprites/${spriteNum}.png`}
                className={`horse-racer ${isMyHorse ? 'player-horse' : ''}`}
                alt={`Racer ${i + 1}`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
