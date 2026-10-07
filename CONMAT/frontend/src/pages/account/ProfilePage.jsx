import { useEffect, useState } from 'react';
import { Camera, Crosshair, ExternalLink, LoaderCircle, MapPin, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import RecentActivityList from '../../components/account/RecentActivityList';
import ReportGenerator from '../../components/reports/ReportGenerator';
import RoleNavbar from '../../components/common/RoleNavbar';
import { cityOptionsWithCurrent } from '../../config/pakistanCities';
import { getMyProfile, getRecentActivities, updateMyProfile } from '../../services/profileService';
import { formatPhone, isPhoneComplete } from '../../utils/formatPhone';
import "./ProfilePage.css";

const BUSINESS_ROLES = new Set(['Supplier', 'Wholesaler', 'Retailer']);

function validLocation(profile) {
  if (!profile || profile.latitude === '' || profile.longitude === '' || profile.latitude === null || profile.longitude === null || profile.latitude === undefined || profile.longitude === undefined) return null;
  const latitude = Number(profile.latitude);
  const longitude = Number(profile.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityNextOffset, setActivityNextOffset] = useState(0);
  const [hasMoreActivities, setHasMoreActivities] = useState(false);
  const [loadingMoreActivities, setLoadingMoreActivities] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [locating, setLocating] = useState(false);

  const showMsg = (text, error = false) => {
    setMessage(text);
    setIsError(error);
    if (!error) setTimeout(() => setMessage(''), 3000);
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    let isMounted = true;
    async function loadProfile() {
      try {
        const [profileData, activityPage] = await Promise.all([getMyProfile(), getRecentActivities()]);
        if (!isMounted) return;
        const merged = { ...user, ...(profileData || {}), role: profileData?.role || user?.role };
        setProfile(merged);
        setPhotoPreview(merged.profilePhoto || null);
        setRecentActivities(activityPage.activities);
        setActivityTotal(activityPage.total);
        setActivityNextOffset(activityPage.nextOffset);
        setHasMoreActivities(activityPage.hasMore);
      } catch (error) {
        if (!isMounted) return;
        const merged = { ...user };
        setProfile(merged);
        setPhotoPreview(merged.profilePhoto || null);
        setRecentActivities([]);
        showMsg(error.response?.data?.message || 'Unable to load full profile details.', true);
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    let formatted = value;
    if (name === 'phone') formatted = formatPhone(value);
    setProfile((current) => ({ ...current, [name]: formatted }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result);
      setProfile((current) => ({ ...current, avatarFile: file }));
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      showMsg('Geolocation is not supported by this browser.', true);
      return;
    }

    setMessage('');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setProfile((current) => ({
          ...current,
          latitude: coords.latitude.toFixed(7),
          longitude: coords.longitude.toFixed(7),
        }));
        setLocating(false);
        showMsg('Live location captured. Save your profile to apply the change.');
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        showMsg(denied ? 'Location permission was denied. Enter the coordinates manually or allow access and try again.' : 'Unable to capture your location. Enter the coordinates manually or try again.', true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (profile.phone && !isPhoneComplete(profile.phone)) {
      showMsg('Phone number must be +92 followed by exactly 10 digits.', true);
      return;
    }

    if (BUSINESS_ROLES.has(profile.role) && !validLocation(profile)) {
      showMsg('Enter valid business coordinates or use your current location before saving.', true);
      return;
    }

    try {
      const updated = await updateMyProfile(profile);
      setProfile(updated);
      setPhotoPreview(updated.profilePhoto || null);
      await refreshUser();
      const activityPage = await getRecentActivities();
      setRecentActivities(activityPage.activities);
      setActivityTotal(activityPage.total);
      setActivityNextOffset(activityPage.nextOffset);
      setHasMoreActivities(activityPage.hasMore);
      showMsg('Profile updated successfully.');
    } catch (error) {
      showMsg(error.response?.data?.message || 'Unable to update profile.', true);
    }
  };

  const handleLoadMoreActivities = async () => {
    if (loadingMoreActivities || !hasMoreActivities) return;
    setLoadingMoreActivities(true);
    try {
      const activityPage = await getRecentActivities({ offset: activityNextOffset });
      setRecentActivities((current) => [
        ...current,
        ...activityPage.activities.filter((next) => !current.some((activity) => activity.id === next.id)),
      ]);
      setActivityTotal(activityPage.total);
      setActivityNextOffset(activityPage.nextOffset);
      setHasMoreActivities(activityPage.hasMore);
    } catch (error) {
      showMsg(error.response?.data?.message || 'Unable to load more activities.', true);
    } finally {
      setLoadingMoreActivities(false);
    }
  };

  if (!profile) {
    return (
      <>
        <RoleNavbar />
        <main className="profile-page"><p className="profile-page__loading">Loading profile...</p></main>
      </>
    );
  }

  const initials = (profile.name || '?')
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  const isBusinessRole = BUSINESS_ROLES.has(profile.role);
  const businessLocation = isBusinessRole ? validLocation(profile) : null;
  const businessMapUrl = businessLocation
    ? `https://www.google.com/maps?q=${businessLocation.latitude},${businessLocation.longitude}`
    : '';
  return (
    <>
      <RoleNavbar />
      <main className="profile-page conmat-page-shell">
        <section className="profile-page__hero conmat-page-hero position-relative">
      
        <div>
          <div className='profile_eyebrow'>
          <p>Account Center</p>
          </div>
          <h1>Profile & Activity</h1>
          <span>Manage your ConMat account details and review your recent activities.</span>
        </div>
      </section>

      <div className="profile-page__layout">
        <form className="profile-page__form" onSubmit={handleSubmit}>
          <div className="profile-page__form-head">
            {isBusinessRole ? (
              <div>
                <span className="profile-page__account-type">Business account</span>
                <div className="profile-page__business-name"><h2>{profile.companyName || profile.name}</h2></div>
              </div>
            ) : (
              <h2>Edit Profile</h2>
            )}
          </div>

          {message && (
            <div className={`profile-page__message${isError ? ' profile-page__message--error' : ' profile-page__message--success'}`}>
              {message}
            </div>
          )}

          <div className="profile-page__wide profile-page__photo">
            <div className="profile-page__photo-preview">
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <div className="profile-page__photo-upload">
              <span>Profile Photo</span>
              <label className="profile-page__photo-btn">
                <Camera size={16} />
                Change Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  hidden
                />
              </label>
            </div>
          </div>

          {isBusinessRole && (
            <label className="profile-page__wide">
              Business Account Name
              <input name="companyName" value={profile.companyName || ''} onChange={handleChange} />
            </label>
          )}

          <label>
            Full Name
            <input name="name" value={profile.name || ''} onChange={handleChange} />
          </label>

          <label>
            Email
            <input name="email" value={profile.email || ''} readOnly />
          </label>

          <label>
            Phone
            <input
              name="phone"
              value={profile.phone || '+92'}
              onChange={handleChange}
              inputMode="numeric"
              maxLength={13}
              placeholder="+92xxxxxxxxxx"
            />
          </label>

          <label>
            City
            <select name="city" value={profile.city || ''} onChange={handleChange} required>
              <option value="">Select city</option>
              {cityOptionsWithCurrent(profile.city).map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>

          <label>
            Postal Code
            <input name="postalCode" value={profile.postalCode || ''} onChange={handleChange} />
          </label>

          <label className="profile-page__wide">
            Street Address
            <textarea name="street" value={profile.street || ''} onChange={handleChange} rows="4" />
          </label>

          {isBusinessRole && (
            <section className="profile-page__wide profile-page__location" aria-labelledby="business-live-location-title">
              <div className="profile-page__location-icon"><MapPin aria-hidden="true" /></div>
              <div className="profile-page__location-content">
                <span>Business profile</span>
                <h3 id="business-live-location-title">Business Location</h3>
                {businessLocation ? (
                  <p>
                    Latitude {businessLocation.latitude.toFixed(6)} · Longitude {businessLocation.longitude.toFixed(6)}
                  </p>
                ) : (
                  <p>No business location is currently pinned.</p>
                )}
                <div className="profile-page__location-actions">
                  <button type="button" className="profile-page__location-button" onClick={handleCaptureLocation} disabled={locating}>
                    {locating ? <LoaderCircle className="profile-page__location-spinner" aria-hidden="true" /> : <Crosshair aria-hidden="true" />}
                    {locating ? 'Capturing location...' : 'Use Current Location'}
                  </button>
                  {businessMapUrl && (
                    <a href={businessMapUrl} target="_blank" rel="noreferrer">
                      View on map <ExternalLink size={15} aria-hidden="true" />
                    </a>
                  )}
                </div>
                <div className="profile-page__manual-location">
                  <span>Or enter coordinates manually</span>
                  <div className="profile-page__coordinate-fields">
                    <label>
                      Latitude
                      <input
                        type="number"
                        name="latitude"
                        min="-90"
                        max="90"
                        step="any"
                        inputMode="decimal"
                        value={profile.latitude ?? ''}
                        onChange={handleChange}
                        placeholder="e.g. 31.5204"
                      />
                    </label>
                    <label>
                      Longitude
                      <input
                        type="number"
                        name="longitude"
                        min="-180"
                        max="180"
                        step="any"
                        inputMode="decimal"
                        value={profile.longitude ?? ''}
                        onChange={handleChange}
                        placeholder="e.g. 74.3587"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </section>
          )}

          <button type="submit"><Save /> Save Profile</button>
        </form>

      </div>

      <ReportGenerator user={profile} adminMode={profile.role === 'Admin'} />

      <RecentActivityList
        activities={recentActivities}
        total={activityTotal}
        hasMore={hasMoreActivities}
        loadingMore={loadingMoreActivities}
        onLoadMore={handleLoadMoreActivities}
      />
      </main>
    </>
  );
}
