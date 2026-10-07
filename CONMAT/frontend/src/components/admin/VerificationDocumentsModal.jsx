import { useEffect } from 'react';
import { ExternalLink, FileText, X } from 'lucide-react';
import './VerificationDocumentsModal.css';

export default function VerificationDocumentsModal({ user, onClose }) {
  useEffect(() => {
    if (!user) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [user, onClose]);

  if (!user) return null;

  const documents = Array.isArray(user.verificationDocuments) ? user.verificationDocuments : [];

  return (
    <div className="verification-documents-modal" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className="verification-documents-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="verification-documents-modal-title"
      >
        <header className="verification-documents-modal__header">
          <div>
            <span>{user.role} verification</span>
            <h2 id="verification-documents-modal-title">{user.name}&apos;s documents</h2>
            <p>{user.email}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close verification documents">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        {documents.length > 0 ? (
          <div className="verification-documents-modal__grid">
            {documents.map((document) => {
              const isPdf = /\.pdf(?:$|[?#])/i.test(document.url);
              return (
                <article className="verification-documents-modal__card" key={document.key}>
                  <a href={document.url} target="_blank" rel="noreferrer" className="verification-documents-modal__preview">
                    {isPdf ? (
                      <FileText size={48} aria-hidden="true" />
                    ) : (
                      <img src={document.url} alt={`${document.label} submitted by ${user.name}`} loading="lazy" />
                    )}
                  </a>
                  <div className="verification-documents-modal__card-footer">
                    <strong>{document.label}</strong>
                    <a href={document.url} target="_blank" rel="noreferrer">
                      Open full document <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="verification-documents-modal__empty">
            <FileText size={34} aria-hidden="true" />
            <h3>No documents submitted</h3>
            <p>This user does not have any verification documents on file.</p>
          </div>
        )}
      </section>
    </div>
  );
}
