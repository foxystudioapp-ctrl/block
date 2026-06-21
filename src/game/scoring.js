import { t } from '../utils/i18n.js';

export const Scoring = {
  calculatePlacement(numCells) {
    const points = numCells;
    const xp = numCells * 10;
    return { points, xp, coins: 0 };
  },

  calculateClear(linesCount, comboCount) {
    let basePoints = 0;
    let coins = 0;

    switch (linesCount) {
      case 1:
        basePoints = 10;
        coins = 1;
        break;
      case 2:
        basePoints = 30;
        coins = 3;
        break;
      case 3:
        basePoints = 60;
        coins = 12; // Bonus coins
        break;
      case 4:
        basePoints = 100;
        coins = 20; // Big bonus coins
        break;
      default:
        basePoints = 150;
        coins = 30;
        break;
    }

    // Apply combo multipliers
    let multiplier = 1;
    let comboBonusPoints = 0;

    if (comboCount > 1) {
      if (comboCount === 2) {
        multiplier = 1.5;
        coins += 2;
      } else if (comboCount === 3) {
        multiplier = 2;
        coins += 5;
      } else {
        multiplier = 3;
        coins += 10;
      }
      comboBonusPoints = (comboCount - 1) * 30;
    }

    const finalPoints = Math.round(basePoints * multiplier) + comboBonusPoints;
    const finalXp = Math.round(linesCount * 100 * multiplier);

    let comboText = '';
    if (linesCount === 1) comboText = t('txt_great') || 'Great!';
    else if (linesCount === 2) comboText = t('txt_excellent') || 'Excellent!';
    else if (linesCount >= 3) comboText = t('txt_amazing') || 'Amazing!';

    if (comboCount > 1) {
      const comboStr = `${comboCount}x ${t('txt_combo') || 'Combo'}!`;
      comboText = comboText ? `${comboText}<br/><span class="text-2xl">${comboStr}</span>` : comboStr;
    }

    return {
      points: finalPoints,
      xp: finalXp,
      diamonds: coins,
      comboText: comboText
    };
  }
};
