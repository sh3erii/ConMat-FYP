import { Link } from 'react-router-dom';
import LandingNavbar from '../components/common/LandingNavbar';
import RoleNavbar from '../components/common/RoleNavbar';
import PublicFooter from '../components/common/PublicFooter';
import { useAuth } from '../context/AuthContext';
import './ContactUs.css';

const contactCards = [
  {
    number: '01',
    title: 'Email Us',
    text: 'Send us your questions, feedback or business enquiries and our team will get back to you.',
    value: 'conmatpk@gmail.com',
    href: 'mailto:conmatpk@gmail.com'
  },
  {
    number: '02',
    title: 'Call Us',
    text: 'Speak with our team if you need assistance with the marketplace or construction material sourcing.',
    value: '+92 318 3448040',
    href: 'tel:+923183448040'
  },
  {
    number: '03',
    title: 'Our Location',
    text: 'ConMat connects construction buyers and suppliers across Pakistan through one digital marketplace.',
    value: 'Pakistan'
  }
];

export default function ContactUs() {
  const { user } = useAuth();

  return (
    <>
      {user ? <RoleNavbar /> : <LandingNavbar />}

      <main className="contact-page conmat-page-shell">

        {/* HERO */}
        <section className="contact-hero conmat-page-hero workspace-hero workspace-hero--detached">
          <div className="contact-hero__content workspace-hero__content">
            <span>Contact Us</span>

            <h1>
              Let&apos;s build a better way to source
              <em> construction materials.</em>
            </h1>

            <p>
              Have a question about the marketplace, need help finding
              materials or want to work with ConMat? Get in touch with us.
            </p>
          </div>

          <aside className="contact-hero__stat workspace-hero__side">
            <strong>We&apos;re Here to Help</strong>

            <span>
              Reach out to our team for marketplace support, business
              enquiries and general questions.
            </span>
          </aside>
        </section>

        {/* GET IN TOUCH */}
        <section className="contact-section">

          {/* WHOLE SECTION INSIDE THE DIV */}
          <div className="contact-section__container">

            <div className="contact-section__heading">
              <span>Get in Touch</span>

              <h2>
                Have a question? We&apos;re here to help.
              </h2>

              <p>
                Whether you need help finding construction materials, have a
                question about the marketplace, or want to work with ConMat,
                contact our team through the options below.
              </p>
            </div>

            <div className="contact-cards">
              {contactCards.map((card) => (
                <article
                  className="contact-card"
                  key={card.number}
                >
                  <span className="contact-card__number">
                    {card.number}
                  </span>

                  <h3>{card.title}</h3>

                  <p>{card.text}</p>

                  {card.href ? (
                    <a href={card.href}>
                      {card.value}
                    </a>
                  ) : (
                    <span className="contact-card__value">
                      {card.value}
                    </span>
                  )}
                </article>
              ))}
            </div>

          </div>
        </section>

        {/* CTA */}
        <section className="contact-cta">
          <div>
            <span>Start Sourcing</span>

            <h2>
              Ready to find the materials your project needs?
            </h2>

            <p>
              Browse construction materials, compare available options and
              connect with suppliers through the ConMat marketplace.
            </p>
          </div>

          <Link
            to="/marketplace"
            className="contact-cta__button"
          >
            Browse Marketplace
          </Link>
        </section>

      </main>
      <PublicFooter />
    </>
  );
}
