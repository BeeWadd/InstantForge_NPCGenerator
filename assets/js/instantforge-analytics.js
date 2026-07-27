const environment = import.meta.env ?? {};

export const CONSENT_STORAGE_KEY = 'instantforge.analyticsConsent';
export const CONSENT_POLICY_VERSION = '2026-07-privacy-1';

const measurementId = environment.VITE_GA_MEASUREMENT_ID ?? '';
const analyticsEnabled = environment.VITE_ENABLE_ANALYTICS === 'true'
  && /^G-[A-Z0-9]+$/i.test(measurementId);
const shouldThrow = Boolean(environment.DEV || environment.MODE === 'analytics-test');

const EVENT_PARAMETERS = Object.freeze({
  generation_complete: 'generator_type',
  save_complete: 'generator_type',
  forge_open: 'source_page',
  export_complete: 'format',
  import_complete: 'result',
});

let googleLoaded = false;
let googleLoading;

function getStorage() {
  try {
    localStorage.setItem('__instantforge_consent_probe__', '1');
    localStorage.removeItem('__instantforge_consent_probe__');
    return localStorage;
  } catch {
    return null;
  }
}

export function getAnalyticsConsent() {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const saved = JSON.parse(storage.getItem(CONSENT_STORAGE_KEY) ?? 'null');
    if (!saved || !['allow', 'decline'].includes(saved.choice) || saved.policyVersion !== CONSENT_POLICY_VERSION) {
      return null;
    }
    return { choice: saved.choice, policyVersion: saved.policyVersion };
  } catch {
    return null;
  }
}

function saveConsent(choice) {
  getStorage()?.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
    choice,
    policyVersion: CONSENT_POLICY_VERSION,
  }));
}

function clearGoogleCookies() {
  const hostParts = location.hostname.split('.');
  const domains = ['', location.hostname, ...hostParts.map((_, index) => `.${hostParts.slice(index).join('.')}`)];
  for (const name of document.cookie.split(';').map((cookie) => cookie.trim().split('=', 1)[0])) {
    if (!/^_ga(?:_|$)/.test(name)) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain ? `; domain=${domain}` : ''}`;
    }
  }
}

function gtag(...args) {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) window.gtag = (...command) => window.dataLayer.push(command);
  window.gtag(...args);
}

function loadGoogleTag() {
  if (!analyticsEnabled || googleLoaded) return Promise.resolve(false);
  if (googleLoading) return googleLoading;

  googleLoading = new Promise((resolve) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.onload = () => {
      googleLoaded = true;
      gtag('js', new Date());
      gtag('consent', 'default', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
      gtag('set', 'allow_google_signals', false);
      gtag('set', 'allow_ad_personalization_signals', false);
      gtag('config', measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        linker: { accept_incoming: false },
      });
      resolve(true);
    };
    script.onerror = () => resolve(false);
    document.head.append(script);
  });
  return googleLoading;
}

function disableGoogle() {
  if (googleLoaded) {
    gtag('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  }
  clearGoogleCookies();
}

async function enableGoogle() {
  const loaded = await loadGoogleTag();
  if (googleLoaded) {
    gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    window.dispatchEvent(new Event('instantforgeanalyticsready'));
  }
  return loaded;
}

export function validateAnalyticsEvent(name, parameters) {
  const expectedParameter = EVENT_PARAMETERS[name];
  const supplied = Object.keys(parameters ?? {});
  return Boolean(expectedParameter)
    && supplied.length === 1
    && supplied[0] === expectedParameter
    && typeof parameters[expectedParameter] === 'string'
    && parameters[expectedParameter].length > 0;
}

export function trackAnalyticsEvent(name, parameters) {
  if (!validateAnalyticsEvent(name, parameters)) {
    const error = new TypeError(`InstantForge rejected analytics event: ${name}`);
    if (shouldThrow) throw error;
    console.warn(error.message);
    return false;
  }
  if (!analyticsEnabled || getAnalyticsConsent()?.choice !== 'allow' || !googleLoaded) return false;
  gtag('event', name, parameters);
  return true;
}

function createButton(label, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  return button;
}

function installConsentControls() {
  const settings = createButton('Privacy settings', 'privacy-settings-button btn-secondary');
  settings.setAttribute('aria-haspopup', 'dialog');

  const dialog = document.createElement('section');
  dialog.className = 'privacy-dialog';
  dialog.hidden = true;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'privacy-dialog-title');
  const title = document.createElement('h2');
  title.id = 'privacy-dialog-title';
  title.textContent = 'Privacy settings';
  const copy = document.createElement('p');
  copy.textContent = 'Analytics is optional. InstantForge works the same if you decline. This choice stores only your selection and this policy version, not an account or identifier.';
  const actions = document.createElement('div');
  actions.className = 'privacy-actions';
  const allow = createButton('Allow analytics', 'btn-primary');
  const decline = createButton('Decline analytics', 'btn-secondary');
  const close = createButton('Close', 'btn-secondary');
  actions.append(allow, decline, close);
  dialog.append(title, copy, actions);

  const banner = document.createElement('aside');
  banner.className = 'privacy-banner';
  banner.setAttribute('aria-label', 'Analytics preference');
  const bannerCopy = document.createElement('p');
  bannerCopy.textContent = 'Optional analytics are off unless you allow them. Generated and saved content stays in your browser.';
  const bannerActions = document.createElement('div');
  bannerActions.className = 'privacy-actions';
  const bannerAllow = createButton('Allow analytics', 'btn-primary');
  const bannerDecline = createButton('Decline analytics', 'btn-secondary');
  bannerActions.append(bannerAllow, bannerDecline);
  banner.append(bannerCopy, bannerActions);

  const setChoice = async (choice) => {
    saveConsent(choice);
    if (choice === 'allow') await enableGoogle();
    else disableGoogle();
    banner.hidden = true;
    dialog.hidden = true;
    settings.focus();
  };
  allow.addEventListener('click', () => setChoice('allow'));
  bannerAllow.addEventListener('click', () => setChoice('allow'));
  decline.addEventListener('click', () => setChoice('decline'));
  bannerDecline.addEventListener('click', () => setChoice('decline'));
  close.addEventListener('click', () => {
    dialog.hidden = true;
    settings.focus();
  });
  settings.addEventListener('click', () => {
    banner.hidden = true;
    dialog.hidden = false;
    (getAnalyticsConsent()?.choice === 'allow' ? decline : allow).focus();
  });

  document.body.append(settings, dialog);
  if (!getAnalyticsConsent()) document.body.append(banner);
}

export function initializeAnalytics() {
  if (document.documentElement.dataset.analyticsInitialized) return Promise.resolve(false);
  document.documentElement.dataset.analyticsInitialized = 'true';
  installConsentControls();
  if (getAnalyticsConsent()?.choice === 'allow') return enableGoogle();
  return Promise.resolve(false);
}

export function forgeSourcePage(referrer = document.referrer) {
  if (!referrer) return 'direct';
  try {
    const path = new URL(referrer, location.origin).pathname;
    if (path.endsWith('/npc-generator.html')) return 'npc_generator';
    if (path.endsWith('/magic-item-generator.html')) return 'magic_item_generator';
    if (path.endsWith('/tavern-generator.html')) return 'tavern_generator';
    if (path.endsWith('/weapon-generator.html')) return 'weapon_generator';
    if (path.endsWith('/forge.html')) return 'forge';
    if (path.endsWith('/index.html') || path.endsWith('/')) return 'landing';
  } catch {
    // Referrer is deliberately reduced to a fixed category below.
  }
  return 'direct';
}
