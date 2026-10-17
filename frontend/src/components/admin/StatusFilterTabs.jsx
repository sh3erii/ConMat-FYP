import './StatusFilterTabs.css';

export default function StatusFilterTabs({ options = [], active = 'All', onChange }) {
  return (
    <div className="status-filter-tabs" role="tablist" aria-label="Status filters">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`status-filter-tab ${active === option ? 'status-filter-tab--active' : ''}`}
          onClick={() => onChange?.(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
