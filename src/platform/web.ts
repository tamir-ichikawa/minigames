import type { Platform } from '../core/types';
/** Replace this factory at the application boundary for a native host. */
export function createWebPlatform(): Platform {
  const memory = new Map<string, unknown>();
  return {
    storage: {
      read<T>(key: string, fallback: T): T {
        if (memory.has(key)) return memory.get(key) as T;
        try { const value = localStorage.getItem(`minigames:v1:${key}`); return value === null ? fallback : JSON.parse(value); }
        catch { return fallback; }
      },
      write(key, value) {
        memory.set(key, value);
        try { localStorage.setItem(`minigames:v1:${key}`, JSON.stringify(value)); return true; }
        catch { return false; }
      }
    },
    readLegacyNumber(key) {
      try { const raw = localStorage.getItem(key); if (raw === null) return null; const n = Number(raw); return Number.isFinite(n) ? n : null; }
      catch { return null; }
    },
    onSuspend(callback) {
      const handler = () => { if (document.hidden) callback(); };
      document.addEventListener('visibilitychange', handler);
      return () => document.removeEventListener('visibilitychange', handler);
    }
  };
}
