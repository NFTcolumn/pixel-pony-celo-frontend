import React, { useEffect, useMemo, useState } from "react";

type DexPrice = {
  dex: "Uniswap" | "PancakeSwap" | "QuickSwap" | "Ubeswap";
  chain: "ethereum" | "bsc" | "polygon" | "celo";
  tokenAddress: string;
  priceUsd?: number;
  pairAddress?: string;
  liquidityUsd?: number;
  updatedAt?: number;
  error?: string;
};

type DexScreenerPair = {
  dexId: string; // "uniswap", "pancakeswap", "quickswap", "ubeswap", etc.
  pairAddress: string;
  priceUsd?: string;
  liquidity?: { usd?: number };
};

async function fetchBestPoolPriceUsd(opts: {
  chain: DexPrice["chain"];
  tokenAddress: string;
  wantedDexId: string;
}): Promise<{ priceUsd?: number; pairAddress?: string; liquidityUsd?: number } | null> {
  const { chain, tokenAddress, wantedDexId } = opts;

  // DEXScreener: "Get the pools of a given token address"
  // https://api.dexscreener.com/token-pairs/v1/{chainId}/{tokenAddress}
  const url = `https://api.dexscreener.com/token-pairs/v1/${chain}/${tokenAddress}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`DEXScreener HTTP ${res.status}`);
  }

  const pairs = (await res.json()) as DexScreenerPair[];
  const filtered = pairs
    .filter((p) => (p.dexId || "").toLowerCase() === wantedDexId.toLowerCase())
    .map((p) => ({
      pairAddress: p.pairAddress,
      priceUsd: p.priceUsd ? Number(p.priceUsd) : undefined,
      liquidityUsd: p.liquidity?.usd ?? undefined,
    }))
    // pick the most liquid pool (usually the "main" price)
    .sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0));

  return filtered[0] ?? null;
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
  // Token is only on Celo via Ubeswap for now
  const configs = useMemo<DexPrice[]>(
    () => [
      {
        dex: "Ubeswap",
        chain: "celo",
        tokenAddress: "0x000BE46901ea6f7ac2c1418D158f2f0A80992c07",
      },
    ],
    []
  );

  const [rows, setRows] = useState<DexPrice[]>(configs);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const next = await Promise.all(
        configs.map(async (c) => {
          try {
            const wantedDexId =
              c.dex === "Uniswap"
                ? "uniswap"
                : c.dex === "PancakeSwap"
                ? "pancakeswap"
                : c.dex === "QuickSwap"
                ? "quickswap"
                : "ubeswap";

            const best = await fetchBestPoolPriceUsd({
              chain: c.chain,
              tokenAddress: c.tokenAddress,
              wantedDexId,
            });

            return {
              ...c,
              priceUsd: best?.priceUsd,
              pairAddress: best?.pairAddress,
              liquidityUsd: best?.liquidityUsd,
              updatedAt: Date.now(),
              error: best?.priceUsd ? undefined : "No price found for this DEX (check token address / liquidity).",
            } satisfies DexPrice;
          } catch (e: any) {
            return {
              ...c,
              error: e?.message ?? "Failed to load",
              updatedAt: Date.now(),
            } satisfies DexPrice;
          }
        })
      );

      if (!cancelled) setRows(next);
    }

    load();

    // refresh every 30s
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [configs]);

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
        <div style={{ fontWeight: 700, letterSpacing: 0.2 }}>PONY Price</div>

        {rows.map((r) => (
          <div
            key={`${r.dex}-${r.chain}`}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "baseline",
              padding: "6px 10px",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 999,
            }}
            title={
              r.pairAddress
                ? `Pair: ${r.pairAddress}\nLiquidity (USD): ${r.liquidityUsd ?? "—"}`
                : r.error ?? ""
            }
          >
            <span style={{ opacity: 0.85, fontSize: 12 }}>{r.dex}</span>
            <span style={{ fontWeight: 800 }}>{formatUsd(r.priceUsd)}</span>
            <span style={{ opacity: 0.6, fontSize: 12 }}>{r.chain}</span>
          </div>
        ))}
      </div>

      {/* Optional: show errors (comment out if you want it super clean) */}
      {rows.some((r) => r.error) && (
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
          Note: Some DEX prices may show "—" if the token address is wrong for that chain or there's no liquid pool.
        </div>
      )}
    </div>
  );
}
