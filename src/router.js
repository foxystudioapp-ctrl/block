import { Sounds } from './utils/sounds.js';
import { AdService } from './services/adService.js';

class HashRouter {
  constructor() {
    this.routes = {};
    this.container = null;
    this.currentPath = null;
    this.previousPath = null;
    this._navToken = 0; // tembel (lazy) ekran yüklemelerinde yarış durumunu önlemek için
  }

  init(containerId) {
    this.container = document.getElementById(containerId);
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  }

  add(path, screenFactory) {
    this.routes[path] = screenFactory;
  }

  navigate(path) {
    if (this.currentPath && this.currentPath !== path && this.currentPath !== '#/settings') {
      this.previousPath = this.currentPath;
    }
    // Soft tap sound on navigation
    Sounds.playSfx('button-tap');
    
    if (window.location.hash === path) {
      this.resolve();
    } else {
      window.location.hash = path;
    }
  }

  resolve() {
    const path = window.location.hash || '#/';
    this.currentPath = path;
    if (window.closeAllModals) window.closeAllModals();

    // Strip query params for route matching
    const routePath = path.split('?')[0];

    // Default fallback to splash screen
    const screenFactory = this.routes[routePath] || this.routes['#/'];

    if (!this.container || !screenFactory) return;

    // Call cleanup on the outgoing screen to prevent memory leaks
    if (this.currentScreen && typeof this.currentScreen.cleanup === 'function') {
      this.currentScreen.cleanup();
    }

    // Global safety: always hide banner when changing screens
    AdService.hideBanner();

    // Global DOM Cleanup for stuck drag elements
    document.querySelectorAll('.drag-ghost-element').forEach(el => el.remove());

    // Unmount logic
    this.container.innerHTML = '';
    this.currentScreen = null;

    // Navigation token: if a newer navigation starts before an async (lazy)
    // screen finishes importing, we discard the stale result.
    const token = ++this._navToken;

    const mount = (screenElement) => {
      if (token !== this._navToken) return; // a newer navigation superseded this one
      if (screenElement instanceof HTMLElement) {
        this.currentScreen = screenElement;
        this.container.innerHTML = '';
        this.container.appendChild(screenElement);
      } else if (typeof screenElement === 'string') {
        this.currentScreen = null;
        this.container.innerHTML = screenElement;
      }
      window.scrollTo(0, 0);
    };

    const fail = (err) => {
      if (token !== this._navToken) return;
      this.container.innerHTML = `<div style="color:red; padding:20px; font-size:20px;">ROUTER ERROR: ${err.message}<br><pre style="white-space: pre-wrap; font-size: 14px; margin-top: 10px;">${err.stack}</pre></div>`;
      console.error("ROUTER CAUGHT ERROR:", err);
    };

    // Instantiate new screen. Factory may return an HTMLElement/string (sync)
    // or a Promise resolving to one (lazy-loaded screens via dynamic import).
    try {
      const result = screenFactory(this);
      if (result && typeof result.then === 'function') {
        result.then(mount).catch(fail);
      } else {
        mount(result);
      }
    } catch (err) {
      fail(err);
    }
  }
}

export const Router = new HashRouter();
