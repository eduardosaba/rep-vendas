'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface UpdateProps {
  id?: number;
  version?: string;
  title?: string;
  date?: string;
  highlights?: string[];
  color_from?: string;
  color_to?: string;
}

export default function UpdateModalClient({
  update,
}: {
  update?: UpdateProps | null;
}) {
  const [show, setShow] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    try {
      if (!update) return;
      // Prefer ID-based check when available
      const lsGet = typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function'
        ? window.localStorage.getItem.bind(window.localStorage)
        : () => null;

      const seenById = update.id ? lsGet('repvendas_last_seen_update_id') : null;
      if (update.id && (!seenById || String(seenById) !== String(update.id))) {
        setShow(true);
        return;
      }

      // Fallback to version-based check for backward compatibility
      if (update.version) {
        const seenByVersion = lsGet('repvendas_last_seen_version');
        if (!seenByVersion || String(seenByVersion) !== String(update.version)) {
          setShow(true);
        }
      }
    } catch (e) {
      // ignore
    }
  }, [update]);

  if (!update) return null;

  const handleClose = () => {
      try {
        // Persist only if the user opted to not show again
        if (dontShowAgain && update) {
          // Persist client-side by ID when possible
          try {
            if (typeof window !== 'undefined' && typeof window.localStorage?.setItem === 'function') {
              if (update.id) {
                window.localStorage.setItem('repvendas_last_seen_update_id', String(update.id));
              } else if (update.version) {
                // fallback to version key for older records
                window.localStorage.setItem('repvendas_last_seen_version', String(update.version));
              }
            }
          } catch {}

          // Try to persist server-side as well (best-effort)
          try {
            fetch('/api/me/seen-update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: update.id, version: update.version }),
              credentials: 'same-origin',
            }).catch(() => {
              /* ignore network errors */
            });
          } catch {
            // ignore
          }
        }
    } catch (e) {
      // ignore
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
        <div
          className="p-6"
          style={{
            background: `linear-gradient(to right, ${update.color_from || '#0d1b2c'}, ${update.color_to || '#0d1b2c'})`,
          }}
        >
          <div className="flex items-start justify-between gap-4 text-white">
            <div>
              <h2 className="text-2xl font-bold">
                {update.title || 'Novidades'}
              </h2>
              <p className="text-sm opacity-90 mt-1">
                v{update.version} •{' '}
                {update.date
                  ? new Date(update.date).toLocaleDateString('pt-BR')
                  : ''}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30"
            >
              <X className="text-white" />
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            O que há de novo
          </h3>
          <ul className="space-y-3 mb-6 text-gray-700 dark:text-slate-300">
            {(update.highlights || []).map((h, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-lg mt-0.5">
                  {h.match(/^\p{Emoji_Presentation}|^\p{Emoji}/u) ? h[0] : '✅'}
                </span>
                <span>{h}</span>
              </li>
            ))}
          </ul>

          <div className="flex justify-end">
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="mr-2 rounded"
                />
                Não mostrar novamente para esta versão
              </label>

              <button
                onClick={handleClose}
                className="px-6 py-3 rounded-lg bg-[var(--primary)] text-white font-medium"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
