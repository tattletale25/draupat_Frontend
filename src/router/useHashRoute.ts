import { useEffect, useState } from 'react';

/** Minimal hash-based router (no react-router-dom — no npm access in this
 * environment). Reads/writes window.location.hash, e.g. "#/dashboard". */
function currentPath(): string {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/dashboard';
}

export function useHashRoute(): [string, (path: string) => void] {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onChange = () => setPath(currentPath());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = (next: string) => {
    window.location.hash = next;
  };

  return [path, navigate];
}
