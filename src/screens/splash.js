import { Sounds } from '../utils/sounds.js';
import { t } from '../utils/i18n.js';

export function Splash(router) {
  const container = document.createElement('div');
  container.className = 'w-full max-w-full lg:max-w-4xl mx-auto min-h-screen relative overflow-hidden text-white select-none';
  
  container.innerHTML = `
    <!-- Stage 1: Developer Splash (FoxyStudio) -->
    <div id="foxstudio-splash" class="absolute inset-0 flex flex-col items-center justify-center bg-[#f3f4f6] dark:bg-[#111111] z-50 transition-opacity duration-700 ease-in-out opacity-100">
      <div class="w-48 h-auto animate-pop-up flex flex-col items-center justify-center drop-shadow-xl">
        <img loading="lazy" decoding="async" src="/foxstudio.webp" alt="FoxyStudio Logo" class="max-w-full object-contain mix-blend-multiply dark:invert dark:mix-blend-screen transition-all duration-300" />
      </div>
    </div>

    <!-- Stage 2: Game Loading Splash (Bloxy) -->
    <div id="main-splash" class="absolute inset-0 flex flex-col items-center justify-between bg-[#010102] z-10 transition-opacity duration-700 ease-in-out opacity-0 pointer-events-none">
      <!-- Animated background particles -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div class="particle p1"></div>
        <div class="particle p2"></div>
        <div class="particle p3"></div>
        <div class="particle p4"></div>
        <div class="particle p5"></div>
        <div class="particle p6"></div>
      </div>

      <!-- Top spacer -->
      <div class="flex-1"></div>
      
      <!-- Logo & Branding -->
      <div class="flex flex-col items-center justify-center space-y-6 z-10">
        <div class="relative">
          <div class="absolute -inset-6 rounded-full bg-gradient-to-r from-cyan-500/30 via-purple-500/20 to-orange-500/30 blur-2xl animate-pulse"></div>
          <div class="w-36 h-36 rounded-[2rem] flex items-center justify-center shadow-2xl transform animate-float ring-2 ring-white/10 relative">
            <img loading="lazy" decoding="async" src="/logo.jpg" alt="Bloxy Logo" class="w-full h-full object-cover rounded-[2rem]" />
          </div>
        </div>
        <div class="flex flex-col items-center space-y-2">
          <h1 class="text-4xl font-black text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            BLOXY
          </h1>
          <p class="text-sm font-semibold text-white/60 tracking-[0.2em] mt-2">BLOCK PUZZLE &amp; ARROW</p>
        </div>
      </div>

      <div class="flex-1"></div>
      
      <!-- Loading & Interaction -->
      <div class="w-full flex flex-col items-center space-y-4 pb-12 z-10">
        <div class="w-56 bg-white/5 h-1 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
          <div id="splash-progress" class="bg-gradient-to-r from-cyan-500 via-purple-500 to-orange-500 h-full w-0 transition-all duration-[2000ms] ease-out rounded-full"></div>
        </div>
        
        <p id="splash-hint" class="text-[11px] text-white/30 font-medium tracking-wider animate-pulse">${t('loading')}</p>

        <p class="text-[10px] text-white/20">${t('splash_tap_sound_hint')}</p>
      </div>
    </div>
  `;

  // Add particle styles
  const style = document.createElement('style');
  style.textContent = `
    .particle {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      animation: float-particle 8s infinite ease-in-out;
    }
    .p1 { width: 4px; height: 4px; background: #00e5ff; left: 15%; top: 20%; animation-delay: 0s; opacity: 0.4; }
    .p2 { width: 3px; height: 3px; background: #a855f7; left: 75%; top: 30%; animation-delay: 1.5s; opacity: 0.3; }
    .p3 { width: 5px; height: 5px; background: #f97316; left: 40%; top: 60%; animation-delay: 3s; opacity: 0.3; }
    .p4 { width: 3px; height: 3px; background: #00e5ff; left: 85%; top: 70%; animation-delay: 4.5s; opacity: 0.4; }
    .p5 { width: 4px; height: 4px; background: #a855f7; left: 25%; top: 80%; animation-delay: 2s; opacity: 0.3; }
    .p6 { width: 3px; height: 3px; background: #f97316; left: 60%; top: 15%; animation-delay: 5s; opacity: 0.35; }
    @keyframes float-particle {
      0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
      50% { transform: translateY(-30px) scale(1.5); opacity: 0.6; }
    }
  `;
  container.appendChild(style);

  // Transition Logic
  const transitionTimer = setTimeout(() => {
    // Stage 1 -> Stage 2 Transition
    const foxySplash = container.querySelector('#foxstudio-splash');
    const mainSplash = container.querySelector('#main-splash');
    
    if (foxySplash && mainSplash) {
      foxySplash.classList.remove('opacity-100');
      foxySplash.classList.add('opacity-0', 'pointer-events-none');
      
      mainSplash.classList.remove('opacity-0', 'pointer-events-none');
      mainSplash.classList.add('opacity-100');
      
      // Start progress bar animation after transition starts
      setTimeout(() => {
        const progress = container.querySelector('#splash-progress');
        if (progress) progress.style.width = '100%';
      }, 100);
    }
  }, 2000);

  // Initialize Web Audio Context on first interaction
  const initAudio = () => {
    Sounds.init();
    Sounds.playSfx('button-tap');
    
    // Remove listeners once audio is initialized
    window.removeEventListener('click', initAudio);
    window.removeEventListener('touchstart', initAudio);
  };
  
  window.addEventListener('click', initAudio);
  window.addEventListener('touchstart', initAudio);

  const navTimer = setTimeout(() => {
    // Start background menu music if enabled
    Sounds.startMusic('menu');
    // Only auto-advance if the user is still on the splash screen.
    // Prevents overriding navigation triggered during the splash delay
    // (e.g. deep links / notifications).
    const currentHash = window.location.hash || '#/';
    if (currentHash === '#/' || currentHash === '') {
      router.navigate('#/menu');
    }
  }, 4000);

  container.cleanup = () => {
    clearTimeout(transitionTimer);
    clearTimeout(navTimer);
    window.removeEventListener('click', initAudio);
    window.removeEventListener('touchstart', initAudio);
  };

  return container;
}
