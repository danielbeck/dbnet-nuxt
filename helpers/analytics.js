import Fingerprint from 'fingerprintjs2';
import { API_BASE } from '@/helpers/api';

let userStoreRef = null;

export function initAnalytics(userStore) {
    userStoreRef = userStore;
}

export function trackPageView(to, from) {
    if (!userStoreRef) return;

    let fingerprint = userStoreRef.getHash;
    if (fingerprint) {
        ping(fingerprint, "internal", to.path, from.path);
    } else {
        window.setTimeout(() => {
            Fingerprint.get(components => {
                let fingerprint = Fingerprint.x64hash128(components.map(pair => {
                    return pair.value
                }).join(), 31);
                userStoreRef.setHash(fingerprint);
                ping(fingerprint, "external", to.path, document.referrer);
            })
        }, 500);
    }
}

function ping(user, type, page, referrer) {
    if (process.env.NODE_ENV === 'development') return;
    if (window.location.origin.match('local')) return;

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
}
