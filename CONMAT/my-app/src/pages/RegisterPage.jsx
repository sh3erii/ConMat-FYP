import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Mail, Phone, Lock, Key, KeyRound, MapPin, Building2, ArrowRight, ArrowLeft, Camera, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthNavbar from '../components/common/AuthNavbar';
import FormAlert from '../components/common/FormAlert';
import './RegisterPage.css';
import './LandingPage.css';

const roles = [
  { value: 'Customer', title: 'Customer', desc: 'Buy construction material and track orders.' },
  { value: 'Retailer', title: 'Retailer', desc: 'Purchase and sell smaller quantities.' },
  { value: 'Wholesaler', title: 'Wholesaler', desc: 'Handle bulk procurement and bidding.' },
  { value: 'Supplier', title: 'Supplier', desc: 'List products after admin verification.' }
];

const initialState = {
  name: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  postalCode: '',
  password: '',
  confirmPassword: '',
  role: 'Customer',
  companyName: '',
  cnic: '',
  userPhoto: null,
  idCardPhoto: null,
  ntnPhoto: null,
  latitude: '',
  longitude: ''
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { registerRequest } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        setError('Unable to retrieve your location. Please check your permissions.');
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event) => {
    const { name, files } = event.target;
    setFormData((prev) => ({ ...prev, [name]: files[0] || null }));
  };

  const validateStepOne = () => {
    // Personal details validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      return 'Name, email and phone number are required.';
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) return 'Enter a valid email address.';
    // Security details validation
    if (!formData.password || formData.password.length < 6) return 'Password must be at least 6 characters.';
    if (formData.password !== formData.confirmPassword) return 'Password and confirm password must match.';
    // Address details validation
    if (!formData.street.trim() || !formData.city.trim() || !formData.postalCode.trim()) {
      return 'Please fill in your address details.';
    }
    return '';
  };

  const validateStepTwo = () => {
    if (!formData.cnic.trim()) return 'CNIC number is required for verification.';
    if (!formData.userPhoto) return 'A live photo of yourself is required.';
    if (!formData.idCardPhoto) return 'A live photo of your ID card is required.';
    if (isBusinessRole && !formData.companyName.trim()) return 'Company name is required.';
    if (formData.role === 'Supplier' && !formData.ntnPhoto) return 'NTN verification document is mandatory for suppliers.';
    return '';
  };

  const goNext = () => {
    const message = validateStepOne();
    if (message) {
      setError(message);
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const message = validateStepTwo();
    if (message) {
      setError(message);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        street: formData.street.trim(),
        city: formData.city.trim(),
        postalCode: formData.postalCode.trim(),
        password: formData.password,
        role: formData.role,
        cnic: formData.cnic.trim(),
        userPhoto: formData.userPhoto,
        idCardPhoto: formData.idCardPhoto,
        ntnPhoto: formData.ntnPhoto,
        latitude: formData.latitude,
        longitude: formData.longitude,
        ...(isBusinessRole && { companyName: formData.companyName.trim() }),
      };
      const data = await registerRequest(payload);
      setSuccess(data.message || 'Account created successfully. Please login.');
      setFormData(initialState);
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-page">
      <AuthNavbar />

      <section className="register-shell">
        <aside className="register-info d-flex flex-column justify-content-center pe-lg-5 py-lg-5">
          <div className="badge-hero mb-4" style={{ width: 'fit-content', fontSize: '0.75rem' }}>2-STEP ONBOARDING</div>
          <h1 className="display-5 fw-extra-bold ls-tight mb-4">
            Join <span className="text-brand" style={{ fontWeight: 800 }}>ConMat</span> with the right
            marketplace role.
          </h1>
          <p className="fs-5 text-secondary mb-0" style={{ maxWidth: '480px', lineHeight: '1.6' }}>
            Customers can buy immediately. Suppliers are kept pending until admin approval,
            which protects the marketplace from fake listings and unreliable sellers.
          </p>
        </aside>

        <section className="register-card">
          <div className="register-card__header">
            <div className="icon-box icon-box-trust rounded-4 d-flex align-items-center justify-content-center shadow-theme" style={{ width: '48px', height: '48px' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2>Create Account</h2>
              <p>{step === 1 ? 'Start with your personal details.' : `Selected role: ${selectedRole?.title}`}</p>
            </div>
          </div>

          <FormAlert type="error">{error}</FormAlert>
          <FormAlert type="success">{success}</FormAlert>

          <div className="register-progress">
            <div className={`register-progress__item ${step === 1 ? 'register-progress__item--active' : ''}`}>
              <span>1</span>
              Basic info
            </div>
            <div className={`register-progress__line ${step === 2 ? 'register-progress__line--active' : ''}`} />
            <div className={`register-progress__item ${step === 2 ? 'register-progress__item--active' : ''}`}>
              <span>2</span>
              Verification
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
                    <input name="phone" value={formData.phone} onChange={handleChange} placeholder="03xx xxxxxxx" />
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
                      <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Minimum 6 characters" />
                    </div>
                  </label>
                  <label>
                    <span>Confirm password</span>
                    <div className="register-card__field">
                      <KeyRound size={18} style={{ opacity: 0.5 }} />
                      <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat password" />
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
                    <input name="city" value={formData.city} onChange={handleChange} placeholder="Karachi" />
                  </label>
                  <label>
                    <span>Postal code</span>
                    <input name="postalCode" value={formData.postalCode} onChange={handleChange} placeholder="75500" />
                  </label>
                </div>
              </div>

              <button className="btn btn-orange-cta register-card__button" type="button" onClick={goNext}>
                Next step <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            <form className="register-card__form" onSubmit={handleSubmit}>
              <div className="register-card__section">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="icon-box icon-box-trust rounded-4 d-flex align-items-center justify-content-center shadow-theme" style={{ width: '40px', height: '40px' }}>
                    <ShieldCheck size={20} />
                  </div>
                  <span className="register-card__section-title mb-0">Identity Verification</span>
                </div>

                <label>
                  <span>CNIC Number (Identity)</span>
                  <div className="register-card__field">
                    <ShieldCheck size={18} style={{ opacity: 0.5 }} />
                    <input name="cnic" value={formData.cnic} onChange={handleChange} placeholder="42xxx-xxxxxxx-x" />
                  </div>
                </label>
              </div>

              <div className="register-card__section">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="icon-box icon-box-security rounded-4 d-flex align-items-center justify-content-center shadow-theme" style={{ width: '40px', height: '40px' }}>
                    <Camera size={20} />
                  </div>
                  <span className="register-card__section-title mb-0">Verification Documents</span>
                </div>

                <label>
                  <span>Live photo of yourself (Selfie)</span>
                  <div className="register-card__field register-card__field--file">
                    <Camera size={18} style={{ opacity: 0.5 }} />
                    <input type="file" id="userPhoto" name="userPhoto" accept="image/*" capture="user" onChange={handleFileChange} />
                    <span className="file-custom-label">{formData.userPhoto ? formData.userPhoto.name : 'Tap to capture selfie'}</span>
                  </div>
                </label>

                <label>
                  <span>Live photo of ID Card (Front)</span>
                  <div className="register-card__field register-card__field--file">
                    <Camera size={18} style={{ opacity: 0.5 }} />
                    <input type="file" id="idCardPhoto" name="idCardPhoto" accept="image/*" capture="environment" onChange={handleFileChange} />
                    <span className="file-custom-label">{formData.idCardPhoto ? formData.idCardPhoto.name : 'Tap to capture photo'}</span>
                  </div>
                </label>

                {isBusinessRole && (
                  <label>
                    <span>Live photo of NTN Document {formData.role === 'Supplier' ? '(Mandatory)' : '(Optional)'}</span>
                    <div className="register-card__field register-card__field--file">
                      <Camera size={18} style={{ opacity: 0.5 }} />
                      <input type="file" id="ntnPhoto" name="ntnPhoto" accept="image/*" capture="environment" onChange={handleFileChange} />
                      <span className="file-custom-label">{formData.ntnPhoto ? formData.ntnPhoto.name : 'Tap to capture photo'}</span>
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
                    <span>Business live location</span>
                    <div className="register-card__field" style={{ cursor: locating ? 'wait' : 'pointer' }} onClick={!locating ? fetchLocation : undefined}>
                      <MapPin size={18} style={{ opacity: 0.5 }} />
                      <div className="flex-grow-1" style={{ fontWeight: 800, fontSize: '14px', color: formData.latitude ? '#1c2333' : '#94a3b8' }}>
                        {locating ? 'Capturing...' : (formData.latitude ? `Verified: ${formData.latitude.toFixed(4)}, ${formData.longitude.toFixed(4)}` : 'Pin live location')}
                      </div>
                      {formData.latitude && <ShieldCheck size={18} style={{ color: '#059669' }} />}
                    </div>
                  </label>
                </div>
              )}

              <div className="register-card__actions">
                <button type="button" className="register-card__back" onClick={() => setStep(1)}>
                  <ArrowLeft size={18} /> Back
                </button>
                <button className="btn btn-orange-cta register-card__button" type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Account'}
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