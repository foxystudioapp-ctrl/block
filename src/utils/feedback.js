import { t } from './i18n.js';
import { Sounds } from './sounds.js';
import { PlayerState } from '../state/playerState.js';

/**
 * Shows floating text feedback in the center of the board
 * @param {HTMLElement} container - The board or game container element
 * @param {number|string} linesCleared - The number of lines cleared (2,3,4) or 'defeat'
 */
export const showFeedback = (container, linesCleared) => {
  // If linesCleared is < 2 and not 'defeat', don't show combo text
  if (linesCleared !== 'defeat' && linesCleared < 2) return;

  let textKey = '';
  let colorClass = '';
  let animationClass = 'animate-float-up-fade';

  if (linesCleared === 'defeat') {
    textKey = 'combo_defeat';
    colorClass = 'from-red-600 to-red-900';
    animationClass = 'animate-defeat-slam';
  } else {
    // Only 'defeat' feedback is needed. 
    // Positive combo animations (good, awesome, excellent) are removed to avoid overlapping with yellow combo texts.
    return;
  }

  if (!textKey) return;

  const translatedText = t(textKey);
  
  if (linesCleared !== 'defeat') {
    Sounds.playSfx('praise-crystal');
  }
  
  // Speak the text via TTS
  if (PlayerState && PlayerState.state && PlayerState.state.soundEnabled) {
    Sounds.speak(translatedText, PlayerState.state.language);
  }

  // Create DOM element
  const el = document.createElement('div');
  // Use fixed positioning so it overlays everything including modals
  el.className = `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[9999] flex items-center justify-center ${animationClass}`;
  
  el.innerHTML = `
    <span class="text-5xl md:text-6xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r ${colorClass} drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]" style="-webkit-text-stroke: 1.5px rgba(255,255,255,0.8);">
      ${translatedText}
    </span>
  `;

  document.body.appendChild(el);

  // Clean up element after animation
  setTimeout(() => {
    if (el.parentNode === document.body) {
      document.body.removeChild(el);
    }
  }, 3000);
};
