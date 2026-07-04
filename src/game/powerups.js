import { PlayerState } from '../state/playerState.js';
import { Toast } from '../components/toast.js';
import { Sounds } from '../utils/sounds.js';
import { Haptics } from '../utils/haptics.js';
import { t } from '../utils/i18n.js';

export const Powerups = {
  // Clears a 3x3 area, returns true if success, modifies board in-place
  useBomb(board, r, c, gridSize) {
    const cost = 100;
    if (!PlayerState.useCoins(cost)) {
      Toast.show(t('powerup_bomb_need_coins', { cost }), 'error');
      return false;
    }

    let clearedCount = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const targetR = r + i;
        const targetC = c + j;
        
        if (targetR >= 0 && targetR < gridSize && targetC >= 0 && targetC < gridSize) {
          if (board[targetR][targetC] !== null) {
            board[targetR][targetC] = null;
            clearedCount++;
          }
        }
      }
    }

    Sounds.playSfx('power-up');
    Haptics.vibrate('line-clear');
    Toast.show(t('powerup_bomb_cleared'), 'success');
    return true;
  },

  // Clears all cells of the specified color, modifies board in-place
  useColorBomb(board, color, gridSize) {
    const cost = 200;
    if (!PlayerState.useCoins(cost)) {
      Toast.show(t('powerup_colorbomb_need_coins', { cost }), 'error');
      return false;
    }

    let clearedCount = 0;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (board[r][c] === color) {
          board[r][c] = null;
          clearedCount++;
        }
      }
    }

    Sounds.playSfx('power-up');
    Haptics.vibrate('line-clear');
    Toast.show(t('powerup_colorbomb_cleared', { color: color.toUpperCase() }), 'success');
    return true;
  }
};
