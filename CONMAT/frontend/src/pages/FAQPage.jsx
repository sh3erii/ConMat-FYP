import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import InformationPageLayout from '../components/common/InformationPageLayout';

const faqGroups = [
  {
    title: 'Getting started',
    items: [
      {
        question: 'What is ConMat?',
        answer: 'ConMat is a Pakistan-focused marketplace for construction materials. Buyers can browse products, compare sellers, place orders and request bulk bids, while approved businesses can list stock, receive orders and manage seller proceeds.'
      },
      {
        question: 'Which account role should I choose?',
        answer: 'Choose Customer if you are buying for yourself or a project. Choose Retailer if you sell to end customers, Wholesaler if you buy and sell in larger quantities, or Supplier if you supply construction materials. Retailers and wholesalers can buy as well as sell through the features available to their role.'
      },
      {
        question: 'What do I need to register?',
        answer: 'All registrations require basic identity, contact and address information plus a live CNIC image and email OTP verification. Every business role also requires company details, a live selfie, live business location, and either an NTN document or business letter.'
      },
      {
        question: 'Why is my business account still pending?',
        answer: 'Supplier, wholesaler and retailer information is reviewed by an administrator. Make sure your CNIC image, selfie, business details and live location are clear and accurate. ConMat may reject an application or ask for more information where the submitted details cannot be verified.'
      },
      {
        question: 'Does a verified badge guarantee a seller?',
        answer: 'No. Verification shows that the account passed ConMat’s current review process. Buyers should still review the listing and confirm material grade, standards, quantity, origin, suitability and delivery terms before purchasing.'
      }
    ]
  },
  {
    title: 'Buying and payments',
    items: [
      {
        question: 'How do I buy construction materials?',
        answer: 'Browse the Marketplace, open a product, choose a quantity that meets any minimum-order requirement, add it to your cart, enter delivery details and complete card payment. A confirmed order appears in your order history.'
      },
      {
        question: 'Does adding a product to my cart reserve stock?',
        answer: 'No. A cart helps you prepare checkout but does not reserve inventory. Stock can change until payment succeeds, so checkout may stop if the requested quantity is no longer available.'
      },
      {
        question: 'When is inventory deducted?',
        answer: 'Inventory is deducted only after payment is confirmed successfully. It is not deducted when someone views a product or adds it to a cart.'
      },
      {
        question: 'How are card payments processed?',
        answer: 'ConMat uses Stripe for card checkout. Stripe handles the card details needed to authorize payment, and ConMat verifies the successful PaymentIntent before marking the order paid and generating an invoice.'
      },
      {
        question: 'Where can I find and download my invoice?',
        answer: 'Open the Invoices area from your buyer account, select the paid order invoice and use Download PDF. The invoice includes the order items, payment date, fees and totals recorded for that transaction.'
      },
      {
        question: 'Can I cancel or refund an order?',
        answer: 'An unpaid order can be cancelled through the available order controls. A paid order cannot be cancelled until its payment is refunded. Contact ConMat support promptly for a paid cancellation or refund request; the outcome depends on fulfilment, delivery, the seller response and applicable rights.'
      }
    ]
  },
  {
    title: 'Selling and payouts',
    items: [
      {
        question: 'Who can list products?',
        answer: 'Supplier, wholesaler and retailer accounts can manage products where their role and verification status allow it. Listings should include accurate product details, pricing, unit, stock, minimum quantities, location and photographs.'
      },
      {
        question: 'Why is my product not visible in the Marketplace?',
        answer: 'A product must have an active marketplace status and its seller account must be active, approved where required, and payout-ready. Add a supported default payout method in Settings and check the product’s status and available stock.'
      },
      {
        question: 'Which seller payout methods are supported?',
        answer: 'The current payout settings support JazzCash, Easypaisa, NayaPay, UBL and Meezan Bank. A seller must add a supported default method before its products can be ordered or an accepted bid can become an order.'
      },
      {
        question: 'What commission does ConMat charge?',
        answer: 'ConMat deducts 1% from the seller’s gross proceeds for each successfully paid order. The Seller Payout value shows the amount remaining after that 1% commission.'
      },
      {
        question: 'When are seller proceeds released?',
        answer: 'After payment, the net seller proceeds are held safely by ConMat. They are released when the buyer confirms receipt, or automatically 24 hours after the seller marks the order delivered if the buyer has not paused release through WhatsApp support. Provider processing time and account checks may affect arrival time.'
      },
      {
        question: 'Is my payout account information visible to buyers?',
        answer: 'No. Buyers do not receive your full payout identifier. ConMat stores payout account identifiers in encrypted form and shows limited destination information, such as the provider and last four characters, where needed.'
      }
    ]
  },
  {
    title: 'Orders and delivery',
    items: [
      {
        question: 'How do I track an order?',
        answer: 'Open Order History and select an order to see its current payment, fulfilment and delivery status. Order Tracking shows the recorded progress from confirmation through delivery.'
      },
      {
        question: 'What should a seller do after receiving a paid order?',
        answer: 'Review the order and delivery details, prepare the exact paid quantity and specification, keep the order status current, and mark it delivered only after fulfilment. Sellers are responsible for protecting materials in transit and providing accurate updates.'
      },
      {
        question: 'How do I report a delivery problem?',
        answer: 'When a seller marks an order delivered, open the order in Order History or Order Tracking and select "Report on WhatsApp" within the 24-hour response window. This automatically pauses the seller payout release and opens direct support on WhatsApp (+92 318 3448040). Once the issue is resolved, the buyer can confirm receipt to release the seller funds.'
      },
      {
        question: 'Are delivery estimates guaranteed?',
        answer: 'Delivery dates are estimates unless you and the seller expressly agree otherwise. Orders within the same city typically estimate 3–6 hours, while inter-city deliveries estimate 2–3 days. Location, availability, transport conditions and seller fulfilment can affect timing.'
      }
    ]
  },
  {
    title: 'Bulk bidding and support',
    items: [
      {
        question: 'How does bulk bidding work?',
        answer: 'Eligible buyer roles can publish a request with material, quantity, unit, location, specifications and timing. Eligible suppliers or wholesalers can submit offers, and the requester can compare those bids before accepting one for checkout.'
      },
      {
        question: 'Does accepting a bid complete payment?',
        answer: 'No. Accepting an offer creates the path to an order, but checkout and successful payment confirmation are still required. The seller must also have a supported payout method configured.'
      },
      {
        question: 'How do in-app notifications and alerts work?',
        answer: 'ConMat provides real-time alerts for orders, bids, payments, invoices and account verifications. You can view all updates in the Notifications center, filter by unread or category, and mark individual alerts or all alerts as read.'
      },
      {
        question: 'How does ConMat use my identity and location information?',
        answer: 'Identity documents, live selfies and business coordinates are used for registration, business verification, fraud prevention, account security and marketplace trust. Verification documents and full CNIC details are not displayed on public seller profiles. Read the Privacy Policy for more detail.'
      },
      {
        question: 'How can I contact ConMat?',
        answer: 'Email conmatpk@gmail.com, call or WhatsApp +92 318 3448040, or use the Contact Us page for marketplace support, order help and business enquiries.'
      }
    ]
  }
];

