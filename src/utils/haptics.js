import { Storage } from './storage.js';
import { Haptics as CapHaptics, ImpactStyle } from '@capacitor/haptics';

class HapticManager {
  constructor() {
    this.hapticEnabled = Storage.get('hapticEnabled', true);
  }

  setHapticEnabled(enabled) {
    this.hapticEnabled = enabled;
    Storage.set('hapticEnabled', enabled);
  }

  async vibrate(type) {
    if (!this.hapticEnabled) return;

    try {
      switch (type) {
        case 'button-tap':
          await CapHaptics.impact({ style: ImpactStyle.Light });
          break;
        case 'block-place':
          await CapHaptics.impact({ style: ImpactStyle.Light });
          break;
        case 'line-clear':
          await CapHaptics.impact({ style: ImpactStyle.Medium });
          break;
        case 'combo':
          await CapHaptics.impact({ style: ImpactStyle.Heavy });
          break;
        case 'game-over':
          await CapHaptics.vibrate({ duration: 100 });
          break;
        case 'new-record':
          await CapHaptics.impact({ style: ImpactStyle.Heavy });
          setTimeout(() => CapHaptics.impact({ style: ImpactStyle.Heavy }), 150);
          break;
        case 'invalid':
          await CapHaptics.vibrate({ duration: 50 });
          break;
        default:
          await CapHaptics.impact({ style: ImpactStyle.Light });
          break;
      }
    } catch (e) {
      console.warn('Haptic vibration failed:', e);
      // Fallback for web/unsupported
      if ('vibrate' in navigator) {
        try {
          switch (type) {
            case 'combo': navigator.vibrate(30); break;
            case 'line-clear': navigator.vibrate(15); break;
            case 'block-place': navigator.vibrate(10); break;
            default: navigator.vibrate(5); break;
          }
        } catch(err) {}
      }
    }
  }
}

export const Haptics = new HapticManager();

