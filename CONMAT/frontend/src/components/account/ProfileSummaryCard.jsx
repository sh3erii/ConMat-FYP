import { ExternalLink, MapPin, Navigation, Phone } from 'lucide-react';
import './ProfileSummaryCard.css';

export default function ProfileSummaryCard({ profile }) {
  const initials = profile?.name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="profile-summary-card">
      <div className="profile-summary-card__top">
        <div className="profile-summary-card__avatar">
          {profile?.avatar ? <img src={profile.avatar} alt={profile.name} /> : <span>{initials || 'CM'}</span>}
        </div>
        <div>
          <div className="profile-summary-card__name"><h2>{profile?.name}</h2></div>
        </div>
      </div>

      <div className="profile-summary-card__grid">
        <p><MapPin /> {profile?.city}</p>
        <p><Phone /> {profile?.phone}</p>
        {profile?.liveLocationUrl && (
          <a className="profile-summary-card__location-link" href={profile.liveLocationUrl} target="_blank" rel="noreferrer">
            <Navigation /> View live business location <ExternalLink size={15} />
          </a>
        )}
      </div>
    </section>
  );
}
