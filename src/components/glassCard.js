export function createGlassCard(contentHtml, extraClasses = '') {
  const card = document.createElement('div');
  card.className = `glass-card p-5 rounded-3xl w-full flex flex-col transition-all duration-300 ${extraClasses}`;
  
  if (typeof contentHtml === 'string') {
    card.innerHTML = contentHtml;
  } else if (contentHtml instanceof HTMLElement) {
    card.appendChild(contentHtml);
  }
  
  return card;
}
