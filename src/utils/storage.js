export const Storage = {
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(`lumina_puzzle_${key}`);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.error(`Error reading key ${key} from storage:`, e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(`lumina_puzzle_${key}`, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Error writing key ${key} to storage:`, e);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(`lumina_puzzle_${key}`);
      return true;
    } catch (e) {
      console.error(`Error removing key ${key} from storage:`, e);
      return false;
    }
  },

  clear() {
    try {
      // Clear only game related keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('lumina_puzzle_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      return true;
    } catch (e) {
      console.error('Error clearing game storage:', e);
      return false;
    }
  }
};
