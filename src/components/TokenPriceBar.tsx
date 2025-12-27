import React, { useEffect, useState } from "react";

type PriceData = {
  ponyPrice?: number;
  celoPrice?: number;
  error?: string;
};

const UBESWAP_PAIR_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'getReserves',
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'blockTimestampLast', type: 'uint32' }
    ],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'token0',
    outputs: [{ name: '', type: 'address' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'token1',
    outputs: [{ name: '', type: 'address' }],
    type: 'function'
  }
] as const;

async function fetchPonyPrice(celoPrice?: number): Promise<number | null> {
  try {
    // Fetch directly from Ubeswap pair contract
    const PONY_CELO_PAIR = '0x0644B3bC14b960907678097F8cE3B16f6721C043'; // Ubeswap PONY/CELO pair
    const PONY_TOKEN = '0x000BE46901ea6f7ac2c1418D158f2f0A80992c07';

    // Create a public RPC provider for Celo
    const CELO_RPC = 'https://forno.celo.org';

    // Fetch reserves from the pair contract
    const reservesResponse = await fetch(CELO_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{
          to: PONY_CELO_PAIR,
          data: '0x0902f1ac' // getReserves()
        }, 'latest']
      })
    });

    const reservesData = await reservesResponse.json();

    if (!reservesData.result) {
      console.error('No reserves data:', reservesData);
      return null;
    }

    // Parse reserves (returns reserve0, reserve1, blockTimestampLast)
    const reserves = reservesData.result;
    const reserve0 = BigInt('0x' + reserves.slice(2, 66));
    const reserve1 = BigInt('0x' + reserves.slice(66, 130));

    // Check which token is token0
    const token0Response = await fetch(CELO_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'eth_call',
        params: [{
          to: PONY_CELO_PAIR,
          data: '0x0dfe1681' // token0()
        }, 'latest']
      })
    });

    const token0Data = await token0Response.json();
    const token0 = '0x' + token0Data.result.slice(26); // Remove padding

    // Calculate price based on reserves
    let ponyReserve: bigint, celoReserve: bigint;

    if (token0.toLowerCase() === PONY_TOKEN.toLowerCase()) {
      ponyReserve = reserve0;
      celoReserve = reserve1;
    } else {
      ponyReserve = reserve1;
      celoReserve = reserve0;
    }

    // Price of PONY in CELO = celoReserve / ponyReserve
    const ponyPriceInCelo = Number(celoReserve) / Number(ponyReserve);

    // If we have CELO price in USD, convert PONY price to USD
    if (celoPrice) {
      const ponyPriceUSD = ponyPriceInCelo * celoPrice;
      console.log('PONY price calculated from on-chain:', ponyPriceUSD);
      return ponyPriceUSD;
    }

    console.log('PONY price in CELO:', ponyPriceInCelo);
    return null; // Need CELO price to get USD price
  } catch (e) {
    console.error('Error fetching PONY price from chain:', e);
    return null;
  }
}

async function fetchCeloPrice(): Promise<number | null> {
  try {
    // Fetch CELO price from DEXScreener using CELO token address
    const url = `https://api.dexscreener.com/token-pairs/v1/celo/0x471EcE3750Da237f93B8E339c536989b8978a438`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const pairs = await res.json();

    // Find pairs with mcUSD, mCUSD, or USDm (Mento stablecoins) which show accurate CELO price
    const celoPairs = pairs
      .filter((p: any) => {
        const baseSymbol = p.baseToken?.symbol?.toUpperCase();
        const quoteSymbol = p.quoteToken?.symbol?.toUpperCase();
        // Look for pairs with Mento stablecoins
        return baseSymbol === 'MCUSD' || baseSymbol === 'MCUSD' || baseSymbol === 'USDM' ||
               quoteSymbol === 'MCUSD' || quoteSymbol === 'MCUSD' || quoteSymbol === 'USDM';
      })
      .sort((a: any, b: any) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));

    if (celoPairs.length > 0 && celoPairs[0].priceUsd) {
      return Number(celoPairs[0].priceUsd);
    }

    return null;
  } catch (e) {
    console.error('Error fetching CELO price:', e);
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
      // Fetch CELO price first
      const celoPrice = await fetchCeloPrice();

      // Then fetch PONY price using CELO price for USD conversion
      const ponyPrice = await fetchPonyPrice(celoPrice ?? undefined);

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
