import { PlayerState } from '../state/playerState.js';
import { t } from './i18n.js';

export const getBadgeTier = (progress, thresholds) => {
  let tier = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (progress >= thresholds[i]) tier = i + 1;
  }
  return tier;
};

export const getTierDetails = (tier) => {
  const details = [
    { name: t('tier_locked') || 'Kilitli', color: 'bg-gray-300 dark:bg-gray-700', text: 'text-gray-500', shadow: '' },
    { name: t('bronze') || 'Bronz', color: 'bg-gradient-to-br from-orange-500 to-amber-700', text: 'text-orange-600', shadow: 'shadow-orange-500/20' },
    { name: t('silver') || 'Gümüş', color: 'bg-gradient-to-br from-gray-300 to-gray-500', text: 'text-gray-400', shadow: 'shadow-gray-400/20' },
    { name: t('gold') || 'Altın', color: 'bg-gradient-to-br from-yellow-300 to-amber-500', text: 'text-yellow-500', shadow: 'shadow-yellow-500/30' },
    { name: t('diamond_tier') || 'Elmas', color: 'bg-gradient-to-br from-cyan-300 to-blue-500', text: 'text-cyan-400', shadow: 'shadow-cyan-400/40' }
  ];
  return details[tier];
};

export const getBadgesData = (customStats = null) => {
  const stats = customStats || PlayerState.state;
  return [
    { id: 'classic_master', icon: 'workspace_premium', progress: stats.bestScoreClassic || 0, thresholds: [5000, 50000, 500000, 5000000] },
    { id: 'hex_master', icon: 'hexagon', progress: stats.bestScoreHex || 0, thresholds: [500, 5000, 50000, 250000] },
    { id: 'jewel_master', icon: 'auto_awesome', progress: stats.bestScoreJewel || 0, thresholds: [5000, 50000, 250000, 1000000] },
    { id: 'sort_legend', icon: 'colorize', progress: stats.bestScoreSort || 0, thresholds: [5, 25, 100, 500] },
    { id: 'merge_king', icon: 'library_add', progress: stats.bestScoreMerge || 0, thresholds: [500, 5000, 50000, 250000] },
    { id: 'bubble_master', icon: 'bubble_chart', progress: stats.bestScoreBubble || 0, thresholds: [500, 5000, 50000, 250000] },
    { id: 'arrow_master', icon: 'navigation', progress: stats.bestScoreArrow || 0, thresholds: [10, 50, 200, 600] },
    { id: '2048_pro', icon: 'pin', progress: stats.bestScore2048 || 0, thresholds: [128, 512, 2048, 8192] },
    { id: 'x2_master', icon: 'view_comfy', progress: stats.bestScoreX2 || 0, thresholds: [5000, 50000, 500000, 5000000] },
    { id: 'duel_master', icon: 'swords', progress: stats.duelWins || 0, thresholds: [5, 50, 500, 5000] },
    { id: 'diamond_baron', icon: 'diamond', progress: stats.diamonds || 0, thresholds: [1000, 5000, 10000, 50000] },
    { id: 'login_streak', icon: 'local_fire_department', progress: stats.loginStreak || 0, thresholds: [3, 14, 90, 365] },
    { id: 'total_wins', icon: 'emoji_events', progress: stats.duelWins || 0, thresholds: [10, 100, 1000, 10000] }
  ];
};
