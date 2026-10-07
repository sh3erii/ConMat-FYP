import { Eye, EyeOff } from 'lucide-react';
import './PasswordInput.css';

export default function PasswordInput({
  visible,
  onToggle,
  toggleClassName = '',
  fieldLabel = 'password',
  ...inputProps
}) {
  return (
    <>
      <input {...inputProps} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className={`password-visibility-toggle ${toggleClassName}`.trim()}
        onClick={onToggle}
        aria-label={visible ? `Hide ${fieldLabel}` : `Show ${fieldLabel}`}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </>
  );
}
