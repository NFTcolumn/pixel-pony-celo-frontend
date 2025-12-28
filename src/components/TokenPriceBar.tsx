import React, { useEffect, useState } from "react";

type PriceData = {
  ponyPrice?: number;
  celoPrice?: number;
  error?: string;
};

// Uniswap V3 Pool ABI (just the functions we need)
const UNISWAP_V3_POOL_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'slot0',
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' }
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

// Uniswap V3 Factory ABI
const UNISWAP_V3_FACTORY_ABI = [
  {
    constant: true,
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' }
    ],
    name: 'getPool',
    outputs: [{ name: 'pool', type: 'address' }],
    type: 'function'
  }
] as const;

async function fetchPonyPrice(celoPrice?: number): Promise<number | null> {
  try {
    const PONY_TOKEN = '0x000BE46901ea6f7ac2c1418D158f2f0A80992c07';
    const CELO_TOKEN = '0x471EcE3750Da237f93B8E339c536989b8978a438';
    const UNISWAP_V3_FACTORY = '0x67FEa58D5a5a4162cED847E13c2c81c73bf8aeC4';
    const CELO_RPC = 'https://forno.celo.org';

    // Try common fee tiers: 0.05%, 0.3%, 1%
    const feeTiers = [500, 3000, 10000];
    let poolAddress: string | null = null;

    // Find which pool exists
    for (const fee of feeTiers) {
      // Encode getPool(token0, token1, fee)
      const feeHex = fee.toString(16).padStart(6, '0');
      const data = '0x1698ee82' +
        PONY_TOKEN.slice(2).padStart(64, '0') +
        CELO_TOKEN.slice(2).padStart(64, '0') +
        feeHex.padStart(64, '0');

      const response = await fetch(CELO_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to: UNISWAP_V3_FACTORY, data }, 'latest']
        })
      });

      const result = await response.json();
      if (result.result && result.result !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        poolAddress = '0x' + result.result.slice(26);
        console.log(`Found PONY/CELO pool at fee tier ${fee/10000}%:`, poolAddress);
        break;
      }
    }

    if (!poolAddress) {
      console.error('No PONY/CELO Uniswap V3 pool found');
      return null;
    }

    // Get slot0 to get sqrtPriceX96
    const slot0Response = await fetch(CELO_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'eth_call',
        params: [{ to: poolAddress, data: '0x3850c7bd' }, 'latest'] // slot0()
      })
    });

    const slot0Data = await slot0Response.json();
    if (!slot0Data.result) {
      console.error('No slot0 data');
      return null;
    }

    // Parse sqrtPriceX96 (first 160 bits / 40 hex chars after 0x)
    const sqrtPriceX96 = BigInt('0x' + slot0Data.result.slice(2, 42));

    // Get token0 to determine order
    const token0Response = await fetch(CELO_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'eth_call',
        params: [{ to: poolAddress, data: '0x0dfe1681' }, 'latest'] // token0()
      })
    });

    const token0Data = await token0Response.json();
    const token0 = '0x' + token0Data.result.slice(26);

    // Calculate price from sqrtPriceX96
    // price = (sqrtPriceX96 / 2^96) ^ 2
    const Q96 = BigInt(2) ** BigInt(96);
    const price = (Number(sqrtPriceX96) / Number(Q96)) ** 2;

    // If token0 is PONY, price is CELO/PONY, so PONY/CELO = 1/price
    // If token0 is CELO, price is PONY/CELO
    let ponyPriceInCelo: number;
    if (token0.toLowerCase() === PONY_TOKEN.toLowerCase()) {
      ponyPriceInCelo = 1 / price;
    } else {
      ponyPriceInCelo = price;
    }

    console.log('PONY price in CELO:', ponyPriceInCelo);

    // Convert to USD if we have CELO price
    if (celoPrice) {
      const ponyPriceUSD = ponyPriceInCelo * celoPrice;
      console.log('PONY price in USD:', ponyPriceUSD);
      return ponyPriceUSD;
    }

    return null;
  } catch (e) {
    console.error('Error fetching PONY price from Uniswap V3:', e);
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
