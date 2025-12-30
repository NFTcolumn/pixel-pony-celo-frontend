import React, { useEffect, useState } from "react";
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import PIXEL_PONY_ABI from '../PixelPonyABI.json';

type PriceData = {
  ponyPrice?: number;
  celoPrice?: number;
  error?: string;
};

const PRICE_API_BASE = 'https://crypto-price-aggregator.onrender.com';
const PONY_TOKEN = '0x000BE46901ea6f7ac2c1418D158f2f0A80992c07';
const CELO_TOKEN = '0x471EcE3750Da237f93B8E339c536989b8978a438';
const PIXEL_PONY_ADDRESS = '0x3e9b5F357326a399aff2988eC501E28C9DD9f3b9';

async function fetchPonyPrice(): Promise<number | null> {
  try {
    const response = await fetch(`${PRICE_API_BASE}/price/${PONY_TOKEN}`);
    if (!response.ok) {
      console.error(`PONY price API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log('PONY price response:', data);

    // Use primary price from the aggregator
    if (data.primaryPrice && data.primaryPrice > 0) {
      return data.primaryPrice;
    }

    // Fallback to average price
    if (data.averagePrice && data.averagePrice > 0) {
      return data.averagePrice;
    }

    console.error('No valid PONY price in response');
    return null;
  } catch (e) {
    console.error('Error fetching PONY price from API:', e);
    return null;
  }
}

async function fetchCeloPrice(): Promise<number | null> {
  try {
    const response = await fetch(`${PRICE_API_BASE}/price/${CELO_TOKEN}`);
    if (!response.ok) {
      console.error(`CELO price API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log('CELO price response:', data);

    // Use primary price from the aggregator
    if (data.primaryPrice && data.primaryPrice > 0) {
      return data.primaryPrice;
    }

    // Fallback to average price
    if (data.averagePrice && data.averagePrice > 0) {
      return data.averagePrice;
    }

    console.error('No valid CELO price in response');
    return null;
  } catch (e) {
    console.error('Error fetching CELO price from API:', e);
    return null;
  }
}

function formatUsd(n?: number) {
  if (n === undefined || Number.isNaN(n)) return "—";

  // For very small numbers, show full decimal notation (not scientific)
  if (n < 0.000001) {
    // Convert to string with enough precision to avoid scientific notation
    const str = n.toFixed(20); // Use high precision
    // Remove trailing zeros
    return `$${str.replace(/\.?0+$/, '')}`;
  }

  // For larger numbers, use appropriate decimal places
  if (n >= 1) return `$${n.toFixed(4)}`;
  if (n >= 0.01) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(10)}`;
}

export default function TokenPriceBar() {
  const [priceData, setPriceData] = useState<PriceData>({});

  // Log component mount
  useEffect(() => {
    console.log('[TokenPriceBar] Component mounted at:', new Date().toISOString());
    return () => {
      console.log('[TokenPriceBar] Component unmounted at:', new Date().toISOString());
    };
  }, []);

  // Read base fee (entry cost in CELO)
  const { data: baseFee } = useReadContract({
    address: PIXEL_PONY_ADDRESS,
    abi: PIXEL_PONY_ABI,
    functionName: 'baseFeeAmount',
    chainId: 42220
  });

  // Read jackpot
  const { data: gameStats } = useReadContract({
    address: PIXEL_PONY_ADDRESS,
    abi: PIXEL_PONY_ABI,
    functionName: 'getGameStats',
    chainId: 42220
  });

  // Calculate values
  const MAX_BET_PONY = 50_000_000_000; // 50 billion PONY
  const firstPlaceReward = priceData.ponyPrice ? (MAX_BET_PONY * 10 * priceData.ponyPrice) : undefined;
  const secondPlaceReward = priceData.ponyPrice ? (MAX_BET_PONY * 2.5 * priceData.ponyPrice) : undefined;
  const thirdPlaceReward = priceData.ponyPrice ? (MAX_BET_PONY * 1 * priceData.ponyPrice) : undefined;

  // Entry fee in USD
  const entryFeeUSD = baseFee && priceData.celoPrice
    ? parseFloat(formatEther(baseFee as bigint)) * priceData.celoPrice
    : undefined;

  // Jackpot in PONY and USD
  const jackpotPONY = gameStats && Array.isArray(gameStats)
    ? (parseFloat(formatEther(gameStats[2])) / 1e9).toFixed(2) + 'B'
    : undefined;
  const jackpotUSD = gameStats && Array.isArray(gameStats) && priceData.ponyPrice
    ? parseFloat(formatEther(gameStats[2])) * priceData.ponyPrice // Don't divide by 1e9, formatEther already converts from wei
    : undefined;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Fetch both prices in parallel from the API
      const [celoPrice, ponyPrice] = await Promise.all([
        fetchCeloPrice(),
        fetchPonyPrice()
      ]);

      if (!cancelled) {
        setPriceData({
          ponyPrice: ponyPrice ?? undefined,
          celoPrice: celoPrice ?? undefined,
          error: !ponyPrice && !celoPrice ? "Failed to load prices" : undefined
        });
      }
    }

    load();

    // refresh every 30s
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        padding: "8px 0",
        background: "#fdfd82",
        color: "#000",
        borderBottom: "2px solid #d4d400",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        overflow: "hidden",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
      className="token-price-bar-container"
    >
      <div
        className="token-price-bar-scroller"
        style={{
          display: "flex",
          whiteSpace: "nowrap",
          width: "max-content", // Force container to fit all content so % transform works correctly
          willChange: "transform",
        }}
        onAnimationIteration={() => {
          console.log('[TokenPriceBar] Animation loop completed at:', new Date().toISOString());
        }}
      >
        {/* Create the full content once, then duplicate it once for seamless loop */}
        {(() => {
          console.log('[TokenPriceBar] Rendering content block at:', new Date().toISOString());

          const quotes = [
            "MARKETS SLEEP, PONIES DON'T.",
            "NEVER STOP RUNNING.",
            "MOVEMENT IS THE ONLY SIGNAL THAT MATTERS.",
            "HOOVES FIRST, HEART SECOND.",
            "PONY PONY PONY.",
            "SOME RACE TO LIVE, SOME LIVE TO RACE.",
            "PONY IS THE PATH.",
            "MOTION IS TRUTH.",
            "WE RUN BECAUSE STANDING STILL FEELS LIKE DYING.",
            "MAKE CRYPTO FUN AGAIN.",
            "PIXEL PONIES DON'T STOP, THEY KEEP GOING."
          ];

          // Build single sequence: prices → quote → prices → quote → ... for all quotes
          console.log(`[TokenPriceBar] Building sequence with ${quotes.length} quotes`);
          const singleSequence = quotes.map((quote, quoteIdx) => {
            // console.log(`[TokenPriceBar] Rendering quote ${quoteIdx + 1}: "${quote}"`);
            return (
              <React.Fragment key={quoteIdx}>
                {/* PONY Price */}
                <span style={{ fontSize: 11, fontWeight: 700, padding: "0 20px" }} data-quote-block={quoteIdx}>
                  PONY {formatUsd(priceData.ponyPrice)}
                </span>

                {/* CELO Price */}
                <span style={{ fontSize: 11, fontWeight: 700 }}>
                  CELO {formatUsd(priceData.celoPrice)}
                </span>

                {/* Separator - uniform padding on both sides */}
                <span style={{ opacity: 0.5, fontSize: 14, fontWeight: 700, padding: "0 10px" }}>•</span>

                {/* Entry Fee */}
                <span style={{ fontSize: 11, fontWeight: 700 }}>
                  🎫 ENTRY: {baseFee ? formatEther(baseFee as bigint) : '1'} CELO
                  {entryFeeUSD ? ` (${formatUsd(entryFeeUSD)})` : ''}
                </span>

                {/* Jackpot */}
                <span style={{ fontSize: 11, fontWeight: 700 }}>
                  🏆 JACKPOT: {jackpotPONY || 'Loading...'} PONY
                  {jackpotUSD ? ` (${formatUsd(jackpotUSD)})` : ''}
                </span>

                {/* Separator - uniform padding on both sides */}
                <span style={{ opacity: 0.5, fontSize: 14, fontWeight: 700, padding: "0 10px" }}>•</span>

                {/* Max Bet Rewards */}
                <span style={{ fontSize: 11, fontWeight: 700 }}>MAX BET REWARDS:</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>
                  🥇 {formatUsd(firstPlaceReward)}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>
                  🥈 {formatUsd(secondPlaceReward)}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>
                  🥉 {formatUsd(thirdPlaceReward)}
                </span>

                {/* Separator - uniform padding on both sides */}
                <span style={{ opacity: 0.5, fontSize: 14, fontWeight: 700, padding: "0 10px" }}>•</span>

                {/* Quote */}
                <span style={{ fontSize: 11, fontWeight: 700, fontStyle: "italic", opacity: 0.85 }} data-quote-id={quoteIdx}>
                  "{quote}"
                </span>

                {/* Separator after quote - uniform padding on both sides */}
                <span style={{ opacity: 0.5, fontSize: 14, fontWeight: 700, padding: "0 10px" }}>•</span>
              </React.Fragment>
            );
          });
          console.log(`[TokenPriceBar] Built singleSequence with ${singleSequence.length} items`);

          // Duplicate the entire sequence for seamless infinite scroll
          // Wrap in divs to avoid duplicate React keys at the top level list
          return (
            <>
              <div>{singleSequence}</div>
              <div>{singleSequence}</div>
            </>
          );
        })()}
      </div>

      <style>{`
        .token-price-bar-scroller {
          animation: scroll-left 120s linear infinite;
        }
        @keyframes scroll-left {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
