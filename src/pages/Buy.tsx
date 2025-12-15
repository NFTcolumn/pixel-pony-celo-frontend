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
              0x000BE46901ea6f7ac2c1418D158f2f0A80992c07
            </code>
          </div>

          <h3 className="buy-links-title">Where to Buy</h3>
          <div className="buy-links">
            <a
              href="https://app.ubeswap.org/#/swap?outputCurrency=0x000BE46901ea6f7ac2c1418D158f2f0A80992c07"
              target="_blank"
              rel="noopener noreferrer"
              className="buy-link primary"
            >
              Buy on Ubeswap
            </a>
            <a
              href="https://dexscreener.com/celo/0x000BE46901ea6f7ac2c1418D158f2f0A80992c07"
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
