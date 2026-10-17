import { useEffect, useState } from 'react';
import { Bell, Landmark, LoaderCircle, Lock, Save, Star, Trash2, WalletCards } from "lucide-react";
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import RoleNavbar from '../../components/common/RoleNavbar';
import PasswordInput from '../../components/common/PasswordInput';
import { changePassword } from '../../services/profileService';
import { getNotificationPreferences, updateNotificationPreferences } from '../../services/notificationService';
import {
  addSellerPayoutMethod,
  getSellerPayoutMethods,
  removeSellerPayoutMethod,
  setDefaultSellerPayoutMethod,
} from '../../services/paymentService';
import "./SettingPage.css";

const notificationOptions = [
  { key: 'orderUpdates', label: 'Order Updates' },
  { key: 'bidUpdates', label: 'Bid Updates' },
  { key: 'paymentInvoices', label: 'Payment Invoices' },
  { key: 'adminAlerts', label: 'Admin Alerts' },
  { key: 'emailEnabled', label: 'Email Enabled' },
];

const defaultPreferences = Object.fromEntries(notificationOptions.map(({ key }) => [key, true]));

const normalizePreferences = (value = {}) => Object.fromEntries(
  notificationOptions.map(({ key }) => [key, typeof value[key] === 'boolean' ? value[key] : true]),
);

