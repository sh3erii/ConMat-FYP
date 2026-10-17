import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Mail, Phone, Lock, Key, KeyRound, MapPin, Building2, ArrowRight, ArrowLeft, Camera, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthNavbar from '../components/common/AuthNavbar';
import FormAlert from '../components/common/FormAlert';
import PasswordInput from '../components/common/PasswordInput';
import { PAKISTAN_MAJOR_CITIES } from '../config/pakistanCities';
import { formatPhone, isPhoneComplete } from '../utils/formatPhone';
import './RegisterPage.css';

const roles = [
  { value: 'Customer', title: 'Customer', desc: 'Buy materials, track orders and request bulk quotes.' },
  { value: 'Retailer', title: 'Retailer', desc: 'Buy, sell and create bulk requests after admin approval.' },
  { value: 'Wholesaler', title: 'Wholesaler', desc: 'Buy, sell and submit bids after admin approval.' },
  { value: 'Supplier', title: 'Supplier', desc: 'List products after admin verification and submit bids.' }
];

const initialState = {
  name: '',
  email: '',
  phone: '+92',
  street: '',
  city: '',
  postalCode: '',
  password: '',
  confirmPassword: '',
  role: 'Customer',
  companyName: '',
  userPhoto: null,
  idCardPhoto: null,
  ntnPhoto: null,
  businessApprovalLetter: null,
  latitude: '',
  longitude: ''
};

