import React, { useEffect, useState } from "react";

type PriceData = {
  ponyPrice?: number;
  celoPrice?: number;
  error?: string;
};

const PRICE_API_BASE = 'https://crypto-price-aggregator.onrender.com';
const PONY_TOKEN = '0x000BE46901ea6f7ac2c1418D158f2f0A80992c07';
const CELO_TOKEN = '0x471EcE3750Da237f93B8E339c536989b8978a438';

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

  // Calculate max bet rewards in USD
  const MAX_BET_PONY = 50_000_000_000; // 50 billion PONY
  const firstPlaceReward = priceData.ponyPrice ? (MAX_BET_PONY * 10 * priceData.ponyPrice) : undefined;
  const secondPlaceReward = priceData.ponyPrice ? (MAX_BET_PONY * 2.5 * priceData.ponyPrice) : undefined;
  const thirdPlaceReward = priceData.ponyPrice ? (MAX_BET_PONY * 1 * priceData.ponyPrice) : undefined;

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
        padding: "10px 14px",
        background: "rgba(10,10,10,0.92)",
        backdropFilter: "blur(8px)",
        color: "#fff",
        borderBottom: "1px solid rgba(255,255,255,0.10)",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        {/* PONY Price */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "baseline",
            padding: "6px 10px",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 999,
          }}
        >
          <span style={{ opacity: 0.85, fontSize: 12 }}>PONY</span>
          <span style={{ fontWeight: 800 }}>{formatUsd(priceData.ponyPrice)}</span>
          <span style={{ opacity: 0.6, fontSize: 12 }}>USD</span>
        </div>

        {/* CELO Price */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "baseline",
            padding: "6px 10px",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 999,
          }}
        >
          <span style={{ opacity: 0.85, fontSize: 12 }}>CELO</span>
          <span style={{ fontWeight: 800 }}>{formatUsd(priceData.celoPrice)}</span>
          <span style={{ opacity: 0.6, fontSize: 12 }}>USD</span>
        </div>

        {/* Separator */}
        <div style={{ opacity: 0.3, fontSize: 12 }}>|</div>

        {/* Max Bet Rewards */}
        <div style={{ opacity: 0.85, fontSize: 12, fontWeight: 600 }}>Max Bet Rewards:</div>

        {/* 1st Place */}
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "baseline",
            padding: "6px 10px",
            border: "1px solid rgba(255,215,0,0.3)",
            borderRadius: 999,
            background: "rgba(255,215,0,0.05)",
          }}
        >
          <span style={{ fontSize: 12 }}>🥇</span>
          <span style={{ fontWeight: 800, color: "#ffd700" }}>{formatUsd(firstPlaceReward)}</span>
        </div>

        {/* 2nd Place */}
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "baseline",
            padding: "6px 10px",
            border: "1px solid rgba(192,192,192,0.3)",
            borderRadius: 999,
            background: "rgba(192,192,192,0.05)",
          }}
        >
          <span style={{ fontSize: 12 }}>🥈</span>
          <span style={{ fontWeight: 800, color: "#c0c0c0" }}>{formatUsd(secondPlaceReward)}</span>
        </div>

        {/* 3rd Place */}
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "baseline",
            padding: "6px 10px",
            border: "1px solid rgba(205,127,50,0.3)",
            borderRadius: 999,
            background: "rgba(205,127,50,0.05)",
          }}
        >
          <span style={{ fontSize: 12 }}>🥉</span>
          <span style={{ fontWeight: 800, color: "#cd7f32" }}>{formatUsd(thirdPlaceReward)}</span>
        </div>
      </div>

      {/* Show error if prices fail to load */}
      {priceData.error && (
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
          {priceData.error}
        </div>
      )}
    </div>
  );
}
