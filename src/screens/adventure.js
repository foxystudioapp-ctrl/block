import { createTopBar } from '../components/topBar.js';
import { showFeedback } from '../utils/feedback.js';
import { PlayerState } from '../state/playerState.js';
import { Storage } from '../utils/storage.js';
import { createModal } from '../components/modal.js';
import { Sounds } from '../utils/sounds.js';
import { t } from '../utils/i18n.js';
import { getAdventureLevels } from '../game/levelData.js';
import { createBottomNav } from '../components/bottomNav.js';

export function Adventure(router) {
  const container = document.createElement('div');
  // Use flex col, no extra pb padding because bottomNav sits at the bottom naturally.
  container.className = 'w-full max-w-full lg:max-w-4xl mx-auto h-[100dvh] flex flex-col bg-bg-light dark:bg-primary text-primary dark:text-white select-none relative overflow-hidden';

  const topBar = createTopBar(t('menu_adventure') || 'MACERA MODU', true, () => router.navigate('#/menu'));
  topBar.style.position = 'absolute';
  topBar.style.top = '0';
  topBar.style.left = '0';
  topBar.style.right = '0';
  topBar.style.zIndex = '50';
  topBar.style.background = 'rgba(1, 1, 2, 0.4)';
  topBar.style.backdropFilter = 'blur(12px)';
  topBar.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
  container.appendChild(topBar);

  const mapContainer = document.createElement('div');
  // Add pb-4 for map content bottom padding
  mapContainer.className = 'flex-1 overflow-y-auto overflow-x-hidden no-scrollbar relative w-full h-full pt-16 pb-4 transform-gpu touch-pan-y';
  
  // Advanced multi-layered deep space / nebula background
  mapContainer.style.background = 'radial-gradient(ellipse at center, #0B0B2A 0%, #010115 100%)';
  
  // Background decoration container
  const bgDeco = document.createElement('div');
  bgDeco.className = 'absolute inset-0 pointer-events-none opacity-100';
  bgDeco.style.height = '10000px'; 
  
  // Create Milky Way (Samanyolu) - reduced for performance
  for(let i=0; i<5; i++) {
    const milky = document.createElement('div');
    milky.className = 'absolute rounded-full opacity-20 blur-3xl';
    milky.style.width = (300 + Math.random() * 400) + 'px';
    milky.style.height = (800 + Math.random() * 1000) + 'px';
    milky.style.background = `linear-gradient(${Math.random()*360}deg, #4A00E0, #8E2DE2, #00C9FF, transparent)`;
    milky.style.left = (Math.random() * 100 - 20) + '%';
    milky.style.top = (i * 2000) + 'px';
    milky.style.transform = `rotate(${20 + Math.random() * 30}deg)`;
    bgDeco.appendChild(milky);
  }

  // Create stars (reduced to 200 for performance)
  for(let i=0; i<200; i++) {
    const star = document.createElement('div');
    star.className = 'absolute rounded-full bg-white';
    const size = Math.random() * 2.5;
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 10000 + 'px';
    star.style.opacity = Math.random() * 0.8 + 0.2;
    
    // Only animate a few to save CPU
    if (Math.random() > 0.8) {
      star.className += ' animate-pulse';
      star.style.animationDelay = (Math.random() * 3) + 's';
      star.style.animationDuration = (2 + Math.random() * 3) + 's';
    }
    bgDeco.appendChild(star);
  }


  // Create floating planets/nebulas - reduced and simplified
  const colors = ['#4A00E0', '#8E2DE2', '#00C9FF', '#92FE9D', '#fc4a1a', '#f7b733', '#E94057'];
  for(let i=0; i<10; i++) {
    const orb = document.createElement('div');
    const color = colors[i % colors.length];
    const size = 100 + Math.random() * 150;
    
    // Simplified planet look without expensive box-shadows
    orb.className = 'absolute rounded-full opacity-60';
    orb.style.width = size + 'px';
    orb.style.height = size + 'px';
    orb.style.background = `radial-gradient(circle at 30% 30%, ${color}, #000)`;
    
    orb.style.left = (Math.random() * 120 - 10) + '%';
    orb.style.top = Math.random() * 10000 + 'px';
    bgDeco.appendChild(orb);
  }
  mapContainer.appendChild(bgDeco);

  const levels = getAdventureLevels();
  const currentLevelId = PlayerState.state.currentAdventureLevel;

  const NODE_HEIGHT = 120; // Increased spacing for a better look
  const MAP_HEIGHT = levels.length * NODE_HEIGHT + 300; 
  
  const mapContent = document.createElement('div');
  mapContent.style.height = `${MAP_HEIGHT}px`;
  mapContent.style.position = 'relative';
  mapContent.style.width = '100%';
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '0';
  
  // Glowing underlay path
  const glowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  glowPath.setAttribute('fill', 'none');
  glowPath.setAttribute('stroke', 'rgba(0, 201, 255, 0.2)');
  glowPath.setAttribute('stroke-width', '4');
  glowPath.setAttribute('stroke-linecap', 'round');
  glowPath.style.filter = 'blur(4px)';
  
  // Dashed main path
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'rgba(255, 255, 255, 0.4)');
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-dasharray', '4 4');
  path.setAttribute('stroke-linecap', 'round');
  path.style.animation = 'dash-scroll 20s linear infinite';
  
  let pathD = '';
  const nodePositions = [];
  
  levels.forEach((level, index) => {
    const y = 150 + (index * NODE_HEIGHT);
    const frequency = 0.35;
    const centerX = 50; 
    const offsetX = Math.sin(index * frequency) * 35;
    const x = centerX + offsetX;
    
    nodePositions.push({ x, y });
  });
  
  svg.setAttribute('viewBox', `0 0 100 ${MAP_HEIGHT}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  
  nodePositions.forEach((pos, i) => {
    if (i === 0) {
      pathD += `M ${pos.x} ${pos.y} `;
    } else {
      const prev = nodePositions[i-1];
      const ctrlY = (prev.y + pos.y) / 2;
      pathD += `C ${prev.x} ${ctrlY}, ${pos.x} ${ctrlY}, ${pos.x} ${pos.y} `;
    }
  });
  
  glowPath.setAttribute('d', pathD);
  path.setAttribute('d', pathD);
  svg.appendChild(glowPath);
  svg.appendChild(path);
  mapContent.appendChild(svg);
  
  let currentNodeEl = null;

  levels.forEach((level, index) => {
    const isUnlocked = level.id <= currentLevelId;
    const isCurrent = level.id === currentLevelId;
    const isCompleted = level.id < currentLevelId;
    const isMilestone = level.id % 10 === 0;
    const pos = nodePositions[index];
    
    const nodeWrapper = document.createElement('div');
    nodeWrapper.style.position = 'absolute';
    nodeWrapper.style.left = `${pos.x}%`;
    nodeWrapper.style.top = `${pos.y}px`;
    nodeWrapper.style.transform = 'translate(-50%, -50%)';
    nodeWrapper.style.zIndex = isCurrent ? '10' : (isMilestone ? '5' : '1');
    
    const sizeClass = isMilestone ? 'w-16 h-16' : 'w-14 h-14';
    const scaleClass = isCurrent ? (isMilestone ? 'scale-125' : 'scale-110') : 'scale-100';
    
    const nodeBtn = document.createElement('button');
    nodeBtn.className = `${sizeClass} rounded-full flex items-center justify-center font-black shadow-lg transition-transform active:scale-95
      ${isCompleted ? 'bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-emerald-500/50' : ''}
      ${isCurrent ? 'bg-gradient-to-br from-[#00C9FF] to-[#92FE9D] text-gray-900 animate-hero-breathe ring-4 ring-[#00C9FF]/40 ring-offset-2 ring-offset-[#1b2735] ' + scaleClass : scaleClass}
      ${!isUnlocked && !isCurrent ? 'bg-gray-800/80 border-2 border-gray-600/50 text-gray-500 backdrop-blur-sm' : ''}
      ${isMilestone && !isCurrent && isUnlocked ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-purple-500/50 ring-2 ring-purple-400/50' : ''}
    `;
    
    if (isCompleted) {
      nodeBtn.innerHTML = `<span class="material-symbols-outlined ${isMilestone ? 'text-3xl' : 'text-2xl'} drop-shadow-md">star</span>`;
    } else if (isCurrent) {
      nodeBtn.innerHTML = `<span class="material-symbols-outlined text-3xl drop-shadow-md fill">play_arrow</span>`;
    } else {
      if (isMilestone && !isUnlocked) {
         nodeBtn.innerHTML = `<span class="material-symbols-outlined text-2xl opacity-60">lock</span>`;
      } else {
         nodeBtn.innerHTML = `<span class="material-symbols-outlined text-xl opacity-50">lock</span>`;
      }
    }

    const levelText = document.createElement('div');
    levelText.className = `absolute -bottom-7 w-24 text-center text-[11px] font-black drop-shadow-md tracking-wide
      ${isCurrent ? 'text-[#00C9FF]' : (isUnlocked ? 'text-white' : 'text-gray-500')}
    `;
    levelText.style.left = '50%';
    levelText.style.transform = 'translateX(-50%)';
    levelText.textContent = `${t('level')} ${level.id}`;
    
    // Grid shape badge
    if (level.gridShape && level.gridShape !== 'square') {
       const badge = document.createElement('div');
       badge.className = `absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center border-2 shadow-md 
        ${isUnlocked ? 'bg-purple-500 border-white text-white' : 'bg-gray-700 border-gray-500 text-gray-400'}`;
       badge.innerHTML = `<span class="material-symbols-outlined text-[13px]">category</span>`;
       nodeWrapper.appendChild(badge);
    }
    
    nodeBtn.addEventListener('click', () => {
      if (!isUnlocked) {
        Sounds.playSfx('invalid');
        return;
      }
      Sounds.playSfx('button-tap');
      showLevelModal(level, router);
    });

    nodeWrapper.appendChild(nodeBtn);
    nodeWrapper.appendChild(levelText);
    mapContent.appendChild(nodeWrapper);
    
    if (isCurrent) {
      currentNodeEl = nodeWrapper;
    }
  });

  mapContainer.appendChild(mapContent);
  container.appendChild(mapContainer);

  // Append Bottom Navbar exactly as requested
  const nav = createBottomNav('menu');
  container.appendChild(nav);

  setTimeout(() => {
    if (currentNodeEl) {
      const topPos = parseFloat(currentNodeEl.style.top);
      // Center the active level in the viewport
      mapContainer.scrollTo({
        top: topPos - mapContainer.offsetHeight / 2,
        behavior: 'smooth'
      });
    } else {
      mapContainer.scrollTop = 0;
    }
  }, 300);

  return container;
}

function showLevelModal(level, router) {
  const isSpecial = level.gridShape && level.gridShape !== 'square';
  
  const contentHtml = `
    <div class="flex flex-col items-center p-4">
      <div class="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center mb-4 relative shadow-lg shadow-orange-500/20">
        <span class="material-symbols-outlined text-3xl text-orange-500 fill drop-shadow-md">emoji_events</span>
        ${isSpecial ? `<div class="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm"><span class="material-symbols-outlined text-[12px] text-white">category</span></div>` : ''}
      </div>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center leading-relaxed">${t('star_goal') || t('star_goal') || 'Hedefi tamamlayarak yıldızı kap ve bir sonraki seviyenin kilidini aç!'}</p>
      
      <div class="w-full bg-black/5 dark:bg-white/5 rounded-2xl p-4 mb-2 space-y-3 border border-black/5 dark:border-white/5">
        <div class="flex justify-between items-center">
          <span class="text-sm font-bold opacity-80">${t('target_score') || t('target_score') || 'Hedef Skor:'}</span>
          <span class="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">${level.targetScore}</span>
        </div>
        ${isSpecial ? `
        <div class="h-px w-full bg-black/5 dark:bg-white/5"></div>
        <div class="flex justify-between items-center">
          <span class="text-sm font-bold opacity-80">${t('special_board') || 'Özel Tahta:'}</span>
          <span class="text-sm font-black text-purple-500 uppercase tracking-wide">${level.gridShape}</span>
        </div>
        ` : ''}
      </div>
    </div>
  `;
  
  createModal({
    title: `${t('level') || 'Seviye'} ${level.id}`,
    content: contentHtml,
    actions: [
      {
        text: t('play') || 'Oyna',
        primary: true,
        onClick: (closeModal) => {
          closeModal();
          Storage.set('game_start_params', { mode: 'adventure', level: level.id, targetScore: level.targetScore, gridShape: level.gridShape });
          router.navigate('#/classic');
        }
      }
    ]
  });
}