const coordinatesAreValid = (latitude, longitude) => {
  if (latitude === '' || longitude === '') return false;
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  return Number.isFinite(parsedLatitude) && parsedLatitude >= -90 && parsedLatitude <= 90
    && Number.isFinite(parsedLongitude) && parsedLongitude >= -180 && parsedLongitude <= 180;
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { registerRequest, verifyRegistrationOtp, resendRegistrationOtp } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (step !== 3 || resendSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [step, resendSeconds]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
  }, [step]);

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        setLocating(false);
      },
      () => {
        setError('Unable to retrieve your location. Allow location access or enter the coordinates manually.');
        setLocating(false);
      }
    );
  };

  const selectedRole = useMemo(
    () => roles.find((role) => role.value === formData.role),
    [formData.role]
  );

  const isBusinessRole = ['Supplier', 'Wholesaler', 'Retailer'].includes(formData.role);

  const handleChange = (event) => {
    const { name, value } = event.target;
    let formatted = value;
    if (name === 'phone') formatted = formatPhone(value);
    setFormData((prev) => ({ ...prev, [name]: formatted }));
  };

  const handleFileChange = (event) => {
    const { name, files } = event.target;
    setFormData((prev) => ({ ...prev, [name]: files[0] || null }));
  };

  const validateStepOne = () => {
    // Personal details validation
    if (!formData.name.trim() || !formData.email.trim()) {
      return 'Name and email are required.';
    }
    if (!isPhoneComplete(formData.phone)) {
      return 'Phone number must be +92 followed by exactly 10 digits.';
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) return 'Enter a valid email address.';
    // Security details validation
    if (!formData.password || formData.password.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(formData.password) || !/[!@#$%^&*()_+={}[\];':"\\|,.<>/?-]/.test(formData.password)) return 'Password must contain at least one capital letter and a special character.';
    if (formData.password !== formData.confirmPassword) return 'Password and confirm password must match.';
    // Address details validation
    if (!formData.street.trim() || !formData.city.trim() || !formData.postalCode.trim()) {
      return 'Please fill in your address details.';
    }
    return '';
  };

  const validateStepTwo = () => {
    // All roles require ID card photo
    if (!formData.idCardPhoto) return 'A live photo of your ID card (CNIC) is required.';
    // Business roles additionally require a selfie
    if (isBusinessRole && !formData.userPhoto) return 'A live selfie photo of yourself is required.';
    if (isBusinessRole && !formData.companyName.trim()) return 'Company name is required.';
    if (isBusinessRole && !formData.ntnPhoto && !formData.businessApprovalLetter) {
      return 'Upload an NTN document or business letter for your business account.';
    }
    if (isBusinessRole && !coordinatesAreValid(formData.latitude, formData.longitude)) {
      return 'Enter valid business coordinates or use your current location.';
    }
    return '';
  };

  const buildRegistrationPayload = () => ({
    name: formData.name.trim(),
    email: formData.email.trim().toLowerCase(),
    phone: formData.phone.trim(),
    street: formData.street.trim(),
    city: formData.city.trim(),
    postalCode: formData.postalCode.trim(),
    password: formData.password,
    role: formData.role,
    // ID card photo required for all roles
    idCardPhoto: formData.idCardPhoto,
    ...(isBusinessRole && {
      // Selfie only for business roles
      userPhoto: formData.userPhoto,
      companyName: formData.companyName.trim(),
      ntnPhoto: formData.ntnPhoto,
      businessApprovalLetter: formData.businessApprovalLetter,
      latitude: formData.latitude,
      longitude: formData.longitude,
    }),
  });

  const submitRegistration = async () => {
    setError('');
    setSuccess('');

    try {
      setLoading(true);
      const data = await registerRequest(buildRegistrationPayload());
      setPendingEmail(data.email || formData.email.trim().toLowerCase());
      setOtp('');
      setResendSeconds(Number(data.resendAfterSeconds || 60));
      setSuccess(data.message || 'A verification code was sent to your email.');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goNext = async () => {
    const message = validateStepOne();
    if (message) {
      setError(message);
      return;
    }

    setError('');
    // All roles (including customers) go through step 2 for photo verification
    setStep(2);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const message = validateStepTwo();
    if (message) {
      setError(message);
      return;
    }

    await submitRegistration();
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the complete 6-digit verification code.');
      return;
    }

    try {
      setLoading(true);
      const data = await verifyRegistrationOtp({ email: pendingEmail, otp });
      setSuccess(data.message || 'Email verified and account created successfully.');
      setFormData(initialState);
      setOtp('');
      setResendSeconds(0);
      window.setTimeout(() => navigate('/login'), 1400);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to verify this code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (event) => {
    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6));
    setError('');
  };

  const handleResendOtp = async () => {
    if (loading || resendSeconds > 0) return;
    setError('');
    setSuccess('');
    try {
      setLoading(true);
      const data = await resendRegistrationOtp(pendingEmail);
      setOtp('');
      setResendSeconds(Number(data.resendAfterSeconds || 60));
      setSuccess(data.message || 'A new verification code was sent.');
    } catch (err) {
      const retryAfter = Number(err.response?.data?.retryAfterSeconds || 0);
      if (retryAfter > 0) setResendSeconds(retryAfter);
      setError(err.response?.data?.message || 'Unable to resend the verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-page">
      <AuthNavbar />

      <section className="register-shell">
        <aside className="register-info d-flex flex-column justify-content-start pe-lg-5 py-lg-5">
          <div className="badge-hero register-info__eyebrow">ROLE-BASED ONBOARDING</div>
          <h1 className="display-5 fw-extra-bold ls-tight mb-4">
            Join <span className="text-brand" style={{ fontWeight: 800 }}>ConMat</span> with the right
            marketplace role.
          </h1>
          <p className="register-info__description">
            Join Pakistan&apos;s construction materials marketplace to source products, compare bulk offers,
            manage listings, track deliveries, and handle secure order payments-all from one role-based workspace.
          </p>
        </aside>

        <section className="register-card">
          <div className="register-card__header">
            <div className="icon-box icon-box-trust rounded-4 d-flex align-items-center justify-content-center shadow-theme" style={{ width: '48px', height: '48px' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2>Create Account</h2>
              <p>{step === 1 ? 'Start with your personal details.' : step === 2 ? `Selected role: ${selectedRole?.title}` : 'Verify your email to finish signup.'}</p>
            </div>
          </div>

          <FormAlert type="error">{error}</FormAlert>
          <FormAlert type="success">{success}</FormAlert>

          <div className="register-progress">
            <div className={`register-progress__item ${step === 1 ? 'register-progress__item--active' : ''}`}>
              <span>1</span>
              Basic info
            </div>
            <div className={`register-progress__line ${step >= 2 ? 'register-progress__line--active' : ''}`} />
            <div className={`register-progress__item ${step === 2 ? 'register-progress__item--active' : ''}`}>
              <span>2</span>
              Documents
            </div>
            <div className={`register-progress__line ${step === 3 ? 'register-progress__line--active' : ''}`} />
            <div className={`register-progress__item ${step === 3 ? 'register-progress__item--active' : ''}`}>
              <span>3</span>
              Email OTP
            </div>
          </div>

          {step === 1 ? (
            <div className="register-card__form">
              <div className="register-card__section">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="icon-box icon-box-trust rounded-4 d-flex align-items-center justify-content-center shadow-theme" style={{ width: '40px', height: '40px' }}>
                    <User size={20} />
                  </div>
                  <span className="register-card__section-title mb-0">Personal details</span>
                </div>

                <label>
                  <span>Full name</span>
                  <div className="register-card__field">
                    <User size={18} style={{ opacity: 0.5 }} />
                    <input name="name" value={formData.name} onChange={handleChange} placeholder="Talha Tariq" />
                  </div>
                </label>

                <label>
                  <span>Email address</span>
                  <div className="register-card__field">
                    <Mail size={18} style={{ opacity: 0.5 }} />
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@conmat.pk" />
                  </div>
                </label>

                <label>
                  <span>Phone number</span>
                  <div className="register-card__field">
                    <Phone size={18} style={{ opacity: 0.5 }} />
                    <input
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+92xxxxxxxxxx"
                      inputMode="numeric"
                      maxLength={13}
                    />
                  </div>
                </label>

                <label>
                  <span>Select account type</span>
                  <div className="register-card__dropdown">
                    <select name="role" value={formData.role} onChange={handleChange}>
                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="register-card__role-hint">{selectedRole?.desc}</span>
                </label>


              </div>
              
              {/* NEW Security section */}
              <div className="register-card__section">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="icon-box icon-box-trust rounded-4 d-flex align-items-center justify-content-center shadow-theme" style={{ width: '40px', height: '40px' }}>
                    <Lock size={20} />
                  </div>
                  <span className="register-card__section-title mb-0">Account Security</span>
                </div>

                <div className="register-card__split">
                  <label>
                    <span>Password</span>
                    <div className="register-card__field">
                      <Key size={18} style={{ opacity: 0.5 }} />
                      <PasswordInput
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Minimum 8 characters"
                        minLength={8}
                        autoComplete="new-password"
                        visible={showPassword}
                        onToggle={() => setShowPassword((visible) => !visible)}
                        toggleClassName="register-card__password-toggle"
                      />
                    </div>
                    <span className="register-card__password-hint">Password must contain at least one capital letter and a special character.</span>
                  </label>
                  <label>
                    <span>Confirm password</span>
                    <div className="register-card__field">
                      <KeyRound size={18} style={{ opacity: 0.5 }} />
                      <PasswordInput
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Repeat password"
                        autoComplete="new-password"
                        visible={showConfirmPassword}
                        onToggle={() => setShowConfirmPassword((visible) => !visible)}
                        toggleClassName="register-card__password-toggle"
                        fieldLabel="confirmed password"
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div className="register-card__section">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="icon-box icon-box-security rounded-4 d-flex align-items-center justify-content-center shadow-theme" style={{ width: '40px', height: '40px' }}>
                    <MapPin size={20} />
                  </div>
                  <span className="register-card__section-title mb-0">Address</span>
                </div>

                <label>
                  <span>Street address</span>
                  <div className="register-card__field">
                    <input name="street" value={formData.street} onChange={handleChange} placeholder="e.g. 42 Industrial Zone, Phase II" />
                  </div>
                </label>

                <div className="register-card__split">
                  <label>
                    <span>City</span>
                    <select name="city" value={formData.city} onChange={handleChange} required>
                      <option value="">Select city</option>
                      {PAKISTAN_MAJOR_CITIES.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Postal code</span>
                    <input name="postalCode" value={formData.postalCode} onChange={handleChange} placeholder="75500" />
                  </label>
                </div>
              </div>

              <button className="btn btn-orange-cta register-card__button" type="button" onClick={goNext} disabled={loading}>
                {loading ? 'Processing...' : 'Next step'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </div>
          ) : step === 2 ? (
            <form className="register-card__form" onSubmit={handleSubmit}>
              <div className="register-card__section">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="icon-box icon-box-security rounded-4 d-flex align-items-center justify-content-center shadow-theme" style={{ width: '40px', height: '40px' }}>
                    <Camera size={20} />
                  </div>
                  <span className="register-card__section-title mb-0">Verification Documents</span>
                </div>

                {/* Selfie only required for business roles */}
                {isBusinessRole && (
                  <label>
                    <span>Live photo of yourself (Selfie)</span>
                    <div className="register-card__field register-card__field--file">
                      <Camera size={18} style={{ opacity: 0.5 }} />
                      <input
                        type="file"
                        id="userPhoto"
                        name="userPhoto"
                        accept="image/*"
                        capture="user"
                        onChange={handleFileChange}
                        key={formData.userPhoto ? 'has-userPhoto' : 'no-userPhoto'}
                      />
                      <span className="file-custom-label flex-grow-1 text-truncate">
                        {formData.userPhoto ? formData.userPhoto.name : 'Tap to capture selfie'}
                      </span>
                      {formData.userPhoto && (
                        <button
                          type="button"
                          className="register-card__clear-btn"
                          title="Remove photo"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFormData((prev) => ({ ...prev, userPhoto: null }));
                          }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </label>
                )}

                <label>
                  <span>Live photo of ID Card (Front)</span>
                  <div className="register-card__field register-card__field--file">
                    <Camera size={18} style={{ opacity: 0.5 }} />
                    <input
                      type="file"
                      id="idCardPhoto"
                      name="idCardPhoto"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      key={formData.idCardPhoto ? 'has-idCardPhoto' : 'no-idCardPhoto'}
                    />
                    <span className="file-custom-label flex-grow-1 text-truncate">
                      {formData.idCardPhoto ? formData.idCardPhoto.name : 'Tap to capture photo'}
                    </span>
                    {formData.idCardPhoto && (
                      <button
                        type="button"
                        className="register-card__clear-btn"
                        title="Remove photo"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFormData((prev) => ({ ...prev, idCardPhoto: null }));
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </label>

                {isBusinessRole && (
                  <label>
                    <span>Live photo of NTN Document (Required if no business letter)</span>
                    <div className="register-card__field register-card__field--file">
                      <Camera size={18} style={{ opacity: 0.5 }} />
                      <input
                        type="file"
                        id="ntnPhoto"
                        name="ntnPhoto"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        key={formData.ntnPhoto ? 'has-ntnPhoto' : 'no-ntnPhoto'}
                      />
                      <span className="file-custom-label flex-grow-1 text-truncate">
                        {formData.ntnPhoto ? formData.ntnPhoto.name : 'Tap to capture photo'}
                      </span>
                      {formData.ntnPhoto && (
                        <button
                          type="button"
                          className="register-card__clear-btn"
                          title="Remove photo"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFormData((prev) => ({ ...prev, ntnPhoto: null }));
                          }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </label>
                )}

                {isBusinessRole && (
                  <label>
                    <span>Business Letter (Required if no NTN document)</span>
                    <div className="register-card__field register-card__field--file">
                      <Camera size={18} style={{ opacity: 0.5 }} />
                      <input
                        type="file"
                        id="businessApprovalLetter"
                        name="businessApprovalLetter"
                        accept="image/*,.pdf,application/pdf"
                        onChange={handleFileChange}
                        key={formData.businessApprovalLetter ? 'has-businessApprovalLetter' : 'no-businessApprovalLetter'}
                      />
                      <span className="file-custom-label flex-grow-1 text-truncate">
                        {formData.businessApprovalLetter ? formData.businessApprovalLetter.name : 'Choose business letter'}
                      </span>
                      {formData.businessApprovalLetter && (
                        <button
                          type="button"
                          className="register-card__clear-btn"
                          title="Remove document"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFormData((prev) => ({ ...prev, businessApprovalLetter: null }));
                          }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </label>
                )}
              </div>

              {isBusinessRole && (
                <div className="register-card__section">
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <div className="icon-box icon-box-trust rounded-4 d-flex align-items-center justify-content-center shadow-theme" style={{ width: '40px', height: '40px' }}>
                      <Building2 size={20} />
                    </div>
                    <span className="register-card__section-title mb-0">Business Details</span>
                  </div>
                  <label>
                    <span>Company / shop name</span>
                    <div className="register-card__field">
                      <Building2 size={18} style={{ opacity: 0.5 }} />
                      <input name="companyName" value={formData.companyName} onChange={handleChange} placeholder="ConMat Traders" />
                    </div>
                  </label>
                  <label>
                    <span>Business location</span>
                    <div
                      className="register-card__field"
                      style={{ cursor: locating ? 'wait' : 'pointer' }}
                      onClick={!locating && !formData.latitude ? fetchLocation : undefined}
                    >
                      <MapPin size={18} style={{ opacity: 0.5 }} />
                      <div className="flex-grow-1" style={{ fontWeight: 800, fontSize: '14px', color: formData.latitude ? '#1c2333' : '#94a3b8' }}>
                        {locating ? 'Capturing...' : (coordinatesAreValid(formData.latitude, formData.longitude) ? `Pinned: ${Number(formData.latitude).toFixed(4)}, ${Number(formData.longitude).toFixed(4)}` : 'Use current location')}
                      </div>
                      {formData.latitude ? (
                        <button
                          type="button"
                          className="register-card__clear-btn"
                          title="Remove pinned location"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData((prev) => ({ ...prev, latitude: '', longitude: '' }));
                          }}
                        >
                          <X size={14} />
                        </button>
                      ) : (
                        <ShieldCheck size={18} style={{ color: '#94a3b8' }} />
                      )}
                    </div>
                  </label>
                  <div className="register-card__manual-location">
                    <span>Or enter coordinates manually</span>
                    <div className="register-card__split">
                      <label>
                        <span>Latitude</span>
                        <input
                          type="number"
                          name="latitude"
                          min="-90"
                          max="90"
                          step="any"
                          inputMode="decimal"
                          value={formData.latitude}
                          onChange={handleChange}
                          placeholder="e.g. 31.5204"
                        />
                      </label>
                      <label>
                        <span>Longitude</span>
                        <input
                          type="number"
                          name="longitude"
                          min="-180"
                          max="180"
                          step="any"
                          inputMode="decimal"
                          value={formData.longitude}
                          onChange={handleChange}
                          placeholder="e.g. 74.3587"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="register-card__actions">
                <button type="button" className="register-card__back" onClick={() => setStep(1)}>
                  <ArrowLeft size={18} /> Back
                </button>
                <button className="btn btn-orange-cta register-card__button" type="submit" disabled={loading}>
                  {loading ? 'Sending code...' : 'Send Verification Code'}
                </button>
              </div>
            </form>
          ) : (
            <form className="register-card__form" onSubmit={handleVerifyOtp}>
              <div className="register-card__section register-card__otp-section">
                <div className="register-card__otp-icon"><Mail size={26} /></div>
                <div className="register-card__otp-heading">
                  <span>Email verification</span>
                  <h3>Enter your 6-digit code</h3>
                  <p>We sent a one-time verification code to <strong>{pendingEmail}</strong>. The account will only be created after this code is verified.</p>
                </div>

                <label>
                  <span>Verification code</span>
                  <div className="register-card__field register-card__otp-field">
                    <KeyRound size={19} aria-hidden="true" />
                    <input
                      value={otp}
                      onChange={handleOtpChange}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="000000"
                      aria-label="Six-digit verification code"
                      autoFocus
                    />
                  </div>
                </label>

                <div className="register-card__otp-resend">
                  <span>{resendSeconds > 0 ? `Send code again in ${Math.floor(resendSeconds / 60)}:${String(resendSeconds % 60).padStart(2, '0')}` : 'Did not receive the email?'}</span>
                  <button type="button" onClick={handleResendOtp} disabled={loading || resendSeconds > 0}>
                    <RefreshCw size={15} /> Send code again
                  </button>
                </div>
              </div>

              <div className="register-card__actions">
                <button
                  type="button"
                  className="register-card__back"
                  onClick={() => {
                    setError('');
                    setSuccess('');
                    setStep(1);
                  }}
                  disabled={loading}
                >
                  <ArrowLeft size={18} /> Change details
                </button>
                <button className="btn btn-orange-cta register-card__button" type="submit" disabled={loading || otp.length !== 6}>
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </button>
              </div>
            </form>
          )}

          <p className="register-card__switch">
            Already registered? <Link to="/login">Login</Link>
          </p>
        </section>
      </section>
    </main>
  );
}
