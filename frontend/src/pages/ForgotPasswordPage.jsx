import { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, LockKeyhole, Mail } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import AuthNavbar from '../components/common/AuthNavbar';
import FormAlert from '../components/common/FormAlert';
import PasswordInput from '../components/common/PasswordInput';
import {
  requestPasswordReset,
  resetPassword,
  verifyPasswordResetOtp,
} from '../services/authService';
import './LoginPage.css';
import './ForgotPasswordPage.css';

const passwordIssue = (password) => {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password) || !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return 'Password must contain at least one capital letter and one special character.';
  }
  return '';
};

export default function ForgotPasswordPage() {
  const location = useLocation();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState(() => String(location.state?.email || '').trim().toLowerCase());
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [visible, setVisible] = useState({ newPassword: false, confirmPassword: false });
  const [resendSeconds, setResendSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const showRequestError = (requestError, fallback) => {
    const retryAfter = Number(requestError.response?.data?.retryAfterSeconds || 0);
    if (retryAfter > 0) setResendSeconds(retryAfter);
    setError(requestError.response?.data?.message || requestError.message || fallback);
  };

  const sendCode = async (event) => {
    event?.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Enter the email address used for your ConMat account.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await requestPasswordReset(normalizedEmail);
      setEmail(normalizedEmail);
      setOtp('');
      setResetToken('');
      setResendSeconds(Number(response.resendAfterSeconds || 60));
      setMessage(response.message);
      setStep('otp');
    } catch (requestError) {
      showRequestError(requestError, 'Unable to send the reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the complete 6-digit reset code.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await verifyPasswordResetOtp({ email, otp });
      setResetToken(response.resetToken);
      setMessage(response.message);
      setStep('password');
    } catch (requestError) {
      showRequestError(requestError, 'Unable to verify the reset code.');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    const issue = passwordIssue(passwords.newPassword);
    if (issue) {
      setError(issue);
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New password and confirm password must match.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await resetPassword({ resetToken, ...passwords });
      setMessage(response.message);
      setPasswords({ newPassword: '', confirmPassword: '' });
      setResetToken('');
      setStep('success');
    } catch (requestError) {
      showRequestError(requestError, 'Unable to reset your password.');
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = (field) => {
    setVisible((current) => ({ ...current, [field]: !current[field] }));
  };

  const stepNumber = step === 'email' ? 1 : step === 'otp' ? 2 : 3;

  return (
    <main className="login-page forgot-password-page">
      <AuthNavbar />

      <section className="login-page__grid">
        <aside className="login-page__panel forgot-password-panel">
          <span className="login-page__eyebrow">Secure account recovery</span>
          <h1>Reset access to your <span className="text-brand">ConMat</span> workspace.</h1>
          <p>
            We verify password resets through the email attached to your account.
            Codes expire quickly and can only be used to create one reset session.
          </p>
         
        </aside>

        <section className="login-card forgot-password-card" aria-label="Password reset form">
          <div className="forgot-password-progress" aria-label={`Step ${stepNumber} of 3`}>
            {[1, 2, 3].map((number) => (
              <span key={number} className={number <= stepNumber ? 'is-active' : ''}>{number}</span>
            ))}
          </div>

          <div className="login-card__header">
            <div className="icon-box icon-box-trust rounded-4 d-flex align-items-center justify-content-center shadow-theme" style={{ width: '52px', height: '52px' }}>
              {step === 'otp' ? <KeyRound size={24} /> : <LockKeyhole size={24} />}
            </div>
            <div>
              <h2>{step === 'email' ? 'Forgot password?' : step === 'otp' ? 'Check your email' : step === 'password' ? 'Choose a new password' : 'Password updated'}</h2>
              <p>
                {step === 'email' && 'Enter the email connected to your account.'}
                {step === 'otp' && `Enter the 6-digit code sent for ${email}.`}
                {step === 'password' && 'Use a strong password you have not used before.'}
                {step === 'success' && 'Your account is ready for you to sign in again.'}
              </p>
            </div>
          </div>

          <FormAlert type="success">{message}</FormAlert>
          <FormAlert type="error">{error}</FormAlert>

          {step === 'email' && (
            <form className="login-card__form" onSubmit={sendCode}>
              <label>
                <span>Email address</span>
                <div className="login-card__field">
                  <Mail size={18} aria-hidden="true" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => { setEmail(event.target.value); setError(''); }}
                    placeholder="you@conmat.pk"
                    autoComplete="email"
                    required
                  />
                </div>
              </label>
              <button className="btn btn-orange-cta login-card__button" type="submit" disabled={loading}>
                {loading ? 'Sending code...' : 'Send reset code'}
              </button>
            </form>
          )}
           
          {step === 'otp' && (
            <form className="login-card__form" onSubmit={verifyCode}>
              <label>
                <span>6-digit reset code</span>
                <div className="login-card__field forgot-password-code-field">
                  <KeyRound size={18} aria-hidden="true" />
                  <input
                    value={otp}
                    onChange={(event) => { setOtp(event.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength="6"
                    required
                  />
                </div>
              </label>
              <button className="btn btn-orange-cta login-card__button" type="submit" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify code'}
              </button>
              <button
                className="forgot-password-resend"
                type="button"
                onClick={sendCode}
                disabled={loading || resendSeconds > 0}
              >
                {resendSeconds > 0 ? `Send another code in ${resendSeconds}s` : 'Send another code'}
              </button>
            </form>
          )}

          {step === 'password' && (
            <form className="login-card__form" onSubmit={changePassword}>
              <label>
                <span>New password</span>
                <div className="login-card__field">
                  <LockKeyhole size={18} aria-hidden="true" />
                  <PasswordInput
                    name="newPassword"
                    value={passwords.newPassword}
                    onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))}
                    autoComplete="new-password"
                    placeholder="Minimum 8 characters"
                    minLength="8"
                    required
                    visible={visible.newPassword}
                    onToggle={() => toggleVisibility('newPassword')}
                    fieldLabel="new password"
                  />
                </div>
              </label>
              <label>
                <span>Confirm new password</span>
                <div className="login-card__field">
                  <LockKeyhole size={18} aria-hidden="true" />
                  <PasswordInput
                    name="confirmPassword"
                    value={passwords.confirmPassword}
                    onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))}
                    autoComplete="new-password"
                    placeholder="Repeat your new password"
                    minLength="8"
                    required
                    visible={visible.confirmPassword}
                    onToggle={() => toggleVisibility('confirmPassword')}
                    fieldLabel="confirmed password"
                  />
                </div>
              </label>
              <p className="forgot-password-hint">Use at least 8 characters, one capital letter and one special character.</p>
              <button className="btn btn-orange-cta login-card__button" type="submit" disabled={loading}>
                {loading ? 'Updating password...' : 'Reset password'}
              </button>
            </form>
          )}

          {step === 'success' && (
            <Link to="/login" className="btn btn-orange-cta login-card__button forgot-password-login-link">
              Continue to login
            </Link>
          )}

          {step !== 'success' && (
            <Link to="/login" className="forgot-password-back"><ArrowLeft size={15} /> Back to login</Link>
          )}
        </section>
      </section>
    </main>
  );
}
