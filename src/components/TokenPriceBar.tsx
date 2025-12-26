import React, { useEffect, useState } from "react";

type PriceData = {
  ponyPrice?: number;
  celoPrice?: number;
  error?: string;
};

async function fetchPonyPrice(): Promise<number | null> {
  try {
    // Fetch PONY price from DEXScreener
    const url = `https://api.dexscreener.com/token-pairs/v1/celo/0x000BE46901ea6f7ac2c1418D158f2f0A80992c07`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const pairs = await res.json();
    // Find Ubeswap pair with highest liquidity
    const ubeswapPairs = pairs
      .filter((p: any) => p.dexId?.toLowerCase() === 'ubeswap')
      .sort((a: any, b: any) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));

    if (ubeswapPairs.length > 0 && ubeswapPairs[0].priceUsd) {
      return Number(ubeswapPairs[0].priceUsd);
    }
    return null;
  } catch (e) {
    console.error('Error fetching PONY price:', e);
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [ponyPrice, celoPrice] = await Promise.all([
        fetchPonyPrice(),
        fetchCeloPrice()
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