function StatusMessage({ text, isError }) {
  if (!text) return null;
  return (
    <div
      className={`settings-page__message${isError ? ' settings-page__message--error' : ' settings-page__message--success'}`}
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
    >
      {text}
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(null);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [visiblePasswords, setVisiblePasswords] = useState({ currentPassword: false, newPassword: false, confirmPassword: false });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [payoutData, setPayoutData] = useState({ providers: [], methods: [] });
  const [payoutForm, setPayoutForm] = useState({ provider: 'JazzCash', accountTitle: '', accountIdentifier: '', isDefault: false });
  const [payoutAction, setPayoutAction] = useState('');
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const isSeller = ['Supplier', 'Wholesaler', 'Retailer'].includes(user?.role);
  const payoutLoading = Boolean(payoutAction);

  const showMsg = (text, error = false) => {
    setMessage(text);
    setIsError(error);
    setTimeout(() => setMessage(''), 3000);
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    let isMounted = true;

    const loadPreferences = async () => {
      try {
        const nextPreferences = await getNotificationPreferences();
        if (isMounted) setPreferences(normalizePreferences(nextPreferences));
      } catch {
        if (isMounted) setPreferences({ ...defaultPreferences });
      }
    };

    const loadPayoutMethods = async () => {
      if (!isSeller) return;
      try {
        const nextData = await getSellerPayoutMethods();
        if (isMounted) setPayoutData(nextData);
      } catch (error) {
        if (isMounted) {
          setPayoutData({ providers: ['JazzCash', 'Easypaisa', 'NayaPay', 'UBL', 'Meezan Bank'], methods: [] });
          showMsg(error.response?.data?.message || 'Unable to load payout methods.', true);
          setPayoutAction('');
        }
      }
    };

    loadPreferences();
    loadPayoutMethods();
    return () => {
      isMounted = false;
    };
  }, [user, navigate, isSeller]);

  const refreshPayoutMethods = async () => {
    const nextData = await getSellerPayoutMethods();
    setPayoutData(nextData);
  };

  const savePayoutMethod = async (event) => {
    event.preventDefault();
    setPayoutAction('add');
    try {
      await addSellerPayoutMethod(payoutForm);
      await refreshPayoutMethods();
      setPayoutForm((current) => ({ ...current, accountTitle: '', accountIdentifier: '', isDefault: false }));
      showMsg('Payout method added securely.');
    } catch (error) {
      showMsg(error.response?.data?.message || error.message || 'Unable to add payout method.', true);
    } finally {
      setPayoutAction('');
    }
  };

  const makeDefaultPayoutMethod = async (methodId) => {
    setPayoutAction(`default-${methodId}`);
    try {
      await setDefaultSellerPayoutMethod(methodId);
      await refreshPayoutMethods();
      showMsg('Default payout method updated.');
    } catch (error) {
      showMsg(error.response?.data?.message || 'Unable to update the default payout method.', true);
    } finally {
      setPayoutAction('');
    }
  };

  const deletePayoutMethod = async (method) => {
    if (!window.confirm(`Remove ${method.provider} ending in ${method.maskedIdentifier.slice(-4)}?`)) return;
    setPayoutAction(`delete-${method.id}`);
    try {
      await removeSellerPayoutMethod(method.id);
      await refreshPayoutMethods();
      showMsg('Payout method removed.');
    } catch (error) {
      showMsg(error.response?.data?.message || 'Unable to remove this payout method.', true);
    } finally {
      setPayoutAction('');
    }
  };

  const togglePreference = (key) => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  };

  const savePreferences = async () => {
    setPreferencesSaving(true);
    try {
      const requested = normalizePreferences(preferences);
      await updateNotificationPreferences(requested);
      const persisted = normalizePreferences(await getNotificationPreferences());
      const saved = notificationOptions.every(({ key }) => persisted[key] === requested[key]);
      if (!saved) throw new Error('The saved notification preferences could not be verified.');
      setPreferences(persisted);
      showMsg('Notification settings saved.');
    } catch (error) {
      showMsg(error.response?.data?.message || 'Failed to save notification preferences.', true);
    } finally {
      setPreferencesSaving(false);
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswords((current) => ({ ...current, [name]: value }));
  };

  const togglePasswordVisibility = (field) => {
    setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (!passwords.currentPassword.trim()) {
      showMsg('Current password is required.', true);
      return;
    }
    if (passwords.newPassword.length < 8) {
      showMsg('New password must be at least 8 characters.', true);
      return;
    }
    if (!/[A-Z]/.test(passwords.newPassword) || !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(passwords.newPassword)) {
      showMsg('New password must contain at least one capital letter and one special character.', true);
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      showMsg('New password and confirm password do not match.', true);
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setVisiblePasswords({ currentPassword: false, newPassword: false, confirmPassword: false });
      showMsg('Password changed successfully.');
    } catch (error) {
      showMsg(error.response?.data?.message || 'Failed to change password. Check your current password and try again.', true);
    } finally {
      setPasswordSaving(false);
    }
  };

  if (!preferences) {
    return (
      <>
        <RoleNavbar />
        <main className="settings-page"><p className="settings-page__loading">Loading settings...</p></main>
      </>
    );
  }

  return (
    <>
      <RoleNavbar />
      <main className="settings-page conmat-page-shell">
        <section className="settings-page__hero conmat-page-hero position-relative">
      
        <div className="setting-eyebrow">
        <p>Preferences</p>
        </div>
        <h1>Settings</h1>
        <span>Control notifications, account security and platform communication.</span>
      </section>

      <StatusMessage text={message} isError={isError} />

      <section className="settings-page__grid">
        {isSeller && (
          <div className="settings-card settings-payout-card">
            <div className="settings-card__head">
              <Landmark />
              <div>
                <h2>Seller payouts</h2>
                <p>Add the wallet or bank account where ConMat should send your earnings.</p>
              </div>
            </div>

            <div className={`settings-payout-status settings-payout-status--${payoutData.methods.length ? 'ready' : 'pending'}`}>
              <strong>{payoutData.methods.length ? 'Ready to receive seller payments' : 'Payout method required'}</strong>
              <span>
                {payoutData.methods.length
                  ? 'Your default method will be assigned when a buyer payment succeeds.'
                  : 'Add JazzCash, Easypaisa, NayaPay, UBL, or Meezan Bank before customers place orders.'}
              </span>
            </div>

            <div className="settings-payout-details">
              <p><span>Marketplace commission</span><strong>1% per order</strong></p>
              <p><span>Release timing</span><strong>On receipt confirmation or automatically after 24 hours</strong></p>
            </div>

            {payoutData.methods.length > 0 && (
              <div className="settings-payout-methods">
                {payoutData.methods.map((method) => (
                  <article className="settings-payout-method" key={method.id}>
                    <WalletCards />
                    <div>
                      <strong>{method.provider}{method.isDefault ? ' · Default' : ''}</strong>
                      <span>{method.accountTitle} · {method.maskedIdentifier}</span>
                    </div>
                    <div className="settings-payout-method__actions">
                      {!method.isDefault && (
                        <button type="button" className="settings-icon-button" title="Make default" aria-label="Make this the default payout method" aria-busy={payoutAction === `default-${method.id}`} onClick={() => makeDefaultPayoutMethod(method.id)} disabled={payoutLoading}>
                          {payoutAction === `default-${method.id}` ? <LoaderCircle className="settings-button-spinner" /> : <Star />}
                        </button>
                      )}
                      <button type="button" className="settings-icon-button settings-icon-button--danger" title="Remove payout method" aria-label="Remove this payout method" aria-busy={payoutAction === `delete-${method.id}`} onClick={() => deletePayoutMethod(method)} disabled={payoutLoading}>
                        {payoutAction === `delete-${method.id}` ? <LoaderCircle className="settings-button-spinner" /> : <Trash2 />}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <form className="settings-payout-form" onSubmit={savePayoutMethod}>
              <label>
                Payment method
                <select value={payoutForm.provider} onChange={(event) => setPayoutForm((current) => ({ ...current, provider: event.target.value }))}>
                  {(payoutData.providers.length ? payoutData.providers : ['JazzCash', 'Easypaisa', 'NayaPay', 'UBL', 'Meezan Bank']).map((provider) => (
                    <option key={provider} value={provider}>{provider}</option>
                  ))}
                </select>
              </label>
              <label>
                Account title
                <input type="text" value={payoutForm.accountTitle} onChange={(event) => setPayoutForm((current) => ({ ...current, accountTitle: event.target.value }))} placeholder="Name on the account" maxLength="120" required />
              </label>
              <label className="settings-payout-form__full">
                {['UBL', 'Meezan Bank'].includes(payoutForm.provider) ? 'IBAN or account number' : 'Mobile account number'}
                <input type="text" value={payoutForm.accountIdentifier} onChange={(event) => setPayoutForm((current) => ({ ...current, accountIdentifier: event.target.value }))} placeholder={['UBL', 'Meezan Bank'].includes(payoutForm.provider) ? 'PK00BANK0000000000000000' : '+923001234567'} autoComplete="off" required />
              </label>
              {payoutData.methods.length > 0 && (
                <label className="settings-toggle settings-payout-form__full">
                  <span>Use as default payout method</span>
                  <input type="checkbox" checked={payoutForm.isDefault} onChange={(event) => setPayoutForm((current) => ({ ...current, isDefault: event.target.checked }))} />
                </label>
              )}
              <button type="submit" className="settings-action-button" disabled={payoutLoading} aria-busy={payoutAction === 'add'}>
                {payoutAction === 'add' ? <LoaderCircle className="settings-button-spinner" /> : <Save />}
                {payoutAction === 'add' ? 'Adding...' : 'Add Payout Method'}
              </button>
            </form>

            <p className="settings-payout-note">
              Account identifiers are encrypted at rest and only the final four characters are shown again. Demo-card payments use simulated disbursements; live provider transfers require approved provider API credentials.
            </p>
          </div>
        )}

        <div className="settings-card">
          <div className="settings-card__head">
            <Bell />
            <div>
              <h2>Notification Preferences</h2>
              <p>Select which alerts you want to receive.</p>
            </div>
          </div>

          {notificationOptions.map(({ key, label }) => (
            <label className="settings-toggle" key={key}>
              <span>{label}</span>
              <input type="checkbox" checked={Boolean(preferences[key])} onChange={() => togglePreference(key)} />
            </label>
          ))}

          <button type="button" className="settings-action-button" onClick={savePreferences} disabled={preferencesSaving} aria-busy={preferencesSaving}>
            {preferencesSaving ? <LoaderCircle className="settings-button-spinner" /> : <Save />}
            {preferencesSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>

        <form className="settings-card" onSubmit={handlePasswordSubmit}>
          <div className="settings-card__head">
            <Lock />
            <div>
              <h2>Change Password</h2>
              <p>Use a strong password for account safety.</p>
            </div>
          </div>

          <label>
            Current Password
            <div className="settings-password-field">
              <PasswordInput
                name="currentPassword"
                value={passwords.currentPassword}
                onChange={handlePasswordChange}
                autoComplete="current-password"
                required
                visible={visiblePasswords.currentPassword}
                onToggle={() => togglePasswordVisibility('currentPassword')}
                fieldLabel="current password"
              />
            </div>
          </label>
          <label>
            New Password
            <div className="settings-password-field">
              <PasswordInput
                name="newPassword"
                value={passwords.newPassword}
                onChange={handlePasswordChange}
                autoComplete="new-password"
                required
                minLength="8"
                visible={visiblePasswords.newPassword}
                onToggle={() => togglePasswordVisibility('newPassword')}
                fieldLabel="new password"
              />
            </div>
          </label>
          <label>
            Confirm Password
            <div className="settings-password-field">
              <PasswordInput
                name="confirmPassword"
                value={passwords.confirmPassword}
                onChange={handlePasswordChange}
                autoComplete="new-password"
                required
                minLength="8"
                visible={visiblePasswords.confirmPassword}
                onToggle={() => togglePasswordVisibility('confirmPassword')}
                fieldLabel="confirmed password"
              />
            </div>
          </label>

          <button type="submit" className="settings-action-button" disabled={passwordSaving} aria-busy={passwordSaving}>
            {passwordSaving ? <LoaderCircle className="settings-button-spinner" /> : <Save />}
            {passwordSaving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </section>
      </main>
    </>
  );
}
