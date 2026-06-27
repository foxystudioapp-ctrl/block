/**
 * lifecycle.js
 * Utility for managing event listeners, timeouts, and requestAnimationFrames
 * to prevent memory leaks when screens are unmounted.
 */

export function createScope(options = {}) {
  const timeouts = new Set();
  const intervals = new Set();
  const rafs = new Set();
  const listeners = [];
  const cleanups = [];
  const name = options.name || 'UnnamedScope';

  return {
    setT: (fn, delay) => {
      const id = setTimeout(() => {
        timeouts.delete(id);
        fn();
      }, delay);
      timeouts.add(id);
      return id;
    },
    clearT: (id) => {
      clearTimeout(id);
      timeouts.delete(id);
    },
    setI: (fn, delay) => {
      const id = setInterval(fn, delay);
      intervals.add(id);
      return id;
    },
    clearI: (id) => {
      clearInterval(id);
      intervals.delete(id);
    },
    raf: (fn) => {
      const id = requestAnimationFrame((t) => {
        rafs.delete(id);
        fn(t);
      });
      rafs.add(id);
      return id;
    },
    on: (el, type, handler, opts) => {
      if (!el || !el.addEventListener) return;
      el.addEventListener(type, handler, opts);
      listeners.push({ el, type, handler, opts });
    },
    onCleanup: (fn) => {
      cleanups.push(fn);
    },
    adoptStyle: (styleEl) => {
      cleanups.push(() => {
        if (styleEl && styleEl.parentNode) {
          styleEl.parentNode.removeChild(styleEl);
        }
      });
    },
    destroy: () => {
      timeouts.forEach(clearTimeout);
      timeouts.clear();

      intervals.forEach(clearInterval);
      intervals.clear();

      rafs.forEach(cancelAnimationFrame);
      rafs.clear();

      listeners.forEach(({ el, type, handler, opts }) => {
        if (el && el.removeEventListener) {
          el.removeEventListener(type, handler, opts);
        }
      });
      listeners.length = 0;

      cleanups.forEach(fn => fn());
      cleanups.length = 0;
    }
  };
}