export default function FAQPage() {
  const [query, setQuery] = useState('');

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return faqGroups;

    return faqGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          `${group.title} ${item.question} ${item.answer}`.toLowerCase().includes(normalized)
        )
      }))
      .filter((group) => group.items.length > 0);
  }, [query]);

  const resultCount = filteredGroups.reduce((total, group) => total + group.items.length, 0);

  return (
    <InformationPageLayout
      eyebrow="ConMat Help Centre"
      title="Clear answers for every"
      accent="marketplace role."
      description="Find practical answers about registration, verification, buying, inventory, Stripe payments, invoices, selling, the 1% commission, payouts, delivery and bulk bids."
      metaLabel="Topics covered"
      metaValue={`${faqGroups.reduce((total, group) => total + group.items.length, 0)} common questions`}
    >
      <section className="faq-workspace" aria-labelledby="faq-search-title">
        <div className="faq-search-card">
          <label id="faq-search-title" htmlFor="faq-search">What can we help you find?</label>
          <div className="faq-search">
            <Search size={20} aria-hidden="true" />
            <input
              id="faq-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search payments, verification, delivery, payouts…"
              autoComplete="off"
            />
          </div>
          <p className="faq-search-card__count" aria-live="polite">
            {resultCount} {resultCount === 1 ? 'answer' : 'answers'} available
          </p>
        </div>

        <div className="faq-results">
          {filteredGroups.map((group, groupIndex) => (
            <section className="faq-category" key={group.title}>
              <div className="faq-category__heading">
                <span>{String(groupIndex + 1).padStart(2, '0')}</span>
                <h2>{group.title}</h2>
              </div>

              {group.items.map((item) => (
                <details className="faq-item" key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </section>
          ))}

          {resultCount === 0 && (
            <div className="faq-empty">
              No matching answer found. Try a broader search or contact ConMat support.
            </div>
          )}
        </div>
      </section>
    </InformationPageLayout>
  );
}
