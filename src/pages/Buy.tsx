import './Buy.css'

export default function Buy() {
  return (
    <div className="buy-page">
      <section className="buy-section">
        <h2>Buy $PONY</h2>
        <div className="buy-content">
          <p>
            $PONY is the native token for Pixel Ponies racing. Get yours on Celo Mainnet!
          </p>

          <div className="token-address-box">
            <h3>Token Address</h3>
            <code>
              0xde2f957BF8B9459e9E998b98789Af02920404ad8
            </code>
          </div>

          <h3 className="buy-links-title">Where to Buy</h3>
          <div className="buy-links">
            <a
              href="https://app.ubeswap.org/#/swap?outputCurrency=0xde2f957BF8B9459e9E998b98789Af02920404ad8"
              target="_blank"
              rel="noopener noreferrer"
              className="buy-link primary"
            >
              Buy on Ubeswap
            </a>
            <a
              href="https://dexscreener.com/celo/0xde2f957BF8B9459e9E998b98789Af02920404ad8"
              target="_blank"
              rel="noopener noreferrer"
              className="buy-link secondary"
            >
              View on DexScreener
            </a>
          </div>

          <div className="buy-disclaimer">
            <p>Make sure you're on Celo Mainnet network</p>
            <p>Always verify the contract address before buying</p>
          </div>
        </div>
      </section>
    </div>
  )
}
