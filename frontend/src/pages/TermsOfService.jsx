import { Link } from 'react-router-dom';
import InformationPageLayout from '../components/common/InformationPageLayout';

const contents = [
  ['acceptance', 'Acceptance and eligibility'],
  ['accounts', 'Accounts and verification'],
  ['marketplace-role', 'ConMat’s role'],
  ['listings-and-orders', 'Listings and orders'],
  ['payments', 'Payments and invoices'],
  ['seller-payouts', 'Seller payouts'],
  ['delivery-and-issues', 'Delivery and issues'],
  ['bulk-bidding', 'Bulk bidding'],
  ['prohibited-use', 'Prohibited use'],
  ['content', 'Content and intellectual property'],
  ['suspension', 'Moderation and suspension'],
  ['disclaimers', 'Disclaimers and liability'],
  ['general', 'General terms'],
];

export default function TermsOfService() {
  return (
    <InformationPageLayout
      eyebrow="Marketplace Agreement"
      title="Terms for building business"
      accent="with confidence."
      description="These Terms govern access to ConMat by customers, retailers, wholesalers, suppliers and administrators, including marketplace orders, bulk bids, payments and seller payouts."
      metaLabel="Effective date"
      metaValue="4 September 2026"
    >
      <div className="information-document">
        <aside className="information-toc">
          <h2>On this page</h2>
          <nav aria-label="Terms contents">
            {contents.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
          </nav>
        </aside>

        <article className="information-document__body">
          <div className="information-summary">
            <strong>Important</strong>
            <p>
              ConMat provides the marketplace and transaction tools. Buyers and sellers remain responsible for the
              accuracy of their information, product specifications, lawful trade, delivery commitments and inspection
              of construction materials. These Terms should be read with our Privacy Policy.
            </p>
          </div>

          <section id="acceptance" className="information-section">
            <h2>1. Acceptance and eligibility</h2>
            <p>
              By accessing ConMat, creating an account, listing a product, submitting a bid or placing an order, you
              agree to these Terms and our <Link to="/privacy">Privacy Policy</Link>. If you use ConMat for a company or
              other organization, you confirm that you have authority to bind that organization.
            </p>
            <p>
              You must be at least 18 years old and legally able to enter contracts. You may use ConMat only where your
              use and the purchase or sale of the relevant construction material are lawful.
            </p>
          </section>

          <section id="accounts" className="information-section">
            <h2>2. Accounts and business verification</h2>
            <ul>
              <li>Provide accurate, current and complete registration, contact, address and business information.</li>
              <li>Keep your password and device secure, and notify ConMat promptly of unauthorized access.</li>
              <li>Use the correct role: Customer, Retailer, Wholesaler or Supplier. Each person or business must not use accounts to evade restrictions.</li>
              <li>Business accounts must submit CNIC information, a live CNIC image, selfie, live business location and either an NTN document or business letter for review.</li>
            </ul>
            <p>
              ConMat may approve, reject or request more information for a business application. An approved status
              reflects the checks completed at the time; it is not an endorsement, warranty or guarantee
              of identity, creditworthiness, product quality or future conduct.
            </p>
          </section>

          <section id="marketplace-role" className="information-section">
            <h2>3. ConMat&apos;s marketplace role</h2>
            <p>
              ConMat operates technology that helps users discover products, compare sellers, request bulk quotations,
              place orders, make payments, receive invoices and track fulfilment. Unless ConMat is expressly identified
              as the seller on a listing, the seller—not ConMat—offers and supplies the construction material, and the
              buyer purchases it from that seller.
            </p>
            <p>
              ConMat may support the transaction and resolve platform issues, but does not manufacture, warehouse,
              inspect or independently certify every listed product. Users should confirm grade, standard, quantity,
              origin, suitability, handling requirements and site conditions before relying on a material.
            </p>
          </section>

          <section id="listings-and-orders" className="information-section">
            <h2>4. Product listings, pricing, stock and orders</h2>
            <h3>Seller responsibilities</h3>
            <p>
              Sellers must keep listings accurate, including product name, category, images, unit, specifications,
              retail or wholesale pricing, minimum quantities, available stock, city and delivery information. Sellers
              may list only lawful construction materials they are authorized and able to supply.
            </p>
            <h3>Buyer responsibilities</h3>
            <p>
              Buyers must review the listing, seller, quantity, pricing, delivery details and total before payment and
              provide a complete delivery address and reachable phone number. Adding an item to a cart does not reserve
              it or form a completed purchase.
            </p>
            <h3>Order confirmation and inventory</h3>
            <p>
              An order is confirmed when payment succeeds and ConMat records the successful payment. Inventory is
              deducted only after payment confirmation—not when an item is added to a cart. Because stock can change
              before payment, an order may be rejected or require adjustment if sufficient stock is no longer available.
              Obvious pricing or listing errors may be corrected, with affected users notified where practical.
            </p>
          </section>

          <section id="payments" className="information-section">
            <h2>5. Payments, cancellations, refunds and invoices</h2>
            <p>
              Prices and totals are shown in Pakistani Rupees unless stated otherwise. Card payments are processed
              through Stripe. You authorize the payment provider and ConMat to process transaction information required
              to complete your order. Payment can fail or remain pending because of issuer, fraud, configuration or
              network checks.
            </p>
            <p>
              ConMat generates an invoice after confirmed payment. Available invoices can be viewed and downloaded from
              the invoice area of a buyer&apos;s account. An unpaid order may be cancelled through the available order
              controls. A paid order cannot be cancelled until its payment has been refunded; paid cancellation and
              refund requests are subject to review of fulfilment, delivery, seller response and applicable law. Contact
              support promptly if you need help with a paid order.
            </p>
          </section>

          <section id="seller-payouts" className="information-section">
            <h2>6. Seller payout methods and ConMat commission</h2>
            <p>
              A seller must configure a supported payout method before its products can be ordered or an accepted bid
              can become an order. Supported methods shown by the current service may include JazzCash, Easypaisa,
              NayaPay, UBL and Meezan Bank. Availability can depend on provider support and ConMat configuration.
            </p>
            <p>
              After successful buyer payment, ConMat creates a seller payout record and deducts a 1% platform
              commission from the seller&apos;s gross proceeds. The seller&apos;s net amount is held until the buyer confirms
              receipt, or is released automatically 24 hours after the seller marks the order delivered if the buyer has
              not paused release through WhatsApp support. Provider processing time, account eligibility and technical checks may affect when
              funds reach the selected destination.
            </p>
          </section>

          <section id="delivery-and-issues" className="information-section">
            <h2>7. Fulfilment and delivery support</h2>
            <p>
              Sellers are responsible for fulfilling accepted paid orders, protecting materials in transit and keeping
              order status accurate. Delivery dates and estimates are not guaranteed unless the parties expressly agree
              otherwise. Buyers must provide safe, lawful and reasonably accessible delivery details and inspect the
              delivered material promptly.
            </p>
            <p>
              When a seller marks an order delivered, the buyer may confirm receipt or open ConMat support through the
              Report on WhatsApp action. That action pauses automatic payout release for the affected product. After the
              problem is solved, the buyer can still confirm delivery manually to release the seller payment. Users must
              cooperate honestly with support; opening WhatsApp does not guarantee a refund or a particular outcome.
            </p>
          </section>

          <section id="bulk-bidding" className="information-section">
            <h2>8. Bulk requests and competitive bids</h2>
            <p>
              Eligible buyers can publish bulk material requirements and eligible sellers can submit offers. Requesters
              must describe quantities, units, specifications, location and timing accurately. Sellers must ensure each
              bid is genuine, complete and capable of fulfilment at the offered price.
            </p>
            <p>
              Accepting a bid can create an order subject to checkout and payment confirmation. Users must not coordinate
              sham bids, manipulate comparisons, submit misleading offers or use the bidding tools to obtain confidential
              competitor information.
            </p>
          </section>

          <section id="prohibited-use" className="information-section">
            <h2>9. Prohibited conduct</h2>
            <p>You must not:</p>
            <ul>
              <li>Provide false identity, verification, product, pricing, stock, delivery or payment information.</li>
              <li>List counterfeit, stolen, unsafe, unlawfully sourced or prohibited materials.</li>
              <li>Manipulate reviews, analytics, orders, bids, reports, inventory or payment outcomes.</li>
              <li>Harass users, discriminate unlawfully, send spam or misuse buyer and seller contact information.</li>
              <li>Bypass access controls, probe security, introduce malicious code, scrape at disruptive scale or interfere with the service.</li>
              <li>Use ConMat to launder funds, commit fraud, infringe rights or violate any applicable law.</li>
            </ul>
          </section>

          <section id="content" className="information-section">
            <h2>10. User content and intellectual property</h2>
            <p>
              You retain ownership of content you submit, such as listing text and product photographs. You grant ConMat
              a non-exclusive, worldwide, royalty-free license to host, reproduce, format and display that content as
              necessary to operate, promote and improve the marketplace. You confirm that you have the rights needed to
              grant this license and that your content is accurate and lawful.
            </p>
            <p>
              ConMat&apos;s name, logo, interface, software and original platform content are owned by ConMat or its
              licensors. These Terms do not grant permission to copy or exploit them beyond ordinary use of the service.
            </p>
          </section>

          <section id="suspension" className="information-section">
            <h2>11. Moderation, restriction and suspension</h2>
            <p>
              ConMat may review or remove listings and content, hold marketplace actions for review, request additional
              verification, restrict features, or suspend or terminate accounts when reasonably necessary to enforce
              these Terms, protect users, investigate reports, address security or payment risk, or comply with law.
              Where appropriate, we may preserve records and cooperate with payment providers or authorities.
            </p>
          </section>

          <section id="disclaimers" className="information-section">
            <h2>12. Service disclaimers and limits of liability</h2>
            <p>
              To the extent permitted by applicable law, ConMat is provided on an “as available” basis. We do not promise
              uninterrupted access or guarantee every user, listing, price, bid, delivery estimate, product specification
              or third-party service. Nothing in these Terms excludes rights or liabilities that cannot lawfully be
              excluded.
            </p>
            <p>
              To the extent permitted by law, ConMat will not be liable for indirect, incidental, special or consequential
              loss, loss of profit or business opportunity, or damage arising from a transaction between users. Each user
              remains responsible for construction, engineering, safety and procurement decisions made using marketplace
              information.
            </p>
          </section>

          <section id="general" className="information-section">
            <h2>13. General terms, changes and contact</h2>
            <p>
              These Terms and the Privacy Policy form the agreement governing your use of ConMat. If a provision is
              unenforceable, the remaining provisions continue to apply. A failure to enforce a provision is not a waiver.
              You may not transfer your account or these Terms without permission. ConMat may update these Terms as the
              marketplace changes; the effective date will be revised and material changes may be notified through the
              service or email.
            </p>
            <p>
              These Terms are governed by the laws of Pakistan, subject to mandatory consumer and other rights that
              apply. Questions, notices and support requests can be sent to
              {' '}<a href="mailto:conmatpk@gmail.com">conmatpk@gmail.com</a>, by phone at
              {' '}<a href="tel:+923183448040">+92 318 3448040</a>, or through our <Link to="/contact">Contact page</Link>.
            </p>
          </section>
        </article>
      </div>
    </InformationPageLayout>
  );
}
