export default function Privacy() {
  return (
    <div className="container">
      <div style={{ background: '#bdc3ff', border: '2px solid #9999cc', padding: '24px', marginBottom: '24px' }}>
        <h1 style={{ textAlign: 'center', fontSize: '16px', marginBottom: '8px' }}>PRIVACY POLICY</h1>
        <p style={{ textAlign: 'center', fontSize: '8px', marginBottom: '24px', color: '#666666' }}>
          LAST UPDATED: JANUARY 2025
        </p>

        {/* Introduction */}
        <section style={{ marginBottom: '24px', background: '#9999cc', padding: '16px', border: '2px solid #7777aa' }}>
          <h2 style={{ fontSize: '12px', marginBottom: '12px', color: '#ffffff' }}>1. Introduction</h2>
          <p style={{ fontSize: '8px', lineHeight: '1.8', color: '#ffffff' }}>
            This Privacy Policy describes how Pixel Ponies ("we," "our," or "us") collects, uses, and protects information when you use our decentralized application and related services.
          </p>
          <p style={{ fontSize: '8px', lineHeight: '1.8', marginTop: '12px', color: '#ffffff' }}>
            We are committed to protecting your privacy and ensuring transparency about our data practices. This policy explains what data we collect, how we use it, and your rights regarding your information.
          </p>
        </section>

        {/* Data Collection */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '12px', marginBottom: '12px', color: '#ff6b6b' }}>2. Information We Collect</h2>

          <h3 style={{ fontSize: '10px', marginBottom: '8px' }}>2.1 Blockchain Data</h3>
          <p style={{ fontSize: '8px', lineHeight: '1.8', marginBottom: '8px' }}>
            As a blockchain-based application, certain information is inherently public and recorded on the blockchain:
          </p>
          <ul style={{ fontSize: '8px', lineHeight: '1.8', marginLeft: '20px' }}>
            <li>Wallet addresses</li>
            <li>Transaction hashes and amounts</li>
            <li>Betting activities and race participation</li>
            <li>Token balances and transfers</li>
          </ul>

          <h3 style={{ fontSize: '10px', margin: '16px 0 8px' }}>2.2 Technical Information</h3>
          <ul style={{ fontSize: '8px', lineHeight: '1.8', marginLeft: '20px' }}>
            <li>IP address (temporarily for rate limiting)</li>
            <li>Browser type and version</li>
            <li>Device information</li>
            <li>Usage analytics (anonymized)</li>
          </ul>

          <h3 style={{ fontSize: '10px', margin: '16px 0 8px' }}>2.3 Voluntary Information</h3>
          <p style={{ fontSize: '8px', lineHeight: '1.8' }}>
            We do not require personal information to use our service. Any information you choose to share (such as in community channels) is voluntary.
          </p>
        </section>

        {/* Data Usage */}
        <section style={{ marginBottom: '24px', background: '#9999cc', padding: '16px', border: '2px solid #7777aa' }}>
          <h2 style={{ fontSize: '12px', marginBottom: '12px', color: '#ffffff' }}>3. How We Use Information</h2>

          <h3 style={{ fontSize: '10px', marginBottom: '8px', color: '#ffffff' }}>3.1 Service Operation</h3>
          <ul style={{ fontSize: '8px', lineHeight: '1.8', marginLeft: '20px', color: '#ffffff' }}>
            <li>Process betting transactions</li>
            <li>Calculate race results and payouts</li>
            <li>Maintain jackpot and lottery systems</li>
            <li>Ensure fair play and prevent abuse</li>
          </ul>

          <h3 style={{ fontSize: '10px', margin: '16px 0 8px', color: '#ffffff' }}>3.2 Service Improvement</h3>
          <ul style={{ fontSize: '8px', lineHeight: '1.8', marginLeft: '20px', color: '#ffffff' }}>
            <li>Analyze usage patterns (anonymized)</li>
            <li>Identify and fix technical issues</li>
            <li>Optimize user experience</li>
            <li>Develop new features</li>
          </ul>

          <h3 style={{ fontSize: '10px', margin: '16px 0 8px', color: '#ffffff' }}>3.3 Security and Compliance</h3>
          <ul style={{ fontSize: '8px', lineHeight: '1.8', marginLeft: '20px', color: '#ffffff' }}>
            <li>Detect fraudulent activities</li>
            <li>Prevent system abuse</li>
            <li>Comply with legal requirements</li>
            <li>Protect user assets and data</li>
          </ul>
        </section>

        {/* Data Sharing */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '12px', marginBottom: '12px', color: '#ff6b6b' }}>4. Information Sharing</h2>

          <h3 style={{ fontSize: '10px', marginBottom: '8px' }}>4.1 No Sale of Personal Data</h3>
          <p style={{ fontSize: '8px', lineHeight: '1.8' }}>
            We do not sell, rent, or trade personal information to third parties for their commercial purposes.
          </p>

          <h3 style={{ fontSize: '10px', margin: '16px 0 8px' }}>4.2 Service Providers</h3>
          <p style={{ fontSize: '8px', lineHeight: '1.8', marginBottom: '8px' }}>
            We may share anonymized technical data with service providers who help us:
          </p>
          <ul style={{ fontSize: '8px', lineHeight: '1.8', marginLeft: '20px' }}>
            <li>Host and maintain our infrastructure</li>
            <li>Analyze usage patterns</li>
            <li>Provide security services</li>
            <li>Improve user experience</li>
          </ul>

          <h3 style={{ fontSize: '10px', margin: '16px 0 8px' }}>4.3 Legal Requirements</h3>
          <p style={{ fontSize: '8px', lineHeight: '1.8' }}>
            We may disclose information when required by law, court order, or government regulation, or to protect our rights and the safety of our users.
          </p>

          <h3 style={{ fontSize: '10px', margin: '16px 0 8px' }}>4.4 Blockchain Transparency</h3>
          <p style={{ fontSize: '8px', lineHeight: '1.8' }}>
            Remember that blockchain transactions are inherently public and can be viewed by anyone on the network.
          </p>
        </section>

        {/* Data Protection */}
        <section style={{ marginBottom: '24px', background: '#9999cc', padding: '16px', border: '2px solid #7777aa' }}>
          <h2 style={{ fontSize: '12px', marginBottom: '12px', color: '#ffffff' }}>5. Data Protection</h2>

          <h3 style={{ fontSize: '10px', marginBottom: '8px', color: '#ffffff' }}>5.1 Security Measures</h3>
          <ul style={{ fontSize: '8px', lineHeight: '1.8', marginLeft: '20px', color: '#ffffff' }}>
            <li>Encrypted data transmission (HTTPS)</li>
            <li>Secure server infrastructure</li>
            <li>Regular security audits</li>
            <li>Access controls and authentication</li>
          </ul>

          <h3 style={{ fontSize: '10px', margin: '16px 0 8px', color: '#ffffff' }}>5.2 Data Minimization</h3>
          <p style={{ fontSize: '8px', lineHeight: '1.8', color: '#ffffff' }}>
            We collect only the minimum data necessary to provide our services and delete unnecessary data regularly.
          </p>

          <h3 style={{ fontSize: '10px', margin: '16px 0 8px', color: '#ffffff' }}>5.3 Your Wallet Security</h3>
          <p style={{ fontSize: '8px', lineHeight: '1.8', color: '#ffffff' }}>
            Your wallet and private keys remain under your control. We cannot access your wallet or funds - only you have that responsibility and power.
          </p>
        </section>

        {/* User Rights */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '12px', marginBottom: '12px', color: '#ff6b6b' }}>6. Your Rights</h2>

          <h3 style={{ fontSize: '10px', marginBottom: '8px' }}>6.1 Access and Portability</h3>
          <p style={{ fontSize: '8px', lineHeight: '1.8' }}>
            Most of your data is already accessible on the blockchain. You can export your transaction history at any time.
          </p>

          <h3 style={{ fontSize: '10px', margin: '16px 0 8px' }}>6.2 Correction</h3>
          <p style={{ fontSize: '8px', lineHeight: '1.8' }}>
            While blockchain data cannot be altered, you can contact us to correct any off-chain information we may have about you.
          </p>

          <h3 style={{ fontSize: '10px', margin: '16px 0 8px' }}>6.3 Deletion</h3>
          <p style={{ fontSize: '8px', lineHeight: '1.8' }}>
            You can stop using our service at any time. Note that blockchain transactions are permanent and cannot be deleted.
          </p>

          <h3 style={{ fontSize: '10px', margin: '16px 0 8px' }}>6.4 Opt-out</h3>
          <p style={{ fontSize: '8px', lineHeight: '1.8' }}>
            You can disconnect your wallet and stop interacting with our smart contracts at any time.
          </p>
        </section>

        {/* Cookies */}
        <section style={{ marginBottom: '24px', background: '#9999cc', padding: '16px', border: '2px solid #7777aa' }}>
          <h2 style={{ fontSize: '12px', marginBottom: '12px', color: '#ffffff' }}>7. Cookies and Tracking</h2>

          <h3 style={{ fontSize: '10px', marginBottom: '8px', color: '#ffffff' }}>7.1 Essential Cookies</h3>
          <p style={{ fontSize: '8px', lineHeight: '1.8', marginBottom: '8px', color: '#ffffff' }}>
            We use minimal essential cookies and local storage to:
          </p>
          <ul style={{ fontSize: '8px', lineHeight: '1.8', marginLeft: '20px', color: '#ffffff' }}>
            <li>Remember your wallet connection</li>
            <li>Store user preferences</li>
            <li>Maintain session state</li>
            <li>Prevent spam and abuse</li>
          </ul>

          <h3 style={{ fontSize: '10px', margin: '16px 0 8px', color: '#ffffff' }}>7.2 Analytics</h3>
          <p style={{ fontSize: '8px', lineHeight: '1.8', color: '#ffffff' }}>
            We may use privacy-focused analytics tools that don't track individual users or store personal data.
          </p>

          <h3 style={{ fontSize: '10px', margin: '16px 0 8px', color: '#ffffff' }}>7.3 Your Control</h3>
          <p style={{ fontSize: '8px', lineHeight: '1.8', color: '#ffffff' }}>
            You can disable cookies in your browser settings, though this may affect some functionality.
          </p>
        </section>

        {/* Children's Privacy */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '12px', marginBottom: '12px', color: '#ff6b6b' }}>8. Children's Privacy</h2>
          <p style={{ fontSize: '8px', lineHeight: '1.8' }}>
            Our service is not intended for children under 18. We do not knowingly collect information from children. If you believe a child has provided us with personal information, please contact us immediately.
          </p>
        </section>

        {/* International Users */}
        <section style={{ marginBottom: '24px', background: '#9999cc', padding: '16px', border: '2px solid #7777aa' }}>
          <h2 style={{ fontSize: '12px', marginBottom: '12px', color: '#ffffff' }}>9. International Users</h2>
          <p style={{ fontSize: '8px', lineHeight: '1.8', color: '#ffffff' }}>
            Our service may be accessed globally, but users must comply with their local laws. Data may be processed in different jurisdictions.
          </p>
          <p style={{ fontSize: '8px', lineHeight: '1.8', marginTop: '12px', color: '#ffffff' }}>
            If you're in the EU, you have additional rights under GDPR. Contact us for more information about exercising these rights.
          </p>
        </section>

        {/* Changes */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '12px', marginBottom: '12px', color: '#ff6b6b' }}>10. Changes to This Policy</h2>
          <p style={{ fontSize: '8px', lineHeight: '1.8' }}>
            We may update this Privacy Policy from time to time. We will notify users of significant changes through our official channels or by updating the "Last Updated" date.
          </p>
          <p style={{ fontSize: '8px', lineHeight: '1.8', marginTop: '12px' }}>
            Your continued use of the service after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <a href="/" style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#ff6b6b',
            color: '#ffffff',
            textDecoration: 'none',
            border: '2px solid #d32f2f',
            fontSize: '10px',
            fontWeight: 'bold'
          }}>
            🏁 BACK TO RACING 🏁
          </a>
        </div>

        <div style={{ marginTop: '24px', fontSize: '6px', color: '#666666', textAlign: 'center' }}>
          Last updated: January 2025
        </div>
      </div>
    </div>
  )
}
