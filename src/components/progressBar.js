export function createProgressBar(percentage = 0, colorClass = 'bg-secondary', labelText = '') {
  const container = document.createElement('div');
  container.className = 'w-full flex flex-col space-y-1';

  const labelHtml = labelText ? `
    <div class="flex justify-between items-center text-[10px] font-bold text-gray-500 dark:text-gray-400">
      <span>${labelText}</span>
      <span>%${Math.round(percentage)}</span>
    </div>
  ` : '';

  container.innerHTML = `
    ${labelHtml}
    <div class="w-full h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
      <div class="progress-fill h-full rounded-full ${colorClass} transition-all duration-1000 ease-out" style="width: 0%"></div>
    </div>
  `;

  // Animate to target percentage after insertion
  setTimeout(() => {
    const fill = container.querySelector('.progress-fill');
    if (fill) {
      fill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
    }
  }, 100);

  // Allow setting dynamic percentage
  container.setProgress = (newPercentage) => {
    const fill = container.querySelector('.progress-fill');
    if (fill) {
      fill.style.width = `${Math.min(100, Math.max(0, newPercentage))}%`;
    }
  };

  return container;
}
