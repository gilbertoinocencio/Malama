import React from 'react';

/**
 * Wraps a dynamic import() with retry-then-reload logic.
 * When a Vite PWA deploys new chunks, the old index.html (cached by the
 * Service Worker) still references stale chunk hashes that no longer exist.
 * This wrapper catches the "Failed to fetch dynamically imported module" error
 * and forces a single page reload to fetch fresh HTML with correct hashes.
 * Uses sessionStorage to prevent infinite reload loops.
 */
export function lazyRetry<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T } | { [key: string]: T }>,
  moduleName: string,
): Promise<{ default: T }> {
  const storageKey = `lazyRetry-${moduleName}`;

  return new Promise((resolve, reject) => {
    importFn()
      .then((module) => {
        sessionStorage.removeItem(storageKey);
        const mod = module as any;
        resolve({ default: mod[moduleName] || mod.default });
      })
      .catch((error: Error) => {
        if (!sessionStorage.getItem(storageKey)) {
          sessionStorage.setItem(storageKey, '1');
          window.location.reload();
        } else {
          sessionStorage.removeItem(storageKey);
          reject(error);
        }
      });
  });
}
