import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function RouteEffects() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    document.body.style.removeProperty('overflow');

    if (hash) {
      const targetId = decodeURIComponent(hash.slice(1));
      const frame = window.requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return () => window.cancelAnimationFrame(frame);
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    return undefined;
  }, [pathname, hash]);

  return null;
}
