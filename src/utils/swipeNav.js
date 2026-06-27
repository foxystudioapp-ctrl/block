import { Haptics } from './haptics.js';

export function initSwipeNavigation(container, router, currentTab) {
  const tabs = ['menu', 'leaderboard', 'tasks', 'profile'];
  const currentIndex = tabs.indexOf(currentTab);
  
  if (currentIndex === -1) return;

  let touchStartX = 0;
  let touchEndX = 0;
  let touchStartY = 0;
  let touchEndY = 0;

  const minSwipeDistance = 60; // minimum distance to be considered a swipe
  const maxVerticalDev = 50;   // maximum vertical deviation to ignore diagonal swipes

  container.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    // Check if swipe is horizontal enough and long enough
    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaY) < maxVerticalDev) {
      try {
        Haptics.vibrate('light');
      } catch (e) {}

      if (deltaX < 0) {
        // Swipe Left (finger moves left) -> Go to Next Tab
        const nextIndex = (currentIndex + 1) % tabs.length;
        router.navigate(`#/${tabs[nextIndex]}`);
      } else {
        // Swipe Right (finger moves right) -> Go to Prev Tab
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        router.navigate(`#/${tabs[prevIndex]}`);
      }
    }
  }
}
