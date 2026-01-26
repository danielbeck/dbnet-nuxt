import { API_BASE } from '@/helpers/api';

let userStoreRef = null;

export function initAnalytics(userStore) {
    userStoreRef = userStore;
}

async function getOrCreateHash() {
    if (!userStoreRef) return undefined;
    const existing = userStoreRef.getHash;
    if (existing) return existing;

    // Try dynamic import of the modern FingerprintJS package
    try {
        const FingerprintJS = (await import('@fingerprintjs/fingerprintjs')).default;
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const visitorId = result && result.visitorId ? result.visitorId : undefined;
        if (visitorId) {
            userStoreRef.setHash(visitorId);
            return visitorId;
        }
    } catch (e) {
        // package not installed or failed — fall back below
    }

    // Fallback: generate a stable-ish client id and persist it in the user store
    const fallbackId = 'anon-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    try { userStoreRef.setHash(fallbackId) } catch (e) { }
    return fallbackId;
}

export async function trackPageView(to, from) {
    if (!userStoreRef) return;
    const fingerprint = userStoreRef.getHash;
    if (fingerprint) {
        ping(fingerprint, 'internal', to?.path || '', from?.path || '');
        return;
    }
    const fp = await getOrCreateHash();
    if (fp) {
        ping(fp, 'external', to?.path || '', document?.referrer || (from?.path || ''));
    }
}

function ping(user, type, page, referrer) {
    try {
        if (process.env.NODE_ENV === 'development') return;
        if (typeof window === 'undefined') return;
        if (window.location.origin && window.location.origin.match('local')) return;

        fetch(`${API_BASE}/fp.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user,
                type,
                page,
                referrer,
                agent: navigator.userAgent,
                date: new Date().getTime()
            })
        });
    } catch (e) {
        // swallow any errors from analytics ping
    }
}
