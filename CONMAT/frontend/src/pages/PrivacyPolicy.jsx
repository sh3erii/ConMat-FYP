import { Link } from 'react-router-dom';
import InformationPageLayout from '../components/common/InformationPageLayout';

const contents = [
  ['information-we-collect', 'Information we collect'],
  ['how-we-use-information', 'How we use it'],
  ['payments-and-payouts', 'Payments and payouts'],
  ['sharing', 'How information is shared'],
  ['browser-storage', 'Browser storage'],
  ['retention', 'Data retention'],
  ['security', 'Security'],
  ['your-choices', 'Your choices'],
  ['children', 'Children'],
  ['updates-and-contact', 'Updates and contact'],
];

export default function PrivacyPolicy() {
  return (
    <InformationPageLayout
      eyebrow="Your Data at ConMat"
      title="Privacy built around"
      accent="trusted procurement."
      description="This policy explains what ConMat collects when buyers and construction-material businesses use the marketplace, why we use it and the choices available to you."
      metaLabel="Last updated"
      metaValue="4 September 2026"
    >
      <div className="information-document">
        <aside className="information-toc">
          <h2>On this page</h2>
          <nav aria-label="Privacy policy contents">
            {contents.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
          </nav>
        </aside>

        <article className="information-document__body">
          <div className="information-summary">
            <strong>In plain language</strong>
            <p>
              ConMat uses account, verification, marketplace, order and payment information to operate a safer
              construction-material marketplace. We do not sell your personal information, and card details are
              handled through Stripe rather than stored as full card numbers by ConMat.
            </p>
          </div>

          <section id="information-we-collect" className="information-section">
            <h2>1. Information we collect</h2>
            <h3>Account and contact information</h3>
            <p>
              When you register, we collect information such as your name, email address, phone number, password,
              account role and address details. Your password is stored in hashed form rather than readable text.
            </p>

            <h3>Business verification information</h3>
            <p>
              Supplier, wholesaler and retailer accounts may provide a company name, CNIC, live selfie, CNIC image,
              NTN document, business approval material, construction-material focus and live business location.
              Administrators use these details to review business accounts and help reduce fraud. Verification means
              the account passed ConMat&apos;s current review process; it is not a guarantee of a seller or its products.
            </p>

            <h3>Marketplace and transaction information</h3>
            <ul>
              <li>Product listings, photographs, descriptions, pricing, stock, minimum quantities and location.</li>
              <li>Cart contents, orders, shipping address, contact phone, delivery status and invoice information.</li>
              <li>Bulk purchase requests, supplier bids, accepted offers and communications attached to those workflows.</li>
              <li>Reports, support requests, delivery issues, moderation records and notification preferences.</li>
            </ul>

            <h3>Technical and security information</h3>
            <p>
              We may record IP address, device or browser information, sign-in and account-security events, approximate
              location based on information you provide, and timestamps. Business live coordinates are collected only
              when you submit or update them through the verification or profile workflow.
            </p>
          </section>

          <section id="how-we-use-information" className="information-section">
            <h2>2. How we use information</h2>
            <p>We use the information described above to:</p>
            <ul>
              <li>Create accounts, verify email addresses and authenticate users.</li>
              <li>Review business accounts and display approved marketplace listings.</li>
              <li>Process carts, orders, deliveries, invoices, bids, payments and seller payout records.</li>
              <li>Send order, bid, payment, invoice, verification, security and administrative notifications.</li>
              <li>Prevent abuse, investigate reports, keep security logs and enforce our Terms.</li>
              <li>Provide dashboards and marketplace analytics based on real activity in the platform.</li>
              <li>Maintain, troubleshoot and improve ConMat&apos;s reliability and user experience.</li>
              <li>Meet legal, accounting, dispute-resolution and regulatory obligations.</li>
            </ul>
          </section>

          <section id="payments-and-payouts" className="information-section">
            <h2>3. Payments, invoices and seller payouts</h2>
            <p>
              Card checkout is provided through Stripe. Stripe receives the card and payment information needed to
              authorize and process the transaction under its own privacy terms. ConMat receives transaction details
              such as payment status, amount and payment or charge references so we can confirm an order and generate
              its invoice.
            </p>
            <p>
              Sellers may add a supported wallet or bank payout method. ConMat stores the provider, account title and
              an encrypted account identifier; interfaces expose only limited destination information such as the last
              four characters. We also keep a payout ledger showing gross proceeds, ConMat&apos;s 1% commission, net
              proceeds, release status and processor references.
            </p>
          </section>

          <section id="sharing" className="information-section">
            <h2>4. How information is shared</h2>
            <p>We share information only as needed to operate the marketplace, including:</p>
            <ul>
              <li><strong>Between transaction parties:</strong> sellers receive the buyer and delivery details needed to fulfil an order, while buyers receive relevant seller, listing and fulfilment information.</li>
              <li><strong>Service providers:</strong> payment, payout, email, file storage, hosting, database, security and support providers process information on our behalf.</li>
              <li><strong>Legal and safety purposes:</strong> we may disclose information where required by law or reasonably necessary to protect users, ConMat, the public or the integrity of the marketplace.</li>
              <li><strong>Business changes:</strong> information may be transferred as part of a merger, financing, acquisition or sale of all or part of the service, subject to appropriate protections.</li>
            </ul>
            <p>
              Public listing and seller-profile information can be viewed by marketplace visitors. Verification
              documents, full CNIC details and private payout identifiers are not part of the public seller profile.
            </p>
          </section>

          <section id="browser-storage" className="information-section">
            <h2>5. Browser storage and similar technology</h2>
            <p>
              ConMat uses your browser&apos;s local storage to keep you signed in and preserve your cart and checkout state.
              This can include an authentication token, basic signed-in user information, cart items, a checkout token
              and a pending order reference. Signing out removes authentication information; clearing site data in your
              browser can also remove locally stored cart and session information.
            </p>
            <p>
              Essential storage is necessary for the current service to work. If ConMat later introduces non-essential
              analytics or advertising cookies, this policy and any required consent controls should be updated first.
            </p>
          </section>

          <section id="retention" className="information-section">
            <h2>6. How long we keep information</h2>
            <p>
              We retain personal information for as long as reasonably needed to provide your account and marketplace
              services. Transaction, invoice, payout, security, verification and dispute records may be kept longer to
              satisfy legal, tax, accounting, fraud-prevention and recordkeeping needs. When information is no longer
              required, we take reasonable steps to delete or anonymize it, subject to backups and legal obligations.
            </p>
          </section>

          <section id="security" className="information-section">
            <h2>7. How we protect information</h2>
            <p>
              ConMat uses safeguards appropriate to the information it handles, including hashed passwords, role-based
              access, authenticated API routes, limited public profile fields, payment verification and encryption of
              stored payout account identifiers. No online service can guarantee absolute security, so you should use a
              strong unique password, protect your device and notify us promptly about suspicious account activity.
            </p>
          </section>

          <section id="your-choices" className="information-section">
            <h2>8. Your choices and requests</h2>
            <ul>
              <li>Review and update available profile, business-location and notification settings in your account.</li>
              <li>Sign out or clear ConMat&apos;s site data through your browser.</li>
              <li>Request access to, correction of or deletion of personal information by contacting us.</li>
              <li>Object to or ask questions about how we use your information.</li>
            </ul>
            <p>
              We may need to verify your identity before completing a request. Some information cannot be deleted
              immediately where retention is required for transactions, disputes, fraud prevention or law.
            </p>
          </section>

          <section id="children" className="information-section">
            <h2>9. Children&apos;s privacy</h2>
            <p>
              ConMat is a construction procurement marketplace intended for adults and authorized business users. It is
              not directed to children under 18, and we do not knowingly collect their personal information. Contact us
              if you believe a child has provided information to ConMat.
            </p>
          </section>

          <section id="updates-and-contact" className="information-section">
            <h2>10. Policy updates and contact</h2>
            <p>
              We may update this policy when ConMat&apos;s services, providers or legal obligations change. The revised
              version will show a new “Last updated” date, and material changes may also be communicated through the
              service or by email where appropriate.
            </p>
            <p>
              For privacy questions or requests, email <a href="mailto:conmatpk@gmail.com">conmatpk@gmail.com</a>, call
              {' '}<a href="tel:+923183448040">+92 318 3448040</a>, or use our <Link to="/contact">Contact page</Link>.
            </p>
          </section>
        </article>
      </div>
    </InformationPageLayout>
  );
}
