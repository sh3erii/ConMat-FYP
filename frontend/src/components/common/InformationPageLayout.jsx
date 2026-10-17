import LandingNavbar from './LandingNavbar';
import RoleNavbar from './RoleNavbar';
import PublicFooter from './PublicFooter';
import { useAuth } from '../../context/AuthContext';
import './InformationPageLayout.css';

export default function InformationPageLayout({
  eyebrow,
  title,
  accent,
  description,
  metaLabel,
  metaValue,
  children,
}) {
  const { user } = useAuth();

  return (
    <>
      {user ? <RoleNavbar /> : <LandingNavbar />}

      <div className="information-page conmat-page-shell">
        <main>
          <section className="information-hero conmat-page-hero workspace-hero workspace-hero--detached">
            <div className="information-hero__content workspace-hero__content">
              <span>{eyebrow}</span>
              <h1>{title} <em>{accent}</em></h1>
              <p>{description}</p>
            </div>

            <aside className="information-hero__meta workspace-hero__side">
              <span>{metaLabel}</span>
              <strong>{metaValue}</strong>
              <small>Written for the ConMat marketplace and its current account, ordering and payment workflows.</small>
            </aside>
          </section>

          {children}
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
