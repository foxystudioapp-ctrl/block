import { Storage } from '../utils/storage.js';
import { Sounds } from '../utils/sounds.js';
import { t } from '../utils/i18n.js';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let isPlaying = false;

// Sanal İmleç
function createVirtualCursor() {
  const cursor = document.createElement('div');
  cursor.className = 'fixed z-[150] pointer-events-none drop-shadow-lg transition-all duration-700 ease-in-out';
  cursor.innerHTML = `
    <svg width="40" height="40" viewBox="0 0 24 24" fill="white" stroke="#1e293b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(-15deg); filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.3));">
      <path d="M9 11.5V6a2 2 0 1 1 4 0v5.5"/>
      <path d="M13 11.5V8a2 2 0 1 1 4 0v3.5"/>
      <path d="M17 11.5V10a2 2 0 1 1 4 0v5.5a6.5 6.5 0 0 1-6.5 6.5h-2a6.5 6.5 0 0 1-6.5-6.5v-4.5a2 2 0 1 1 4 0v.5"/>
    </svg>
  `;
  cursor.style.opacity = '0';
  cursor.style.transform = 'translate(0, 0) scale(1)';
  document.body.appendChild(cursor);
  return cursor;
}

function showFloatingScore(board, text, left, top) {
  const scoreText = document.createElement('div');
  scoreText.className = 'absolute font-black text-4xl text-white z-50 pointer-events-none';
  scoreText.style.textShadow = '0 4px 20px rgba(0,229,255,1), 0 0 10px rgba(0,229,255,0.8)';
  scoreText.textContent = text;
  scoreText.style.left = left || '50%';
  scoreText.style.top = top || '70%';
  scoreText.style.transform = 'translate(-50%, -50%) scale(0.1)';
  scoreText.style.transition = 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)';
  scoreText.style.opacity = '0';
  board.appendChild(scoreText);

  setTimeout(() => {
    if(!scoreText.parentNode) return;
    scoreText.style.opacity = '1';
    scoreText.style.transform = 'translate(-50%, -150%) scale(1.2)';
  }, 50);

  setTimeout(() => {
    if(!scoreText.parentNode) return;
    scoreText.style.opacity = '0';
    scoreText.style.transform = 'translate(-50%, -200%) scale(1.5)';
  }, 800);

  setTimeout(() => {
    if(scoreText.parentNode) scoreText.remove();
  }, 1200);
}

export function checkAndShowTutorial(mode = 'classic', force = false, options = {}) {
  const isCompleted = Storage.get(`tutorial_completed_${mode}`, false);
  if (isCompleted && !force) return;
  
  if (isPlaying) return;
  isPlaying = true;

  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[60] bg-black/20 flex flex-col justify-between p-6 opacity-0 transition-opacity duration-500 pointer-events-auto';
  
  let steps = [];
  let animationCleanups = [];
  const vCursor = createVirtualCursor();

  // ----------------------------------------------------------------------
  // CLASSIC & ADVENTURE
  // ----------------------------------------------------------------------
  if (mode === 'classic' || mode === 'adventure') {
    steps = [
      {
        title: mode === 'adventure' ? (t('tut_adv_title') || 'Macera Modu') : (t('tut_classic_pieces_title') || 'Blok Parçaları'),
        text: t('tut_classic_pieces_desc') || 'Aşağıdaki tepsiden bir blok parçası seçerek oyuna başla.',
        targetSelector: '.grid.grid-cols-3',
        animate: (cleanup) => {
          const tray = document.querySelector('.grid.grid-cols-3');
          if (!tray) return;
          const piece = tray.children[0];
          let running = true;
          
          if (piece) {
            const animate = async () => {
              while(running) {
                const rect = piece.getBoundingClientRect();
                vCursor.style.opacity = '1';
                vCursor.style.left = `${rect.left + rect.width/2}px`;
                vCursor.style.top = `${rect.top + rect.height/2 + 80}px`;
                await wait(100);
                if (!running) break;
                
                vCursor.style.left = `${rect.left + rect.width/2}px`;
                vCursor.style.top = `${rect.top + rect.height/2}px`;
                await wait(700);
                if (!running) break;

                vCursor.style.transform = 'scale(0.8)';
                piece.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                piece.style.transform = 'scale(1.15) translateY(-10px)';
                piece.style.filter = 'drop-shadow(0 15px 25px rgba(0,229,255,0.8)) brightness(1.3)';
                
                await wait(600);
                if (!running) break;
                
                vCursor.style.transform = 'scale(1)';
                piece.style.transform = 'scale(1) translateY(0)';
                piece.style.filter = '';
                
                vCursor.style.left = `${rect.left + rect.width/2 + 80}px`;
                vCursor.style.top = `${rect.top + rect.height/2 + 80}px`;
                vCursor.style.opacity = '0';
                
                await wait(800);
              }
            };
            animate();
          }
          cleanup.push(() => {
            running = false;
            vCursor.style.opacity = '0';
            if (piece) { piece.style.transform = ''; piece.style.filter = ''; }
          });
        }
      },
      {
        title: t('tut_classic_place_title') || 'Sürükle ve Bırak',
        text: t('tut_classic_place_desc') || 'Seçtiğin parçayı sürükleyerek oyun tahtasındaki boş bir alana yerleştir.',
        targetSelector: '#game-board',
        animate: (cleanup) => {
          const board = document.querySelector('#game-board');
          const tray = document.querySelector('.grid.grid-cols-3');
          if (!board || !tray || tray.children.length === 0) return;
          const piece = tray.children[0];
          const getCell = (r, c) => board.querySelector(`[data-r="${r}"][data-c="${c}"]`);
          
          let running = true;
          const targetPositions = [[3, 2], [4, 2], [4, 3], [4, 4]]; 

          const ghostPiece = piece.cloneNode(true);
          ghostPiece.style.position = 'fixed';
          ghostPiece.style.zIndex = '90';
          ghostPiece.style.pointerEvents = 'none';
          document.body.appendChild(ghostPiece);

          const animate = async () => {
            while (running) {
              const trayRect = piece.getBoundingClientRect();
              ghostPiece.style.transition = 'none';
              ghostPiece.style.left = `${trayRect.left}px`;
              ghostPiece.style.top = `${trayRect.top}px`;
              ghostPiece.style.width = `${trayRect.width}px`;
              ghostPiece.style.height = `${trayRect.height}px`;
              ghostPiece.style.opacity = '1';
              ghostPiece.style.transform = 'scale(1)';
              ghostPiece.style.filter = '';
              
              vCursor.style.transition = 'all 0.5s ease-out';
              vCursor.style.opacity = '1';
              vCursor.style.left = `${trayRect.left + trayRect.width/2}px`;
              vCursor.style.top = `${trayRect.top + trayRect.height/2}px`;
              vCursor.style.transform = 'scale(1)';
              
              await wait(600);
              if (!running) break;
              
              vCursor.style.transform = 'scale(0.8)';
              ghostPiece.style.transition = 'all 0.2s';
              ghostPiece.style.transform = 'scale(1.1)';
              ghostPiece.style.filter = 'drop-shadow(0 20px 25px rgba(0,229,255,0.7)) brightness(1.4)';
              
              await wait(400);
              if (!running) break;
              
              const targetCell = getCell(3, 2);
              if (!targetCell) break;
              const cellRect = targetCell.getBoundingClientRect();
              
              vCursor.style.transition = 'all 1s cubic-bezier(0.25, 1, 0.5, 1)';
              ghostPiece.style.transition = 'all 1s cubic-bezier(0.25, 1, 0.5, 1)';
              
              vCursor.style.left = `${cellRect.left + trayRect.width/2}px`;
              vCursor.style.top = `${cellRect.top + trayRect.height/2}px`;
              ghostPiece.style.left = `${cellRect.left}px`;
              ghostPiece.style.top = `${cellRect.top}px`;
              
              await wait(1000);
              if (!running) break;
              
              for (const [r, c] of targetPositions) {
                const cEl = getCell(r, c);
                if (cEl) {
                  cEl.style.transition = 'all 0.2s';
                  cEl.style.boxShadow = 'inset 0 0 15px rgba(0,229,255,0.9)';
                  cEl.style.backgroundColor = 'rgba(0, 229, 255, 0.4)';
                  cEl.style.transform = 'scale(1.05)';
                }
              }

              await wait(400);
              if (!running) break;
              
              vCursor.style.transform = 'scale(1)';
              ghostPiece.style.opacity = '0';
              ghostPiece.style.transform = 'scale(0.5)';
              
              for (const [r, c] of targetPositions) {
                const cEl = getCell(r, c);
                if (cEl) {
                  cEl.style.backgroundColor = '#00e5ff';
                  cEl.style.boxShadow = '0 0 20px rgba(0,229,255,0.6)';
                  cEl.style.transform = 'scale(1)';
                }
              }

              vCursor.style.opacity = '0';
              vCursor.style.top = `${cellRect.top + 100}px`;

              await wait(1200);
              if (!running) break;

              for (const [r, c] of targetPositions) {
                const cEl = getCell(r, c);
                if (cEl) {
                  cEl.style.backgroundColor = '';
                  cEl.style.boxShadow = '';
                  cEl.style.transform = '';
                }
              }
              await wait(500);
            }
          };
          animate();

          cleanup.push(() => {
            running = false;
            vCursor.style.opacity = '0';
            if (ghostPiece && ghostPiece.parentNode) ghostPiece.remove();
            for (const [r, c] of targetPositions) {
              const cEl = getCell(r, c);
              if (cEl) { cEl.style.backgroundColor = ''; cEl.style.boxShadow = ''; cEl.style.transform = ''; }
            }
          });
        }
      },
      {
        title: t('tut_classic_clear_title') || 'Satırları Temizleme',
        text: mode === 'adventure' ? (t('tut_adv_clear_desc') || 'Satır ve sütunları tam doldurarak patlat ve puan topla!') : (t('tut_classic_clear_desc') || 'Yatay bir satırı veya dikey sütunu tamamen doldurduğunuzda satır silinir ve puan kazanırsınız.'),
        targetSelector: '#game-board',
        animate: (cleanup) => {
          const board = document.querySelector('#game-board');
          if (!board) return;
          const cells = board.querySelectorAll('[data-r][data-c]');
          const gridSize = Math.round(Math.sqrt(cells.length));
          const getCell = (r, c) => board.querySelector(`[data-r="${r}"][data-c="${c}"]`);
          let running = true;

          const animate = async () => {
            while (running) {
              const targetRow = 4;
              for (let c = 0; c < gridSize; c++) {
                if (!running) break;
                const cell = getCell(targetRow, c);
                if (cell) {
                  cell.style.transition = 'all 0.15s ease-out';
                  cell.style.backgroundColor = '#00e5ff';
                  cell.style.boxShadow = '0 0 15px rgba(0,229,255,0.7)';
                  cell.style.transform = 'scale(1.1)';
                }
                await wait(80);
              }
              await wait(400);
              if (!running) break;

              for (let c = 0; c < gridSize; c++) {
                const cell = getCell(targetRow, c);
                if (cell) cell.style.filter = 'brightness(2) drop-shadow(0 0 15px white)';
              }
              await wait(150);

              for (let c = 0; c < gridSize; c++) {
                const cell = getCell(targetRow, c);
                if (cell) {
                  cell.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                  cell.style.transform = `scale(0) rotate(${Math.random() > 0.5 ? 90 : -90}deg) translateY(-20px)`;
                  cell.style.opacity = '0';
                }
              }

              showFloatingScore(board, '+500');

              await wait(1200);
              if (!running) break;

              for (let c = 0; c < gridSize; c++) {
                const cell = getCell(targetRow, c);
                if (cell) {
                  cell.style.transition = 'none';
                  cell.style.backgroundColor = '';
                  cell.style.boxShadow = '';
                  cell.style.transform = '';
                  cell.style.opacity = '';
                  cell.style.filter = '';
                }
              }
              await wait(800);
            }
          };
          animate();

          cleanup.push(() => {
            running = false;
            for (let c = 0; c < gridSize; c++) {
              const cell = getCell(4, c);
              if (cell) {
                cell.style.transition = 'none';
                cell.style.backgroundColor = '';
                cell.style.boxShadow = '';
                cell.style.transform = '';
                cell.style.opacity = '';
                cell.style.filter = '';
              }
            }
          });
        }
      }
    ];

  // ----------------------------------------------------------------------
  // HEX MODE
  // ----------------------------------------------------------------------
  } else if (mode === 'hex') {
    steps = [
      {
        title: t('tut_hex_pieces_title') || 'Altıgen Parçalar',
        text: t('tut_hex_pieces_desc') || 'Aşağıdaki tepsiden altıgen bir blok parçası seçin.',
        targetSelector: '.grid.grid-cols-3',
        animate: (cleanup) => {
          const tray = document.querySelector('.grid.grid-cols-3');
          if (!tray) return;
          const piece = tray.children[0];
          let running = true;
          
          const animate = async () => {
            while(running) {
              const rect = piece.getBoundingClientRect();
              vCursor.style.opacity = '1';
              vCursor.style.left = `${rect.left + rect.width/2}px`;
              vCursor.style.top = `${rect.top + rect.height/2 + 80}px`;
              await wait(100);
              if (!running) break;
              
              vCursor.style.left = `${rect.left + rect.width/2}px`;
              vCursor.style.top = `${rect.top + rect.height/2}px`;
              await wait(700);
              if (!running) break;

              vCursor.style.transform = 'scale(0.8)';
              piece.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
              piece.style.transform = 'scale(1.15) translateY(-10px)';
              piece.style.filter = 'drop-shadow(0 15px 25px rgba(168,85,247,0.8)) brightness(1.3)';
              
              await wait(600);
              if (!running) break;
              
              vCursor.style.transform = 'scale(1)';
              piece.style.transform = 'scale(1) translateY(0)';
              piece.style.filter = '';
              
              vCursor.style.opacity = '0';
              await wait(800);
            }
          };
          animate();
          cleanup.push(() => {
            running = false;
            vCursor.style.opacity = '0';
            if(piece) { piece.style.transform = ''; piece.style.filter = ''; }
          });
        }
      },
      {
        title: t('tut_hex_place_title') || 'Yerleştirme',
        text: t('tut_hex_place_desc') || 'Seçtiğiniz altıgen bloğu sürükleyip petek tahtasına bırakın.',
        targetSelector: '#hex-board',
        animate: (cleanup) => {
          const board = document.querySelector('#hex-board');
          const tray = document.querySelector('.grid.grid-cols-3');
          if (!board || !tray || tray.children.length === 0) return;
          const piece = tray.children[0];
          let running = true;

          const ghostPiece = piece.cloneNode(true);
          ghostPiece.style.position = 'fixed';
          ghostPiece.style.zIndex = '90';
          ghostPiece.style.pointerEvents = 'none';
          document.body.appendChild(ghostPiece);

          const animate = async () => {
            while (running) {
              const rect = piece.getBoundingClientRect();
              ghostPiece.style.transition = 'none';
              ghostPiece.style.left = `${rect.left}px`;
              ghostPiece.style.top = `${rect.top}px`;
              ghostPiece.style.width = `${rect.width}px`;
              ghostPiece.style.height = `${rect.height}px`;
              ghostPiece.style.opacity = '1';
              ghostPiece.style.transform = 'scale(1)';
              
              vCursor.style.transition = 'all 0.5s ease-out';
              vCursor.style.opacity = '1';
              vCursor.style.left = `${rect.left + rect.width/2}px`;
              vCursor.style.top = `${rect.top + rect.height/2}px`;
              await wait(600);
              if(!running) break;
              
              vCursor.style.transform = 'scale(0.8)';
              ghostPiece.style.transition = 'all 0.2s';
              ghostPiece.style.transform = 'scale(1.1)';
              ghostPiece.style.filter = 'drop-shadow(0 20px 25px rgba(168,85,247,0.7)) brightness(1.4)';
              await wait(400);
              if(!running) break;
              
              const bRect = board.getBoundingClientRect();
              vCursor.style.transition = 'all 1s cubic-bezier(0.25, 1, 0.5, 1)';
              ghostPiece.style.transition = 'all 1s cubic-bezier(0.25, 1, 0.5, 1)';
              vCursor.style.left = `${bRect.left + bRect.width/2}px`;
              vCursor.style.top = `${bRect.top + bRect.height/2}px`;
              ghostPiece.style.left = `${bRect.left + bRect.width/2 - rect.width/2}px`;
              ghostPiece.style.top = `${bRect.top + bRect.height/2 - rect.height/2}px`;
              await wait(1000);
              if(!running) break;

              vCursor.style.transform = 'scale(1)';
              ghostPiece.style.opacity = '0';
              vCursor.style.opacity = '0';
              await wait(1200);
            }
          };
          animate();
          cleanup.push(() => {
            running = false;
            vCursor.style.opacity = '0';
            if (ghostPiece && ghostPiece.parentNode) ghostPiece.remove();
          });
        }
      },
      {
        title: t('tut_hex_clear_title') || '3 Yönlü Temizleme',
        text: t('tut_hex_clear_desc') || 'Altıgen tahtada tam 3 farklı yönde köşegen çizgiler oluşturarak satırları temizleyebilirsiniz.',
        targetSelector: '#hex-board',
        animate: (cleanup) => {
          const board = document.querySelector('#hex-board');
          if (!board) return;
          const cells = Array.from(board.querySelectorAll('[data-r]'));
          let running = true;

          const animate = async () => {
            while (running) {
              const line = cells.slice(0, 5); 
              for (const cell of line) {
                if (!running) break;
                cell.style.transition = 'all 0.15s ease-out';
                cell.style.backgroundColor = '#a855f7'; 
                cell.style.boxShadow = '0 0 15px rgba(168,85,247,0.7)';
                cell.style.transform = 'scale(1.15)';
                await wait(80);
              }
              await wait(400);
              if (!running) break;

              for (const cell of line) cell.style.filter = 'brightness(2) drop-shadow(0 0 15px white)';
              await wait(150);

              for (const cell of line) {
                cell.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                cell.style.transform = 'scale(0) rotate(180deg)';
                cell.style.opacity = '0';
              }

              showFloatingScore(board, '+600');

              await wait(1200);
              if (!running) break;

              for (const cell of line) {
                cell.style.transition = 'none';
                cell.style.backgroundColor = '';
                cell.style.boxShadow = '';
                cell.style.transform = '';
                cell.style.opacity = '';
                cell.style.filter = '';
              }
              await wait(800);
            }
          };
          animate();

          cleanup.push(() => {
            running = false;
            cells.forEach(cell => {
              cell.style.transition = 'none'; cell.style.backgroundColor = ''; cell.style.boxShadow = ''; cell.style.transform = ''; cell.style.opacity = ''; cell.style.filter = '';
            });
          });
        }
      }
    ];

  // ----------------------------------------------------------------------
  // COLOR SORT
  // ----------------------------------------------------------------------
  } else if (mode === 'sort') {
    steps = [
      {
        title: t('tut_sort_select_title') || 'Blok Seçimi',
        text: t('tut_sort_select_desc') || 'Bir tüpe dokunarak en üstündeki renkli bloğu havaya kaldırın.',
        targetSelector: '#tubes-grid',
        animate: (cleanup) => {
          const grid = document.querySelector('#tubes-grid');
          if (!grid) return;
          const tubes = grid.children;
          if (tubes.length === 0) return;
          const tubeA = tubes[0];
          let running = true;

          const animate = async () => {
            while (running) {
              const blocks = Array.from(tubeA.querySelectorAll('[class*="block-3d-"]'));
              const topBlock = blocks[blocks.length - 1]; // Topmost block
              if (!topBlock) break;

              const blockRect = topBlock.getBoundingClientRect();
              vCursor.style.transition = 'all 0.5s ease-out';
              vCursor.style.opacity = '1';
              vCursor.style.left = `${blockRect.left + blockRect.width/2}px`;
              vCursor.style.top = `${blockRect.top + blockRect.height/2 + 30}px`;
              await wait(600);
              if (!running) break;
              
              // Click tube
              vCursor.style.transform = 'scale(0.8)';
              await wait(200);
              if (!running) break;
              
              // Lift block
              topBlock.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
              topBlock.style.transform = 'translateY(-25px) scale(1.1)';
              topBlock.style.filter = 'drop-shadow(0 15px 20px rgba(0,229,255,0.6)) brightness(1.2)';
              
              await wait(600);
              if (!running) break;
              
              vCursor.style.transform = 'scale(1)';
              vCursor.style.opacity = '0';
              topBlock.style.transform = '';
              topBlock.style.filter = '';
              await wait(600);
            }
          };
          animate();
          cleanup.push(() => {
            running = false; vCursor.style.opacity = '0';
            if (tubeA) {
              const blocks = Array.from(tubeA.querySelectorAll('[class*="block-3d-"]'));
              blocks.forEach(b => { b.style.transform = ''; b.style.filter = ''; });
            }
          });
        }
      },
      {
        title: t('tut_sort_move_title') || 'Aktarım',
        text: t('tut_sort_move_desc') || 'Havaya kalkan bloğu boş bir tüpe veya aynı renkteki bloğun üzerine aktarmak için diğer tüpe dokunun.',
        targetSelector: '#tubes-grid',
        animate: (cleanup) => {
          const grid = document.querySelector('#tubes-grid');
          if (!grid || grid.children.length < 2) return;
          const tubeA = grid.children[0];
          const tubeB = grid.children[1];
          let running = true;
          
          let ghostBlock = null;

          const animate = async () => {
            while (running) {
              const blocks = Array.from(tubeA.querySelectorAll('[class*="block-3d-"]'));
              const topBlock = blocks[blocks.length - 1];
              if (!topBlock) break;

              const rA = topBlock.getBoundingClientRect();
              const rB = tubeB.getBoundingClientRect();

              // Lift block
              topBlock.style.opacity = '0.3';
              
              ghostBlock = topBlock.cloneNode(true);
              ghostBlock.style.position = 'fixed';
              ghostBlock.style.zIndex = '90';
              ghostBlock.style.pointerEvents = 'none';
              ghostBlock.style.left = `${rA.left}px`;
              ghostBlock.style.top = `${rA.top - 25}px`;
              ghostBlock.style.width = `${rA.width}px`;
              ghostBlock.style.height = `${rA.height}px`;
              ghostBlock.style.transform = 'scale(1.1)';
              ghostBlock.style.filter = 'drop-shadow(0 15px 20px rgba(0,229,255,0.6)) brightness(1.2)';
              document.body.appendChild(ghostBlock);

              vCursor.style.transition = 'none';
              vCursor.style.left = `${rB.left + rB.width/2}px`;
              vCursor.style.top = `${rB.top + rB.height/2 + 30}px`;
              
              await wait(400);
              vCursor.style.transition = 'all 0.5s ease-out';
              vCursor.style.opacity = '1';
              await wait(600);
              if(!running) break;

              // Click target tube
              vCursor.style.transform = 'scale(0.8)';
              await wait(200);
              
              // Ghost block flies to tube B
              ghostBlock.style.transition = 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
              ghostBlock.style.left = `${rB.left + rB.width/2 - rA.width/2}px`;
              ghostBlock.style.top = `${rB.top + 10}px`;
              
              await wait(400);
              if(!running) break;
              
              ghostBlock.style.opacity = '0';
              tubeB.style.transition = 'all 0.2s';
              tubeB.style.transform = 'scale(1.1)';
              tubeB.style.filter = 'drop-shadow(0 0 20px rgba(74,222,128,1)) brightness(1.2)';
              
              vCursor.style.transform = 'scale(1)';
              vCursor.style.opacity = '0';
              
              await wait(600);
              tubeB.style.transform = '';
              tubeB.style.filter = '';
              topBlock.style.opacity = '1';
              ghostBlock.remove();
              ghostBlock = null;
              await wait(600);
            }
          };
          animate();
          cleanup.push(() => {
            running = false; vCursor.style.opacity = '0';
            if (ghostBlock && ghostBlock.parentNode) ghostBlock.remove();
            Array.from(grid.children).forEach(t => { 
              t.style.transform = ''; t.style.filter = ''; 
              Array.from(t.querySelectorAll('[class*="block-3d-"]')).forEach(b => { b.style.opacity = '1'; b.style.transform = ''; b.style.filter = ''; });
            });
          });
        }
      },
      {
        title: t('tut_sort_finish_title') || 'Tamamlanma',
        text: t('tut_sort_finish_desc') || 'Bir tüpteki tüm blokları tek ve aynı renge dönüştürerek tüpü tamamlayın!',
        targetSelector: '#tubes-grid',
        animate: (cleanup) => {
          const grid = document.querySelector('#tubes-grid');
          if (!grid || grid.children.length < 2) return;
          const tube = grid.children[0];
          let running = true;
          
          const animate = async () => {
            while(running) {
              tube.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
              tube.style.transform = 'scale(1.2) translateY(-10px)';
              tube.style.filter = 'drop-shadow(0 0 30px rgba(74,222,128,1)) brightness(1.5)';
              
              showFloatingScore(grid.parentElement, '+100', '50%', '30%');
              
              await wait(1500);
              if(!running) break;

              tube.style.transform = '';
              tube.style.filter = '';
              await wait(1000);
            }
          };
          animate();
          cleanup.push(() => {
            running = false;
            if(tube) { tube.style.transform = ''; tube.style.filter = ''; }
          });
        }
      }
    ];

  // ----------------------------------------------------------------------
  // 2048
  // ----------------------------------------------------------------------
  } else if (mode === '2048') {
    steps = [
      {
        title: t('tut_2048_swipe_title') || 'Kaydırma Hareketi',
        text: t('tut_2048_swipe_desc') || 'Parmağınızla tahtanın üzerinde sağa, sola, aşağı veya yukarı kaydırarak tüm blokları aynı yöne sürükleyin.',
        targetSelector: '#game-board',
        animate: (cleanup) => {
          const board = document.querySelector('#game-board');
          if (!board) return;
          let running = true;

          const ghostTile1 = document.createElement('div');
          ghostTile1.className = 'absolute flex items-center justify-center font-black rounded-2xl shadow-sm text-3xl bg-gray-300 text-gray-800 z-[70]';
          ghostTile1.textContent = '4';
          ghostTile1.style.width = 'calc(25% - 7.5px)';
          ghostTile1.style.height = 'calc(25% - 7.5px)';
          ghostTile1.style.left = 'calc(25% + 2.5px)'; // Col 1
          ghostTile1.style.top = 'calc(50% + 5px)'; // Row 2
          
          const ghostTile2 = document.createElement('div');
          ghostTile2.className = 'absolute flex items-center justify-center font-black rounded-2xl shadow-sm text-3xl bg-gray-300 text-gray-800 z-[70]';
          ghostTile2.textContent = '4';
          ghostTile2.style.width = 'calc(25% - 7.5px)';
          ghostTile2.style.height = 'calc(25% - 7.5px)';
          ghostTile2.style.left = 'calc(75% + 7.5px)'; // Col 3
          ghostTile2.style.top = 'calc(50% + 5px)'; // Row 2

          board.appendChild(ghostTile1);
          board.appendChild(ghostTile2);

          const animate = async () => {
            while (running) {
              const rect = board.getBoundingClientRect();
              
              ghostTile1.style.transition = 'none';
              ghostTile1.style.left = 'calc(25% + 2.5px)';
              
              ghostTile2.style.transition = 'none';
              ghostTile2.style.transform = 'scale(1)';
              ghostTile2.style.filter = 'none';
              ghostTile2.className = 'absolute flex items-center justify-center font-black rounded-2xl shadow-sm text-3xl bg-gray-300 text-gray-800 z-[70]';
              ghostTile2.textContent = '4';

              vCursor.style.transition = 'none';
              vCursor.style.left = `${rect.left + rect.width * 0.2}px`;
              vCursor.style.top = `${rect.top + rect.height * 0.6}px`;
              
              await wait(200);
              vCursor.style.transition = 'all 0.4s ease';
              vCursor.style.opacity = '1';
              
              await wait(400);
              if (!running) break;
              
              vCursor.style.transform = 'scale(0.8)';
              await wait(300);
              
              // Swipe right
              vCursor.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
              vCursor.style.left = `${rect.left + rect.width * 0.8}px`;
              
              // Tiles slide right
              ghostTile1.style.transition = 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
              ghostTile1.style.left = 'calc(75% + 7.5px)';
              
              await wait(400);
              if (!running) break;
              
              vCursor.style.transform = 'scale(1)';
              vCursor.style.opacity = '0';
              vCursor.style.top = `${rect.top + rect.height}px`;
              
              await wait(800);
            }
          };
          animate();
          cleanup.push(() => {
            running = false; 
            vCursor.style.opacity = '0';
            if(ghostTile1.parentNode) ghostTile1.remove();
            if(ghostTile2.parentNode) ghostTile2.remove();
          });
        }
      },
      {
        title: t('tut_2048_merge_title') || 'Birleştirme',
        text: t('tut_2048_merge_desc') || 'Aynı sayıya sahip iki blok çarpıştığında birleşerek iki katı değere ulaşır.',
        targetSelector: '#game-board',
        animate: (cleanup) => {
          const board = document.querySelector('#game-board');
          if (!board) return;
          let running = true;

          const ghostTile1 = document.createElement('div');
          ghostTile1.className = 'absolute flex items-center justify-center font-black rounded-2xl shadow-sm text-3xl bg-orange-300 text-white z-[70]';
          ghostTile1.textContent = '8';
          ghostTile1.style.width = 'calc(25% - 7.5px)';
          ghostTile1.style.height = 'calc(25% - 7.5px)';
          ghostTile1.style.left = 'calc(50% + 5px)'; // Col 2
          ghostTile1.style.top = 'calc(25% + 2.5px)'; // Row 1
          
          const ghostTile2 = document.createElement('div');
          ghostTile2.className = 'absolute flex items-center justify-center font-black rounded-2xl shadow-sm text-3xl bg-orange-300 text-white z-[70]';
          ghostTile2.textContent = '8';
          ghostTile2.style.width = 'calc(25% - 7.5px)';
          ghostTile2.style.height = 'calc(25% - 7.5px)';
          ghostTile2.style.left = 'calc(75% + 7.5px)'; // Col 3
          ghostTile2.style.top = 'calc(25% + 2.5px)'; // Row 1

          board.appendChild(ghostTile1);
          board.appendChild(ghostTile2);

          const animate = async () => {
            while (running) {
              ghostTile1.style.transition = 'none';
              ghostTile1.style.left = 'calc(50% + 5px)';
              ghostTile1.style.opacity = '1';
              
              ghostTile2.style.transition = 'none';
              ghostTile2.style.transform = 'scale(1)';
              ghostTile2.style.filter = 'none';
              ghostTile2.className = 'absolute flex items-center justify-center font-black rounded-2xl shadow-sm text-3xl bg-orange-300 text-white z-[70]';
              ghostTile2.textContent = '8';

              await wait(600);
              if(!running) break;

              // Slide tile 1 to tile 2
              ghostTile1.style.transition = 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
              ghostTile1.style.left = 'calc(75% + 7.5px)';
              
              await wait(300);
              if(!running) break;

              // Merge pop
              ghostTile1.style.opacity = '0';
              ghostTile2.className = 'absolute flex items-center justify-center font-black rounded-2xl shadow-sm text-3xl bg-orange-400 text-white shadow-orange-500/50 z-[70]';
              ghostTile2.textContent = '16';
              ghostTile2.style.transition = 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
              ghostTile2.style.transform = 'scale(1.2)';
              ghostTile2.style.filter = 'brightness(1.5) drop-shadow(0 0 20px rgba(251,146,60,1))';

              showFloatingScore(board, '+16');
              
              await wait(300);
              ghostTile2.style.transform = 'scale(1)';
              ghostTile2.style.filter = 'none';

              await wait(1500);
            }
          };
          animate();
          cleanup.push(() => {
            running = false; 
            if(ghostTile1.parentNode) ghostTile1.remove();
            if(ghostTile2.parentNode) ghostTile2.remove();
          });
        }
      },
      {
        title: t('tut_2048_goal_title') || 'Hedef 2048',
        text: t('tut_2048_goal_desc') || 'Alan dolmadan blokları sürekli katlayarak "2048" sayısına ulaşmaya çalışın!',
        targetSelector: '#game-board',
        animate: (cleanup) => {
          const board = document.querySelector('#game-board');
          if (!board) return;
          let running = true;
          const animate = async () => {
            while(running) {
              board.style.transition = 'all 1s ease-in-out';
              board.style.boxShadow = '0 0 40px rgba(250,204,21,0.5)';
              await wait(1000);
              if(!running) break;
              board.style.boxShadow = '';
              await wait(1000);
            }
          };
          animate();
          cleanup.push(() => { running = false; board.style.boxShadow = ''; });
        }
      }
    ];

  // ----------------------------------------------------------------------
  // MERGE BLOCK
  // ----------------------------------------------------------------------
  } else if (mode === 'merge') {
    steps = [
      {
        title: t('tut_merge_pieces_title') || 'Blok Seçimi',
        text: t('tut_merge_pieces_desc') || 'Aşağıdaki tepsiden üzerinde sayı yazan bir bloğu seçin.',
        targetSelector: 'main > div:last-child',
        animate: (cleanup) => {
          const trays = document.querySelectorAll('.w-16.h-16.relative');
          if (trays.length === 0) return;
          const piece = trays[0];
          let running = true;

          const animate = async () => {
            while (running) {
              const rect = piece.getBoundingClientRect();
              vCursor.style.transition = 'all 0.5s ease-out';
              vCursor.style.opacity = '1';
              vCursor.style.left = `${rect.left + rect.width/2}px`;
              vCursor.style.top = `${rect.top + rect.height/2 + 40}px`;
              await wait(600);
              if(!running) break;
              
              vCursor.style.transform = 'scale(0.8)';
              piece.style.transition = 'all 0.2s';
              piece.style.transform = 'scale(1.1) translateY(-10px)';
              piece.style.filter = 'drop-shadow(0 15px 20px rgba(59,130,246,0.6))';
              await wait(600);
              if(!running) break;
              
              vCursor.style.transform = 'scale(1)';
              vCursor.style.opacity = '0';
              piece.style.transform = '';
              piece.style.filter = '';
              await wait(800);
            }
          };
          animate();
          cleanup.push(() => {
            running = false; vCursor.style.opacity = '0';
            if(piece){ piece.style.transform = ''; piece.style.filter = ''; }
          });
        }
      },
      {
        title: t('tut_merge_place_title') || 'Yerleştirme',
        text: t('tut_merge_place_desc') || 'Seçtiğiniz bloğu oyun tahtasına taşıyarak dilediğiniz kareye yerleştirin.',
        targetSelector: '#merge-board',
        animate: (cleanup) => {
          const board = document.querySelector('#merge-board');
          const trays = document.querySelectorAll('.w-16.h-16.relative');
          if (!board || trays.length === 0) return;
          const piece = trays[0];
          let running = true;

          const ghostPiece = piece.cloneNode(true);
          ghostPiece.style.position = 'fixed';
          ghostPiece.style.zIndex = '90';
          ghostPiece.style.pointerEvents = 'none';
          document.body.appendChild(ghostPiece);

          const animate = async () => {
            while (running) {
              const rect = piece.getBoundingClientRect();
              ghostPiece.style.transition = 'none';
              ghostPiece.style.left = `${rect.left}px`;
              ghostPiece.style.top = `${rect.top}px`;
              ghostPiece.style.width = `${rect.width}px`;
              ghostPiece.style.height = `${rect.height}px`;
              ghostPiece.style.opacity = '1';
              ghostPiece.style.transform = 'scale(1)';

              vCursor.style.transition = 'none';
              vCursor.style.opacity = '1';
              vCursor.style.left = `${rect.left + rect.width/2}px`;
              vCursor.style.top = `${rect.top + rect.height/2}px`;
              vCursor.style.transform = 'scale(0.8)';
              await wait(400);
              if (!running) break;

              const boardRect = board.getBoundingClientRect();
              vCursor.style.transition = 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
              ghostPiece.style.transition = 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
              
              // Place in center of board
              const targetX = boardRect.left + boardRect.width/2;
              const targetY = boardRect.top + boardRect.height/2; 

              vCursor.style.left = `${targetX}px`;
              vCursor.style.top = `${targetY}px`;
              ghostPiece.style.left = `${targetX - rect.width/2}px`;
              ghostPiece.style.top = `${targetY - rect.height/2}px`;
              await wait(1000);
              if (!running) break;

              vCursor.style.transform = 'scale(1)';
              vCursor.style.opacity = '0';
              ghostPiece.style.transform = 'scale(0.8)';
              ghostPiece.style.opacity = '0';
              await wait(1000);
            }
          };
          animate();
          cleanup.push(() => {
            running = false; vCursor.style.opacity = '0';
            if(ghostPiece && ghostPiece.parentNode) ghostPiece.remove();
          });
        }
      },
      {
        title: t('tut_merge_clear_title') || '3 lü Birleşme',
        text: t('tut_merge_clear_desc') || 'Aynı sayıdan en az 3 tanesi yan yana gelirse, birbirlerine çekilerek birleşir ve daha büyük bir sayıya dönüşür.',
        targetSelector: '#merge-board',
        animate: (cleanup) => {
          const board = document.querySelector('#merge-board');
          if (!board) return;
          let running = true;
          
          // We will create 3 ghost blocks to simulate merging
          const ghost1 = document.createElement('div');
          ghost1.className = 'absolute flex items-center justify-center font-black rounded-2xl shadow-md text-2xl bg-blue-300 text-blue-900 z-[70]';
          ghost1.textContent = '2';
          
          const ghost2 = document.createElement('div');
          ghost2.className = 'absolute flex items-center justify-center font-black rounded-2xl shadow-md text-2xl bg-blue-300 text-blue-900 z-[70]';
          ghost2.textContent = '2';

          const ghost3 = document.createElement('div');
          ghost3.className = 'absolute flex items-center justify-center font-black rounded-2xl shadow-md text-2xl bg-blue-300 text-blue-900 z-[70]';
          ghost3.textContent = '2';

          board.appendChild(ghost1);
          board.appendChild(ghost2);
          board.appendChild(ghost3);

          const animate = async () => {
            while (running) {
              const cellSize = 'calc(20% - 4.8px)'; // Assuming 5x5 grid -> 20%
              
              [ghost1, ghost2, ghost3].forEach(g => {
                g.style.transition = 'none';
                g.style.width = cellSize;
                g.style.height = cellSize;
                g.style.opacity = '1';
                g.style.transform = 'scale(1)';
                g.style.filter = 'none';
                g.className = 'absolute flex items-center justify-center font-black rounded-2xl shadow-md text-2xl bg-blue-300 text-blue-900 z-[70]';
                g.textContent = '2';
              });

              // Initial positions: horizontal line
              ghost1.style.left = 'calc(20% + 1.2px)';
              ghost1.style.top = 'calc(40% + 2.4px)';
              
              ghost2.style.left = 'calc(40% + 2.4px)'; // Center piece
              ghost2.style.top = 'calc(40% + 2.4px)';

              ghost3.style.left = 'calc(60% + 3.6px)';
              ghost3.style.top = 'calc(40% + 2.4px)';

              await wait(800);
              if(!running) break;
              
              // Pull into center piece (ghost2)
              [ghost1, ghost3].forEach(g => {
                g.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                g.style.left = 'calc(40% + 2.4px)';
                g.style.top = 'calc(40% + 2.4px)';
              });

              await wait(300);
              if(!running) break;

              // Merge pop
              ghost1.style.opacity = '0';
              ghost3.style.opacity = '0';
              
              ghost2.className = 'absolute flex items-center justify-center font-black rounded-2xl text-2xl bg-blue-400 text-white shadow-lg shadow-blue-500/50 z-[70]';
              ghost2.textContent = '4';
              ghost2.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
              ghost2.style.transform = 'scale(1.3)';
              ghost2.style.filter = 'brightness(1.3) drop-shadow(0 0 20px rgba(59,130,246,0.8))';

              showFloatingScore(board, '+10', '50%', '30%');
              
              await wait(400);
              ghost2.style.transform = 'scale(1)';
              ghost2.style.filter = 'none';

              await wait(1500);
            }
          };
          animate();
          cleanup.push(() => {
            running = false;
            if(ghost1.parentNode) ghost1.remove();
            if(ghost2.parentNode) ghost2.remove();
            if(ghost3.parentNode) ghost3.remove();
          });
        }
      }
    ];
  } else if (mode === 'x2') {
    steps = [
      {
        title: t('x2_tutorial_title') || 'X2 2048 Nasıl Oynanır?',
        text: t('x2_tutorial_1') || 'Blokları sütunlara fırlatın',
        targetSelector: '#x2-board',
        animate: (cleanup) => {
          const board = document.querySelector('#x2-board');
          if (!board) return;
          let running = true;

          // Helper: get one cell rect by col/row index (0-based)
          const getCellRect = (col, row) => {
            const br = board.getBoundingClientRect();
            const cols = 5, rows = 7;
            const cw = br.width / cols;
            const ch = br.height / rows;
            return {
              left: br.left + col * cw,
              top: br.top + row * ch,
              width: cw,
              height: ch,
              cx: br.left + col * cw + cw / 2,
              cy: br.top + row * ch + ch / 2,
            };
          };

          const ghost = document.createElement('div');
          ghost.className = 'fixed flex items-center justify-center font-black rounded-xl shadow-md text-xl bg-orange-400 text-white z-[300] pointer-events-none';
          ghost.textContent = '4';
          document.body.appendChild(ghost);

          const animate = async () => {
            while (running) {
              const cell = getCellRect(2, 0);
              const boardRect = board.getBoundingClientRect();
              ghost.style.width = `${cell.width - 4}px`;
              ghost.style.height = `${cell.height - 4}px`;

              // Start below the board
              ghost.style.transition = 'none';
              ghost.style.left = `${cell.cx - cell.width / 2 + 2}px`;
              ghost.style.top = `${boardRect.bottom + 20}px`;
              ghost.style.opacity = '0';
              ghost.style.transform = 'scale(0.7)';

              vCursor.style.transition = 'none';
              vCursor.style.left = `${cell.cx}px`;
              vCursor.style.top = `${boardRect.bottom + 60}px`;
              vCursor.style.opacity = '0';

              await wait(300);
              if (!running) break;

              // Cursor appears
              vCursor.style.transition = 'all 0.3s ease';
              vCursor.style.opacity = '1';
              ghost.style.transition = 'all 0.3s ease';
              ghost.style.opacity = '1';
              ghost.style.transform = 'scale(1)';

              await wait(500);
              if (!running) break;

              // Cursor click effect
              vCursor.style.transform = 'scale(0.8)';
              await wait(150);
              vCursor.style.transform = 'scale(1)';

              // Block shoots up into board
              ghost.style.transition = 'all 0.35s cubic-bezier(0.25, 1, 0.5, 1)';
              ghost.style.top = `${cell.top + 2}px`;
              ghost.style.boxShadow = '0 8px 24px rgba(251,146,60,0.5)';

              await wait(400);
              if (!running) break;

              // Land shake
              ghost.style.transition = 'all 0.1s';
              ghost.style.transform = 'scale(1.1)';
              await wait(100);
              ghost.style.transform = 'scale(1)';
              ghost.style.boxShadow = 'none';

              vCursor.style.opacity = '0';

              await wait(1000);
              if (!running) break;

              // Fade out
              ghost.style.transition = 'all 0.3s';
              ghost.style.opacity = '0';
              await wait(400);
            }
          };
          animate();
          cleanup.push(() => {
            running = false;
            vCursor.style.opacity = '0';
            if (ghost.parentNode) ghost.remove();
          });
        }
      },
      {
        title: t('tut_2048_merge_title') || 'Birleştirme',
        text: t('x2_tutorial_2') || 'Aynı sayıları birleştirin',
        targetSelector: '#x2-board',
        animate: (cleanup) => {
          const board = document.querySelector('#x2-board');
          if (!board) return;
          let running = true;

          const getCellRect = (col, row) => {
            const br = board.getBoundingClientRect();
            const cols = 5, rows = 7;
            const cw = br.width / cols;
            const ch = br.height / rows;
            return {
              left: br.left + col * cw,
              top: br.top + row * ch,
              width: cw, height: ch,
              cx: br.left + col * cw + cw / 2,
              cy: br.top + row * ch + ch / 2,
            };
          };

          const ghost1 = document.createElement('div');
          ghost1.className = 'fixed flex items-center justify-center font-black rounded-xl shadow-md text-xl bg-orange-400 text-white z-[300] pointer-events-none';
          ghost1.textContent = '4';
          document.body.appendChild(ghost1);

          const ghost2 = document.createElement('div');
          ghost2.className = 'fixed flex items-center justify-center font-black rounded-xl shadow-md text-xl bg-orange-400 text-white z-[300] pointer-events-none';
          ghost2.textContent = '4';
          document.body.appendChild(ghost2);

          const animate = async () => {
            while (running) {
              const cell0 = getCellRect(2, 0);
              const cell1 = getCellRect(2, 1);
              const boardRect = board.getBoundingClientRect();
              const cw = cell0.width - 4;
              const ch = cell0.height - 4;

              // First block already at row 0
              ghost1.style.width = `${cw}px`;
              ghost1.style.height = `${ch}px`;
              ghost1.style.transition = 'none';
              ghost1.style.left = `${cell0.left + 2}px`;
              ghost1.style.top = `${cell0.top + 2}px`;
              ghost1.style.opacity = '1';
              ghost1.style.transform = 'scale(1)';
              ghost1.className = 'fixed flex items-center justify-center font-black rounded-xl shadow-md text-xl bg-orange-400 text-white z-[300] pointer-events-none';
              ghost1.textContent = '4';

              // Second block starts below the board
              ghost2.style.width = `${cw}px`;
              ghost2.style.height = `${ch}px`;
              ghost2.style.transition = 'none';
              ghost2.style.left = `${cell0.left + 2}px`;
              ghost2.style.top = `${boardRect.bottom + 20}px`;
              ghost2.style.opacity = '0.8';
              ghost2.style.transform = 'scale(0.85)';
              ghost2.className = 'fixed flex items-center justify-center font-black rounded-xl shadow-md text-xl bg-orange-400 text-white z-[300] pointer-events-none';
              ghost2.textContent = '4';

              await wait(600);
              if (!running) break;

              // Shoot second block up to row 1
              ghost2.style.transition = 'all 0.35s cubic-bezier(0.25, 1, 0.5, 1)';
              ghost2.style.top = `${cell1.top + 2}px`;
              ghost2.style.opacity = '1';
              ghost2.style.transform = 'scale(1)';

              await wait(400);
              if (!running) break;

              // Merge DOWN: ghost1 moves down to ghost2
              ghost1.style.transition = 'all 0.15s cubic-bezier(0.25, 1, 0.5, 1)';
              ghost1.style.top = `${cell1.top + 2}px`;
              
              await wait(150);
              if (!running) break;

              // Merge flash at cell1
              ghost1.style.opacity = '0';
              ghost2.textContent = '8';
              ghost2.className = 'fixed flex items-center justify-center font-black rounded-xl text-xl bg-red-500 text-white shadow-lg z-[300] pointer-events-none';
              ghost2.style.transition = 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
              ghost2.style.transform = 'scale(1.3)';
              ghost2.style.filter = 'brightness(1.5) drop-shadow(0 0 16px rgba(239,68,68,0.8))';

              showFloatingScore(board, '+8');

              await wait(250);
              if (!running) break;
              
              // Gravity pulls the merged block UP to row 0
              ghost2.style.transform = 'scale(1)';
              ghost2.style.filter = 'none';
              ghost2.style.transition = 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)';
              ghost2.style.top = `${cell0.top + 2}px`;

              await wait(1000);
              if (!running) break;

              ghost2.style.transition = 'all 0.3s';
              ghost2.style.opacity = '0';
              await wait(350);
            }
          };
          animate();
          cleanup.push(() => {
            running = false;
            if (ghost1.parentNode) ghost1.remove();
            if (ghost2.parentNode) ghost2.remove();
          });
        }
      },
      {
        title: t('x2_combo') || 'Kombo!',
        text: t('x2_tutorial_3') || 'Zincirleme kombolar yapın',
        targetSelector: '#x2-board',
        animate: (cleanup) => {
          const board = document.querySelector('#x2-board');
          if (!board) return;
          let running = true;

          const getCellRect = (col, row) => {
            const br = board.getBoundingClientRect();
            const cols = 5, rows = 7;
            const cw = br.width / cols;
            const ch = br.height / rows;
            return { left: br.left + col * cw, top: br.top + row * ch, width: cw, height: ch };
          };

          const makeBlock = (color, text) => {
            const el = document.createElement('div');
            el.className = `fixed flex items-center justify-center font-black rounded-xl text-xl ${color} text-white z-[300] pointer-events-none`;
            el.textContent = text;
            document.body.appendChild(el);
            return el;
          };

          const g1 = makeBlock('bg-red-500', '8');
          const g2 = makeBlock('bg-orange-400', '4');
          const g3 = makeBlock('bg-orange-400', '4');

          const animate = async () => {
            while (running) {
              const c1 = getCellRect(2, 0);
              const c2 = getCellRect(3, 0);
              const c3below = getCellRect(3, 1);
              const boardRect = board.getBoundingClientRect();
              const cw = c1.width - 4, ch = c1.height - 4;

              [g1, g2, g3].forEach(g => { g.style.width = `${cw}px`; g.style.height = `${ch}px`; });

              // Reset
              g1.style.transition = 'none'; g1.style.left = `${c1.left + 2}px`; g1.style.top = `${c1.top + 2}px`; g1.style.opacity = '1'; g1.style.transform = 'scale(1)'; g1.className = 'fixed flex items-center justify-center font-black rounded-xl text-xl bg-red-500 text-white z-[300] pointer-events-none'; g1.textContent = '8';
              g2.style.transition = 'none'; g2.style.left = `${c2.left + 2}px`; g2.style.top = `${c2.top + 2}px`; g2.style.opacity = '1'; g2.style.transform = 'scale(1)'; g2.className = 'fixed flex items-center justify-center font-black rounded-xl text-xl bg-orange-400 text-white z-[300] pointer-events-none'; g2.textContent = '4';
              g3.style.transition = 'none'; g3.style.left = `${c2.left + 2}px`; g3.style.top = `${boardRect.bottom + 20}px`; g3.style.opacity = '0.8'; g3.style.transform = 'scale(0.85)'; g3.className = 'fixed flex items-center justify-center font-black rounded-xl text-xl bg-orange-400 text-white z-[300] pointer-events-none'; g3.textContent = '4';

              await wait(600);
              if (!running) break;

              // Shoot g3 up to (3, 1)
              g3.style.transition = 'all 0.35s cubic-bezier(0.25, 1, 0.5, 1)';
              g3.style.top = `${c3below.top + 2}px`;
              g3.style.opacity = '1'; g3.style.transform = 'scale(1)';

              await wait(400);
              if (!running) break;

              // Merge DOWN: g2 moves down to g3
              g2.style.transition = 'all 0.15s cubic-bezier(0.25, 1, 0.5, 1)';
              g2.style.top = `${c3below.top + 2}px`;
              
              await wait(150);
              if (!running) break;

              // Flash g3 (now 8)
              g2.style.opacity = '0';
              g3.textContent = '8';
              g3.className = 'fixed flex items-center justify-center font-black rounded-xl text-xl bg-red-500 text-white z-[300] pointer-events-none';
              g3.style.transition = 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
              g3.style.transform = 'scale(1.25)';
              g3.style.filter = 'brightness(1.5)';

              await wait(250);
              if (!running) break;
              g3.style.transform = 'scale(1)'; g3.style.filter = 'none';
              
              // Gravity pulls g3 UP to (3,0)
              g3.style.transition = 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)';
              g3.style.top = `${c2.top + 2}px`;
              
              await wait(300);
              if (!running) break;

              // Merge LEFT: g3 moves to g1
              g3.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
              g3.style.left = `${c1.left + 2}px`;

              await wait(350);
              if (!running) break;

              g3.style.opacity = '0';
              g1.textContent = '16';
              g1.className = 'fixed flex items-center justify-center font-black rounded-xl text-xl bg-purple-500 text-white shadow-lg z-[300] pointer-events-none';
              g1.style.transition = 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
              g1.style.transform = 'scale(1.35)';
              g1.style.filter = 'brightness(1.5) drop-shadow(0 0 20px rgba(168,85,247,0.8))';

              showFloatingScore(board, '🔥 Combo +24!');

              await wait(380);
              g1.style.transform = 'scale(1)'; g1.style.filter = 'none';

              await wait(1300);
              if (!running) break;
              g1.style.transition = 'all 0.3s'; g1.style.opacity = '0';
              g3.style.transition = 'all 0.3s'; g3.style.opacity = '0';
              await wait(350);
            }
          };
          animate();
          cleanup.push(() => {
            running = false;
            if (g1.parentNode) g1.remove();
            if (g2.parentNode) g2.remove();
            if (g3.parentNode) g3.remove();
          });
        }
      },
      {
        title: t('x2_hammer') || '🔨 Çekiç',
        text: t('x2_tutorial_hammer_text') || 'Çekiç ile istediğiniz bir bloğu kırıp yok edebilirsiniz.',
        targetSelector: '#x2-board',
        animate: (cleanup) => {
          const board = document.querySelector('#x2-board');
          if (!board) return;
          let running = true;

          const getCellRect = (col, row) => {
            const br = board.getBoundingClientRect();
            const cols = 5, rows = 7;
            const cw = br.width / cols;
            const ch = br.height / rows;
            return { left: br.left + col * cw, top: br.top + row * ch, width: cw, height: ch, cx: br.left + col * cw + cw / 2, cy: br.top + row * ch + ch / 2 };
          };

          const g1 = document.createElement('div');
          g1.className = 'fixed flex items-center justify-center font-black rounded-xl text-xl bg-orange-400 text-white z-[300] pointer-events-none';
          g1.textContent = '4';
          document.body.appendChild(g1);

          const hammer = document.createElement('div');
          hammer.className = 'fixed text-4xl z-[310] pointer-events-none drop-shadow-2xl';
          hammer.textContent = '🔨';
          document.body.appendChild(hammer);

          // Crack effect overlay
          const crack = document.createElement('div');
          crack.className = 'fixed z-[310] pointer-events-none';
          crack.innerHTML = `<svg viewBox="0 0 100 100" width="100%" height="100%"><line x1="30" y1="20" x2="70" y2="80" stroke="white" stroke-width="5" stroke-linecap="round" opacity="0.9"/><line x1="55" y1="15" x2="45" y2="85" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.7"/></svg>`;
          crack.style.opacity = '0';
          document.body.appendChild(crack);

          const animate = async () => {
            const hammerBtn = document.querySelector('#x2-power-hammer');
            while (running) {
              const cell = getCellRect(2, 1);
              const cw = cell.width - 4, ch = cell.height - 4;

              // Position block
              g1.style.transition = 'none';
              g1.style.width = `${cw}px`; g1.style.height = `${ch}px`;
              g1.style.left = `${cell.left + 2}px`; g1.style.top = `${cell.top + 2}px`;
              g1.style.opacity = '1'; g1.style.transform = 'scale(1)';

              // Hammer starts top-right of block, off screen a bit
              hammer.style.transition = 'none';
              hammer.style.fontSize = `${Math.min(cw, ch) * 0.9}px`;
              hammer.style.left = `${cell.left + cw + 10}px`;
              hammer.style.top = `${cell.top - ch}px`;
              hammer.style.opacity = '0';
              hammer.style.transform = 'rotate(45deg) scale(0.5)';

              crack.style.width = `${cw}px`; crack.style.height = `${ch}px`;
              crack.style.left = `${cell.left + 2}px`; crack.style.top = `${cell.top + 2}px`;
              crack.style.opacity = '0';

              await wait(500);
              if (!running) break;

              if (hammerBtn) {
                hammerBtn.style.transition = 'all 0.5s ease-out';
                hammerBtn.style.transform = 'scale(1.15)';
                hammerBtn.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.8)';
              }

              // Hammer swoops in
              hammer.style.transition = 'all 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
              hammer.style.opacity = '1';
              hammer.style.left = `${cell.left + cw * 0.2}px`;
              hammer.style.top = `${cell.top - ch * 0.1}px`;
              hammer.style.transform = 'rotate(0deg) scale(1.1)';

              await wait(500);
              if (!running) break;

              // Strike!
              hammer.style.transition = 'all 0.1s ease-in';
              hammer.style.top = `${cell.top + ch * 0.1}px`;
              hammer.style.transform = 'rotate(-15deg) scale(0.9)';

              g1.style.transition = 'all 0.1s';
              g1.style.transform = 'scale(0.9)';

              await wait(120);
              if (!running) break;

              // Crack appears
              crack.style.transition = 'opacity 0.1s';
              crack.style.opacity = '1';

              await wait(150);
              if (!running) break;

              // Block shatters
              g1.style.transition = 'all 0.4s cubic-bezier(0.55, 0, 1, 0.45)';
              g1.style.transform = 'scale(1.4)';
              g1.style.opacity = '0';
              g1.style.filter = 'blur(4px)';

              hammer.style.transition = 'all 0.4s ease-out';
              hammer.style.opacity = '0';
              hammer.style.transform = 'rotate(-45deg) scale(0.6)';

              crack.style.transition = 'opacity 0.3s';
              crack.style.opacity = '0';

              await wait(1500);
              if (!running) break;

              // Reset
              g1.style.filter = 'none';
              if (hammerBtn) {
                hammerBtn.style.transform = 'scale(1)';
                hammerBtn.style.boxShadow = '';
              }
            }
          };
          animate();
          cleanup.push(() => {
            running = false;
            if (g1.parentNode) g1.remove();
            if (hammer.parentNode) hammer.remove();
            if (crack.parentNode) crack.remove();
            const btn = document.querySelector('#x2-power-hammer');
            if (btn) {
              btn.style.transition = 'none';
              btn.style.transform = '';
              btn.style.boxShadow = '';
            }
          });
        }
      },
      {
        title: t('x2_swap') || '🔄 Takas',
        text: t('x2_tutorial_swap_text') || 'Takas özelliği ile iki bloğun yerini değiştirebilirsiniz.',
        targetSelector: '#x2-board',
        animate: (cleanup) => {
          const board = document.querySelector('#x2-board');
          if (!board) return;
          let running = true;

          const getCellRect = (col, row) => {
            const br = board.getBoundingClientRect();
            const cols = 5, rows = 7;
            const cw = br.width / cols;
            const ch = br.height / rows;
            return { left: br.left + col * cw, top: br.top + row * ch, width: cw, height: ch, cx: br.left + col * cw + cw / 2, cy: br.top + row * ch + ch / 2 };
          };

          const g1 = document.createElement('div');
          g1.className = 'fixed flex items-center justify-center font-black rounded-xl text-xl bg-red-500 text-white z-[300] pointer-events-none';
          g1.textContent = '8';
          document.body.appendChild(g1);

          const g2 = document.createElement('div');
          g2.className = 'fixed flex items-center justify-center font-black rounded-xl text-xl bg-orange-400 text-white z-[300] pointer-events-none';
          g2.textContent = '4';
          document.body.appendChild(g2);

          // Swap arrows
          const arrows = document.createElement('div');
          arrows.className = 'fixed text-2xl z-[310] pointer-events-none font-black text-cyan-400 drop-shadow-lg';
          arrows.textContent = '⇄';
          arrows.style.opacity = '0';
          document.body.appendChild(arrows);

          const animate = async () => {
            const swapBtn = document.querySelector('#x2-power-swap');
            while (running) {
              const c1 = getCellRect(1, 0);
              const c2 = getCellRect(3, 0);
              const cw = c1.width - 4, ch = c1.height - 4;

              g1.style.width = `${cw}px`; g1.style.height = `${ch}px`;
              g2.style.width = `${cw}px`; g2.style.height = `${ch}px`;

              // Reset positions
              g1.style.transition = 'none';
              g1.style.left = `${c1.left + 2}px`; g1.style.top = `${c1.top + 2}px`;
              g1.style.opacity = '1'; g1.style.transform = 'scale(1)';
              g1.style.zIndex = '300';

              g2.style.transition = 'none';
              g2.style.left = `${c2.left + 2}px`; g2.style.top = `${c2.top + 2}px`;
              g2.style.opacity = '1'; g2.style.transform = 'scale(1)';
              g2.style.zIndex = '300';

              arrows.style.fontSize = `${cw * 0.6}px`;
              arrows.style.left = `${(c1.cx + c2.cx) / 2 - cw * 0.3}px`;
              arrows.style.top = `${c1.top - cw * 0.5}px`;
              arrows.style.opacity = '0';
              arrows.style.transform = 'scale(0.5)';
              arrows.style.transition = 'none';

              await wait(600);
              if (!running) break;

              // Show arrows
              arrows.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
              arrows.style.opacity = '1';
              arrows.style.transform = 'scale(1)';

              await wait(500);
              if (!running) break;

              if (swapBtn) {
                swapBtn.style.transition = 'all 0.5s ease-out';
                swapBtn.style.transform = 'scale(1.15)';
                swapBtn.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.8)';
              }

              // Highlight both blocks
              g1.style.transition = 'all 0.2s';
              g2.style.transition = 'all 0.2s';
              g1.style.transform = 'scale(1.1)';
              g2.style.transform = 'scale(1.1)';
              g1.style.boxShadow = '0 0 20px rgba(239,68,68,0.7)';
              g2.style.boxShadow = '0 0 20px rgba(251,146,60,0.7)';

              await wait(300);
              if (!running) break;

              // Swap with arc motion
              g1.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
              g2.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';

              // g1 goes to c2, g2 goes to c1 — slight arc via translateY
              g1.style.left = `${c2.left + 2}px`;
              g1.style.transform = 'scale(1.1) translateY(-12px)';
              g1.style.zIndex = '302';

              g2.style.left = `${c1.left + 2}px`;
              g2.style.transform = 'scale(1.1) translateY(12px)';
              g2.style.zIndex = '301';

              await wait(350);
              if (!running) break;
              g1.style.transform = 'scale(1) translateY(0)';
              g2.style.transform = 'scale(1) translateY(0)';

              await wait(350);
              if (!running) break;

              // Land
              g1.style.boxShadow = 'none'; g2.style.boxShadow = 'none';
              arrows.style.transition = 'all 0.3s'; arrows.style.opacity = '0';
              if (swapBtn) {
                swapBtn.style.transform = 'scale(1)';
                swapBtn.style.boxShadow = '';
              }

              await wait(1200);
              if (!running) break;

              // Fade out
              g1.style.transition = 'all 0.3s'; g1.style.opacity = '0';
              g2.style.transition = 'all 0.3s'; g2.style.opacity = '0';
              await wait(350);
            }
          };
          animate();
          cleanup.push(() => {
            running = false;
            if (g1.parentNode) g1.remove();
            if (g2.parentNode) g2.remove();
            if (arrows.parentNode) arrows.remove();
            const btn = document.querySelector('#x2-power-swap');
            if (btn) {
              btn.style.transition = 'none';
              btn.style.transform = '';
              btn.style.boxShadow = '';
            }
          });
        }
      }
    ];
  } else if (mode === 'match') {
    const { hasCages = true, hasWalls = true } = options;
    steps = [
      {
        title: t('tut_match_title') || 'Blok Patlatmaca',
        text: t('tut_match_desc') || 'Aynı renkteki yan yana duran en az 2 bloğa tıklayarak onları patlat.',
        targetSelector: '#game-board',
        animate: (cleanup) => {
          const board = document.querySelector('#game-board');
          if (!board) return;
          let running = true;
          let highlightedEls = [];
          let particleEls = [];

          // === Find a valid swap that creates a match of 3 ===
          function findValidSwap() {
            const blocks = Array.from(board.querySelectorAll('.match-block'));
            const grid = {};
            let maxR = 0, maxC = 0;
            blocks.forEach(b => {
              const r = parseInt(b.dataset.row);
              const c = parseInt(b.dataset.col);
              if (r > maxR) maxR = r;
              if (c > maxC) maxC = c;
              grid[`${r},${c}`] = b;
            });

            function checkMatch(r, c, color) {
                let hCount = 1;
                for (let dx = 1; dx <= 2; dx++) {
                    const b = grid[`${r},${c+dx}`];
                    if (b && b.dataset.color === color) hCount++; else break;
                }
                for (let dx = -1; dx >= -2; dx--) {
                    const b = grid[`${r},${c+dx}`];
                    if (b && b.dataset.color === color) hCount++; else break;
                }
                if (hCount >= 3) {
                   const matched = [grid[`${r},${c}`]];
                   for(let dx=1; dx<=2; dx++) { const b = grid[`${r},${c+dx}`]; if(b && b.dataset.color===color) matched.push(b); else break; }
                   for(let dx=-1; dx>=-2; dx--) { const b = grid[`${r},${c+dx}`]; if(b && b.dataset.color===color) matched.push(b); else break; }
                   return matched;
                }

                let vCount = 1;
                for (let dy = 1; dy <= 2; dy++) {
                    const b = grid[`${r+dy},${c}`];
                    if (b && b.dataset.color === color) vCount++; else break;
                }
                for (let dy = -1; dy >= -2; dy--) {
                    const b = grid[`${r+dy},${c}`];
                    if (b && b.dataset.color === color) vCount++; else break;
                }
                if (vCount >= 3) {
                   const matched = [grid[`${r},${c}`]];
                   for(let dy=1; dy<=2; dy++) { const b = grid[`${r+dy},${c}`]; if(b && b.dataset.color===color) matched.push(b); else break; }
                   for(let dy=-1; dy>=-2; dy--) { const b = grid[`${r+dy},${c}`]; if(b && b.dataset.color===color) matched.push(b); else break; }
                   return matched;
                }
                return null;
            }

            for (let r = 0; r <= maxR; r++) {
              for (let c = 0; c <= maxC; c++) {
                 const current = grid[`${r},${c}`];
                 if (!current || !current.dataset.color || current.dataset.color === '0') continue;
                 const color = current.dataset.color;

                 // Try swap Right
                 const right = grid[`${r},${c+1}`];
                 if (right && right.dataset.color !== '0' && right.dataset.color !== color) {
                     grid[`${r},${c}`] = right;
                     grid[`${r},${c+1}`] = current;
                     let matchGroup = checkMatch(r, c, right.dataset.color) || checkMatch(r, c+1, color);
                     grid[`${r},${c}`] = current;
                     grid[`${r},${c+1}`] = right;

                     if (matchGroup) return { b1: current, b2: right, group: matchGroup };
                 }

                 // Try swap Down
                 const down = grid[`${r+1},${c}`];
                 if (down && down.dataset.color !== '0' && down.dataset.color !== color) {
                     grid[`${r},${c}`] = down;
                     grid[`${r+1},${c}`] = current;
                     let matchGroup = checkMatch(r, c, down.dataset.color) || checkMatch(r+1, c, color);
                     grid[`${r},${c}`] = current;
                     grid[`${r+1},${c}`] = down;

                     if (matchGroup) return { b1: current, b2: down, group: matchGroup };
                 }
              }
            }
            return null;
          }

          const animate = async () => {
            while (running) {
              const swapData = findValidSwap();
              if (!swapData) { await wait(1000); continue; }

              const { b1, b2, group } = swapData;
              const r1 = b1.getBoundingClientRect();
              const r2 = b2.getBoundingClientRect();
              
              const startX = r1.left + r1.width / 2;
              const startY = r1.top + r1.height / 2;
              const endX = r2.left + r2.width / 2;
              const endY = r2.top + r2.height / 2;

              // Phase 1: Cursor appears
              vCursor.style.transition = 'all 0.4s ease-out';
              vCursor.style.opacity = '1';
              vCursor.style.left = `${startX + 60}px`;
              vCursor.style.top = `${startY + 70}px`;
              vCursor.style.transform = 'scale(1)';
              await wait(500);
              if (!running) break;

              // Phase 2: Cursor glides to first block
              vCursor.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
              vCursor.style.left = `${startX}px`;
              vCursor.style.top = `${startY}px`;
              await wait(600);
              if (!running) break;

              // Phase 3: Cursor presses down
              vCursor.style.transition = 'all 0.15s ease-in';
              vCursor.style.transform = 'scale(0.75)';
              b1.style.transition = 'transform 0.15s ease-out';
              b1.style.transform = 'scale(1.1)';
              b1.style.zIndex = '20';
              await wait(200);
              if (!running) break;

              // Phase 4: Drag to neighbor block (swap)
              vCursor.style.transition = 'all 0.4s ease-in-out';
              vCursor.style.left = `${endX}px`;
              vCursor.style.top = `${endY}px`;
              
              b1.style.transition = 'all 0.4s ease-in-out';
              b2.style.transition = 'all 0.4s ease-in-out';
              
              const dx = r2.left - r1.left;
              const dy = r2.top - r1.top;
              
              b1.style.transform = `translate(${dx}px, ${dy}px) scale(1.1)`;
              b2.style.transform = `translate(${-dx}px, ${-dy}px) scale(0.9)`;
              
              await wait(450);
              if (!running) break;

              // Phase 5: Release and Blast
              vCursor.style.transition = 'all 0.2s ease-out';
              vCursor.style.transform = 'scale(1)';
              
              b1.style.transform = `translate(${dx}px, ${dy}px) scale(1)`;
              b2.style.transform = `translate(${-dx}px, ${-dy}px) scale(1)`;
              
              await wait(200);
              if (!running) break;

              // Blast animation for matched group
              highlightedEls = [...group, b1, b2]; // Make sure b1, b2 are restored later
              
              for (const b of group) {
                b.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                b.style.filter = 'brightness(2) drop-shadow(0 0 20px white)';
              }
              await wait(150);
              if (!running) break;

              // Create burst particles
              for (const b of group) {
                // Approximate block rect after transform
                const bRect = b.getBoundingClientRect();
                const bx = bRect.left + bRect.width / 2;
                const by = bRect.top + bRect.height / 2;
                const color = b.style.background || '#00e5ff';

                for (let p = 0; p < 4; p++) {
                  const particle = document.createElement('div');
                  particle.style.cssText = `position:fixed;pointer-events:none;z-index:20;width:6px;height:6px;border-radius:50%;background:${color};left:${bx}px;top:${by}px;transition:all 0.6s cubic-bezier(0.25, 1, 0.5, 1);opacity:1;`;
                  document.body.appendChild(particle);
                  particleEls.push(particle);

                  const angle = (p / 4) * Math.PI * 2 + Math.random() * 0.5;
                  const dist = 25 + Math.random() * 30;
                  setTimeout(() => {
                    particle.style.left = (bx + Math.cos(angle) * dist) + 'px';
                    particle.style.top = (by + Math.sin(angle) * dist) + 'px';
                    particle.style.opacity = '0';
                    particle.style.transform = 'scale(0.2)';
                  }, 30);
                  setTimeout(() => { if (particle.parentNode) particle.remove(); }, 700);
                }

                // Shrink and rotate block away
                b.style.transform = `scale(0) rotate(${Math.random() > 0.5 ? 90 : -90}deg)`;
                b.style.opacity = '0';
              }

              // Floating score
              const bRect2 = board.getBoundingClientRect();
              const pX = ((endX - bRect2.left) / bRect2.width * 100) + '%';
              const pY = ((endY - bRect2.top) / bRect2.height * 100) + '%';
              showFloatingScore(board, '+' + (group.length * 10), pX, pY);

              await wait(600);
              if (!running) break;

              // Cursor fades away
              vCursor.style.transition = 'all 0.6s ease-in';
              vCursor.style.opacity = '0';
              vCursor.style.top = `${endY + 80}px`;

              await wait(600);
              if (!running) break;

              // Phase 9: Restore all blocks
              for (const b of highlightedEls) {
                b.style.transition = 'none';
                b.style.transform = '';
                b.style.filter = '';
                b.style.opacity = '';
                b.style.zIndex = '';
              }
              highlightedEls = [];

              await wait(800);
            }
          };
          animate();

          cleanup.push(() => {
            running = false;
            vCursor.style.opacity = '0';
            for (const b of highlightedEls) {
              b.style.transition = 'none';
              b.style.transform = '';
              b.style.filter = '';
              b.style.opacity = '';
              b.style.zIndex = '';
            }
            for (const p of particleEls) {
              if (p.parentNode) p.remove();
            }
          });
        }
      },
      {
        title: t('tut_match_target_title') || 'Hedefleri Topla',
        text: t('tut_match_target_desc') || 'Hamlen bitmeden yukarıdaki hedefleri toplayarak bölümü geç.',
        targetSelector: '#match-target-bar',
        animate: (cleanup) => {
          const targetBar = document.querySelector('#match-target-bar');
          if (!targetBar) return;
          let running = true;
          let targetItems = [];

          const animate = async () => {
            while (running) {
              const rect = targetBar.getBoundingClientRect();
              targetItems = Array.from(targetBar.children);
              if (targetItems.length === 0) { await wait(500); continue; }

              // Cursor enters from bottom-center
              vCursor.style.transition = 'all 0.5s ease-out';
              vCursor.style.opacity = '1';
              vCursor.style.left = `${rect.left + rect.width / 2}px`;
              vCursor.style.top = `${rect.bottom + 50}px`;
              vCursor.style.transform = 'scale(1)';
              await wait(500);
              if (!running) break;

              // Cursor moves up to the first target
              const firstItem = targetItems[0];
              const firstRect = firstItem.getBoundingClientRect();
              vCursor.style.transition = 'all 0.7s cubic-bezier(0.25, 1, 0.5, 1)';
              vCursor.style.left = `${firstRect.left + firstRect.width / 2}px`;
              vCursor.style.top = `${firstRect.top + firstRect.height / 2}px`;
              await wait(700);
              if (!running) break;

              // Sweep through each target item with individual highlight
              for (let i = 0; i < targetItems.length; i++) {
                if (!running) break;
                const item = targetItems[i];
                const itemRect = item.getBoundingClientRect();

                // Cursor moves to this item
                vCursor.style.transition = 'all 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
                vCursor.style.left = `${itemRect.left + itemRect.width / 2}px`;
                vCursor.style.top = `${itemRect.top + itemRect.height / 2}px`;

                // Highlight this item
                item.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                item.style.transform = 'scale(1.25)';
                item.style.boxShadow = '0 0 20px rgba(0,229,255,0.8), 0 0 40px rgba(0,229,255,0.3)';
                item.style.zIndex = '10';
                item.style.borderColor = 'rgba(0,229,255,0.9)';

                await wait(600);
                if (!running) break;

                // Return to normal
                item.style.transition = 'all 0.4s ease-out';
                item.style.transform = '';
                item.style.boxShadow = '';
                item.style.zIndex = '';
                item.style.borderColor = '';

                await wait(200);
              }
              if (!running) break;

              // Now pulse ALL items together once
              for (const item of targetItems) {
                item.style.transition = 'all 0.3s ease-in-out';
                item.style.transform = 'scale(1.15)';
                item.style.boxShadow = '0 0 15px rgba(0,229,255,0.6)';
              }
              await wait(500);
              if (!running) break;

              for (const item of targetItems) {
                item.style.transition = 'all 0.3s ease-out';
                item.style.transform = '';
                item.style.boxShadow = '';
              }
              // Cursor fades away
              vCursor.style.transition = 'all 0.5s ease-in';
              vCursor.style.opacity = '0';
              vCursor.style.top = `${rect.bottom + 40}px`;

              await wait(1200);
            }
          };
          animate();

          cleanup.push(() => {
            running = false;
            vCursor.style.opacity = '0';
            targetItems.forEach(item => {
              item.style.transition = 'none';
              item.style.transform = '';
              item.style.boxShadow = '';
              item.style.zIndex = '';
              item.style.borderColor = '';
            });
          });
        }
      }
    ];

    if (hasCages) {
      steps.push({
        title: t('tut_match_cage_title') || 'Kafesli Bloklar',
        text: t('tut_match_cage_desc') || 'Kafesli bloklar hareket ettirilemez. Yanlarında eşleştirme yaparak onları kırabilirsin.',
        targetSelector: '#game-board',
        animate: (cleanup) => {
          const board = document.querySelector('#game-board');
          if (!board) return;
          let running = true;
          const particleEls = [];
          
          const animate = async () => {
            while(running) {
              const boardRect = board.getBoundingClientRect();
              const cx = boardRect.left + boardRect.width/2;
              const cy = boardRect.top + boardRect.height/2;

              // Create cage block
              const cageEl = document.createElement('div');
              cageEl.className = 'match-block flex items-center justify-center block-3d-green';
              cageEl.style.width = '60px';
              cageEl.style.height = '60px';
              cageEl.style.left = `${cx - 30}px`;
              cageEl.style.top = `${cy - 30}px`;
              cageEl.style.zIndex = '50';
              cageEl.innerHTML = `
                <span style="font-size: 21px; position:absolute; z-index:2; opacity:0.85; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4)); pointer-events:none;">💚</span>
                <div class="cage-overlay" style="position:absolute;inset:-2px;z-index:10;pointer-events:none;filter:drop-shadow(0 4px 4px rgba(0,0,0,0.6))">
                  <svg viewBox="0 0 100 100" width="100%" height="100%">
                    <line x1="10" y1="10" x2="90" y2="90" stroke="#111827" stroke-width="8" stroke-linecap="round" />
                    <line x1="90" y1="10" x2="10" y2="90" stroke="#111827" stroke-width="8" stroke-linecap="round" />
                  </svg>
                </div>
              `;
              
              // Create adjacent matching blocks
              const b1 = document.createElement('div');
              b1.className = 'match-block flex items-center justify-center block-3d-green';
              b1.style.width = '60px';
              b1.style.height = '60px';
              b1.style.left = `${cx - 95}px`;
              b1.style.top = `${cy - 30}px`;
              b1.style.zIndex = '40';
              b1.style.opacity = '0';
              b1.innerHTML = `<span style="font-size: 21px; position:absolute; z-index:2; opacity:0.85; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4)); pointer-events:none;">💚</span>`;
              
              const b2 = document.createElement('div');
              b2.className = 'match-block flex items-center justify-center block-3d-green';
              b2.style.width = '60px';
              b2.style.height = '60px';
              b2.style.left = `${cx + 35}px`;
              b2.style.top = `${cy - 30}px`;
              b2.style.zIndex = '40';
              b2.style.opacity = '0';
              b2.innerHTML = `<span style="font-size: 21px; position:absolute; z-index:2; opacity:0.85; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4)); pointer-events:none;">💚</span>`;

              document.body.appendChild(cageEl);
              document.body.appendChild(b1);
              document.body.appendChild(b2);
              particleEls.push(cageEl, b1, b2);

              await wait(500);
              if (!running) break;

              // Show adjacent blocks
              b1.style.transition = 'all 0.4s';
              b2.style.transition = 'all 0.4s';
              b1.style.opacity = '1';
              b2.style.opacity = '1';

              await wait(800);
              if (!running) break;

              // Blast animation
              b1.style.transform = 'scale(1.2)';
              b2.style.transform = 'scale(1.2)';
              b1.style.filter = 'brightness(1.5)';
              b2.style.filter = 'brightness(1.5)';
              
              await wait(200);
              if (!running) break;
              
              b1.style.opacity = '0';
              b2.style.opacity = '0';
              b1.style.transform = 'scale(0)';
              b2.style.transform = 'scale(0)';
              
              // Cage breaks
              const cageOverlay = cageEl.querySelector('.cage-overlay');
              if (cageOverlay) {
                cageOverlay.style.transition = 'all 0.3s';
                cageOverlay.style.transform = 'scale(1.5)';
                cageOverlay.style.opacity = '0';
              }

              await wait(1000);
              if (!running) break;

              cageEl.remove();
              b1.remove();
              b2.remove();
            }
          };
          animate();

          cleanup.push(() => {
            running = false;
            for (const p of particleEls) {
              if (p.parentNode) p.remove();
            }
          });
        }
      });
    }

    if (hasWalls) {
      steps.push({
        title: t('tut_match_brick_title') || 'Taş Engeller',
        text: t('tut_match_brick_desc') || 'Taş bloklar yerinden oynamaz. Yanlarında blok patlatarak onları yok etmelisin.',
        targetSelector: '#game-board',
        animate: (cleanup) => {
          const board = document.querySelector('#game-board');
          if (!board) return;
          let running = true;
          const particleEls = [];
          
          const animate = async () => {
            while(running) {
              const boardRect = board.getBoundingClientRect();
              const cx = boardRect.left + boardRect.width/2;
              const cy = boardRect.top + boardRect.height/2;

              // Create brick block
              const brickEl = document.createElement('div');
              brickEl.className = 'match-block flex items-center justify-center';
              brickEl.style.width = '60px';
              brickEl.style.height = '60px';
              brickEl.style.left = `${cx - 30}px`;
              brickEl.style.top = `${cy - 30}px`;
              brickEl.style.zIndex = '50';
              brickEl.innerHTML = `
                <svg viewBox="0 0 100 100" width="100%" height="100%" style="position:absolute;inset:0;border-radius:0.75rem;overflow:hidden;box-shadow:inset 0 -6px 0 rgba(0,0,0,0.5), inset 0 4px 0 rgba(255,255,255,0.3), 0 4px 6px rgba(0,0,0,0.4)">
                  <defs>
                    <pattern id="brown-bricks" patternUnits="userSpaceOnUse" width="40" height="20">
                      <rect width="40" height="20" fill="#451a03" />
                      <rect x="1" y="1" width="38" height="8" rx="2" fill="#92400e" />
                      <rect x="-19" y="11" width="38" height="8" rx="2" fill="#92400e" />
                      <rect x="21" y="11" width="38" height="8" rx="2" fill="#92400e" />
                    </pattern>
                    <linearGradient id="wall-shadow" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3"/>
                      <stop offset="100%" stop-color="#000000" stop-opacity="0.5"/>
                    </linearGradient>
                  </defs>
                  <rect width="100" height="100" fill="url(#brown-bricks)" />
                  <rect width="100" height="100" fill="url(#wall-shadow)" pointer-events="none" />
                </svg>
              `;
              
              // Create adjacent matching blocks
              const b1 = document.createElement('div');
              b1.className = 'match-block flex items-center justify-center block-3d-red';
              b1.style.width = '60px';
              b1.style.height = '60px';
              b1.style.left = `${cx - 95}px`;
              b1.style.top = `${cy - 30}px`;
              b1.style.zIndex = '40';
              b1.style.opacity = '0';
              b1.innerHTML = `<span style="font-size: 21px; position:absolute; z-index:2; opacity:0.85; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4)); pointer-events:none;">🔴</span>`;
              
              const b2 = document.createElement('div');
              b2.className = 'match-block flex items-center justify-center block-3d-red';
              b2.style.width = '60px';
              b2.style.height = '60px';
              b2.style.left = `${cx + 35}px`;
              b2.style.top = `${cy - 30}px`;
              b2.style.zIndex = '40';
              b2.style.opacity = '0';
              b2.innerHTML = `<span style="font-size: 21px; position:absolute; z-index:2; opacity:0.85; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4)); pointer-events:none;">🔴</span>`;

              document.body.appendChild(brickEl);
              document.body.appendChild(b1);
              document.body.appendChild(b2);
              particleEls.push(brickEl, b1, b2);

              await wait(500);
              if (!running) break;

              // Show adjacent blocks
              b1.style.transition = 'all 0.4s';
              b2.style.transition = 'all 0.4s';
              b1.style.opacity = '1';
              b2.style.opacity = '1';

              await wait(800);
              if (!running) break;

              // Blast animation for red blocks
              b1.style.transform = 'scale(1.2)';
              b2.style.transform = 'scale(1.2)';
              b1.style.filter = 'brightness(1.5)';
              b2.style.filter = 'brightness(1.5)';
              
              await wait(200);
              if (!running) break;
              
              b1.style.opacity = '0';
              b2.style.opacity = '0';
              b1.style.transform = 'scale(0)';
              b2.style.transform = 'scale(0)';
              
              // Brick breaks
              brickEl.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
              brickEl.style.transform = 'scale(1.3)';
              brickEl.style.filter = 'brightness(2) blur(2px)';
              brickEl.style.opacity = '0';

              await wait(1000);
              if (!running) break;

              brickEl.remove();
              b1.remove();
              b2.remove();
            }
          };
          animate();

          cleanup.push(() => {
            running = false;
            for (const p of particleEls) {
              if (p.parentNode) p.remove();
            }
          });
        }
      });
    }

    steps.push(
      {
        title: t('tut_match_hammer_title') || 'Çekiç Güçlendirici',
        text: t('tut_match_hammer_desc') || 'İstediğin bir bloğu veya engeli anında kırmak için çekiç kullan. Kullanım maliyeti her defasında artar.',
        targetSelector: '#btn-hammer',
        animate: (cleanup) => {
          const btn = document.querySelector('#btn-hammer');
          if (!btn) return;
          let running = true;
          const animate = async () => {
             while(running) {
                btn.style.transition = 'all 0.5s ease-out';
                btn.style.transform = 'scale(1.15)';
                btn.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.8)';
                await wait(600);
                if (!running) break;
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = '';
                await wait(600);
             }
          };
          animate();
          cleanup.push(() => {
             running = false;
             btn.style.transition = 'none';
             btn.style.transform = '';
             btn.style.boxShadow = '';
          });
        }
      },
      {
        title: t('tut_match_shuffle_title') || 'Karıştır Güçlendirici',
        text: t('tut_match_shuffle_desc') || 'Tahtada hamle yapacak iyi bir yer bulamadığında tüm taşları rastgele karıştırmak için kullan.',
        targetSelector: '#btn-shuffle',
        animate: (cleanup) => {
          const btn = document.querySelector('#btn-shuffle');
          if (!btn) return;
          let running = true;
          const animate = async () => {
             while(running) {
                btn.style.transition = 'all 0.5s ease-out';
                btn.style.transform = 'scale(1.15)';
                btn.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.8)';
                await wait(600);
                if (!running) break;
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = '';
                await wait(600);
             }
          };
          animate();
          cleanup.push(() => {
             running = false;
             btn.style.transition = 'none';
             btn.style.transform = '';
             btn.style.boxShadow = '';
          });
        }
      },
      {
        title: t('tut_match_extramoves_title') || '+2 Ekstra Hamle',
        text: t('tut_match_extramoves_desc') || 'Hamlen tükenmek üzereyken devam edebilmek için ekstra hamle al.',
        targetSelector: '#btn-extra-moves',
        animate: (cleanup) => {
          const btn = document.querySelector('#btn-extra-moves');
          if (!btn) return;
          let running = true;
          const animate = async () => {
             while(running) {
                btn.style.transition = 'all 0.5s ease-out';
                btn.style.transform = 'scale(1.15)';
                btn.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.8)';
                await wait(600);
                if (!running) break;
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = '';
                await wait(600);
              }
            };
            animate();
            cleanup.push(() => {
              running = false;
              btn.style.transition = 'none';
              btn.style.transform = '';
              btn.style.boxShadow = '';
            });
          }
        }
      );
  } else if (mode === 'bubble') {
    steps = [
      {
        title: t('tut_bubble_aim_title') || 'Nişan Al ve Ateşle',
        text: t('tut_bubble_aim_desc') || 'Topu nişanlamak için sürükle, bırakınca fırlatılır.',
        targetSelector: 'canvas',
        animate: (cleanup) => {
          const canvas = document.querySelector('canvas');
          if (!canvas || !window.bubbleEngine || !window.bubbleApi) return;
          let running = true;
          const engine = window.bubbleEngine;
          const api = window.bubbleApi;

          const animate = async () => {
            while(running) {
              // Find a target bubble (lowest)
              let tr = -1, tc = -1, targetColor = null;
              for (let r = engine.rows - 1; r >= 0; r--) {
                for (let c = 0; c < engine.cols; c++) {
                  if (engine.grid[r] && engine.grid[r][c]) {
                    tr = r; tc = c; targetColor = engine.grid[r][c];
                    break;
                  }
                }
                if (tr !== -1) break;
              }
              if (tr === -1) { await wait(1000); continue; }

              const tRect = api.getCellRect(tr, tc);
              const sRect = api.getShooterPos();
              const shooterColor = engine.currentBubble || 1;

              // Hide real bubbles
              engine.grid[tr][tc] = null;
              engine.currentBubble = null;

              const createBubble = (rect, colorCode) => {
                const b = document.createElement('div');
                b.className = 'tut-bubble-el fixed rounded-full shadow-[0_4px_8px_rgba(0,0,0,0.3)] pointer-events-none transition-all duration-300 ease-in-out';
                b.style.width = (rect.radius * 2) + 'px';
                b.style.height = (rect.radius * 2) + 'px';
                b.style.left = (rect.x - rect.radius) + 'px';
                b.style.top = (rect.y - rect.radius) + 'px';
                b.style.background = `radial-gradient(circle at 30% 30%, #fff 0%, ${typeof colorCode === 'number' ? '#00C3FF' : colorCode} 40%, rgba(0,0,0,0.6) 100%)`;
                b.style.zIndex = '400';
                document.body.appendChild(b);
                return b;
              };

              const targetB = createBubble(tRect, targetColor);
              const shooterB = createBubble(sRect, shooterColor);
              shooterB.style.transition = 'all 0.1s linear';

              const vCursor = document.createElement('div');
              vCursor.className = 'tut-bubble-el fixed w-12 h-12 bg-white/20 rounded-full border border-white flex items-center justify-center z-[500] pointer-events-none transition-all duration-[800ms] ease-in-out opacity-0';
              vCursor.innerHTML = '<span class="material-symbols-outlined text-white text-2xl drop-shadow-md">touch_app</span>';
              vCursor.style.left = (sRect.x - 24) + 'px';
              vCursor.style.top = (sRect.y + 40) + 'px';
              document.body.appendChild(vCursor);

              const traj = document.createElement('div');
              traj.className = 'tut-bubble-el fixed z-[390] pointer-events-none flex flex-col items-center justify-between opacity-0 transition-opacity duration-300';
              traj.style.width = '4px';
              traj.style.height = Math.max(20, sRect.y - tRect.y - 40) + 'px';
              traj.style.left = (sRect.x - 2) + 'px';
              traj.style.top = (tRect.y + 20) + 'px';
              for(let i=0; i<6; i++) {
                const dot = document.createElement('div');
                dot.className = 'w-1.5 h-1.5 bg-white/60 rounded-full shadow-[0_0_4px_white]';
                traj.appendChild(dot);
              }
              document.body.appendChild(traj);

              await wait(400);
              if (!running) {
                engine.grid[tr][tc] = targetColor;
                engine.currentBubble = shooterColor;
                break;
              }

              // Aim
              vCursor.style.opacity = '1';
              vCursor.style.top = (sRect.y) + 'px';
              await wait(800);
              if (!running) {
                engine.grid[tr][tc] = targetColor;
                engine.currentBubble = shooterColor;
                break;
              }

              vCursor.style.transform = 'scale(0.8)';
              vCursor.style.top = (sRect.y + 30) + 'px';
              shooterB.style.transform = 'translateY(10px)';
              traj.style.opacity = '1';
              await wait(800);
              if (!running) {
                engine.grid[tr][tc] = targetColor;
                engine.currentBubble = shooterColor;
                break;
              }

              // Shoot
              vCursor.style.transform = 'scale(1)';
              vCursor.style.opacity = '0';
              traj.style.opacity = '0';
              
              shooterB.style.transition = 'all 0.3s cubic-bezier(0.3, 0, 0.8, 1)';
              shooterB.style.top = (tRect.y + tRect.radius) + 'px';
              shooterB.style.transform = 'translateY(0)';
              await wait(300);

              if (running) {
                targetB.style.filter = 'brightness(1.5)';
                shooterB.style.filter = 'brightness(1.5)';
                targetB.style.transform = 'scale(1.2)';
                shooterB.style.transform = 'scale(1.2)';
                await wait(100);
                targetB.style.opacity = '0';
                shooterB.style.opacity = '0';
                targetB.style.transform = 'scale(0)';
                shooterB.style.transform = 'scale(0)';
                await wait(800);
              }

              targetB.remove(); shooterB.remove(); vCursor.remove(); traj.remove();
              
              // Restore real bubbles
              if (engine.grid[tr]) engine.grid[tr][tc] = targetColor;
              engine.currentBubble = shooterColor;
            }
          };
          animate();
          cleanup.push(() => {
            running = false;
            document.querySelectorAll('.tut-bubble-el').forEach(el => el.remove());
          });
        }
      },
      {
        title: t('tut_bubble_match_title') || '3 veya Daha Fazla Eşle',
        text: t('tut_bubble_match_desc') || 'Aynı renkten 3 veya daha fazla baloncuğu birleştirerek patlat.',
        targetSelector: 'canvas',
        animate: (cleanup) => {
          const canvas = document.querySelector('canvas');
          if (!canvas || !window.bubbleEngine || !window.bubbleApi) return;
          let running = true;
          const engine = window.bubbleEngine;
          const api = window.bubbleApi;

          const animate = async () => {
            while(running) {
              // Pick 2 adjacent bubbles
              let tr1 = -1, tc1 = -1, tr2 = -1, tc2 = -1;
              let origColor1 = null, origColor2 = null;
              for (let r = engine.rows - 1; r >= 0; r--) {
                for (let c = 0; c < engine.cols - 1; c++) {
                  if (engine.grid[r] && engine.grid[r][c] && engine.grid[r][c+1]) {
                    tr1 = r; tc1 = c; origColor1 = engine.grid[r][c];
                    tr2 = r; tc2 = c+1; origColor2 = engine.grid[r][c+1];
                    break;
                  }
                }
                if (tr1 !== -1) break;
              }
              if (tr1 === -1) { await wait(1000); continue; }

              const rect1 = api.getCellRect(tr1, tc1);
              const rect2 = api.getCellRect(tr2, tc2);
              const sRect = api.getShooterPos();
              const shooterColor = engine.currentBubble || '#FF3B6B';

              // Hide real ones
              engine.grid[tr1][tc1] = null;
              engine.grid[tr2][tc2] = null;
              engine.currentBubble = null;

              const createBubble = (rect, colorCode) => {
                const b = document.createElement('div');
                b.className = 'tut-bubble-el fixed rounded-full shadow-[0_4px_8px_rgba(0,0,0,0.3)] pointer-events-none transition-all duration-300 ease-in-out';
                b.style.width = (rect.radius * 2) + 'px';
                b.style.height = (rect.radius * 2) + 'px';
                b.style.left = (rect.x - rect.radius) + 'px';
                b.style.top = (rect.y - rect.radius) + 'px';
                b.style.background = `radial-gradient(circle at 30% 30%, #fff 0%, ${typeof colorCode === 'number' ? '#FF3B6B' : colorCode} 40%, rgba(0,0,0,0.6) 100%)`;
                b.style.zIndex = '400';
                document.body.appendChild(b);
                return b;
              };

              const b1 = createBubble(rect1, shooterColor);
              const b2 = createBubble(rect2, shooterColor);
              const shooterB = createBubble(sRect, shooterColor);

              await wait(600);
              if (!running) {
                engine.grid[tr1][tc1] = origColor1; engine.grid[tr2][tc2] = origColor2;
                engine.currentBubble = shooterColor;
                break;
              }

              shooterB.style.top = (rect1.y + rect1.radius) + 'px';
              shooterB.style.left = ((rect1.x + rect2.x)/2 - rect1.radius) + 'px';
              await wait(300);

              if (running) {
                [b1, b2, shooterB].forEach(b => {
                  b.style.filter = 'brightness(2) contrast(1.5)';
                  b.style.transform = 'scale(1.3)';
                });
                await wait(150);
                [b1, b2, shooterB].forEach(b => {
                  b.style.opacity = '0';
                  b.style.transform = 'scale(0)';
                });
                await wait(1000);
              }

              b1.remove(); b2.remove(); shooterB.remove();
              if (engine.grid[tr1]) engine.grid[tr1][tc1] = origColor1;
              if (engine.grid[tr2]) engine.grid[tr2][tc2] = origColor2;
              engine.currentBubble = shooterColor;
            }
          };
          animate();
          cleanup.push(() => {
            running = false;
            document.querySelectorAll('.tut-bubble-el').forEach(el => el.remove());
          });
        }
      },
      {
        title: t('tut_bubble_drop_title') || 'Asılı Baloncukları Düşür',
        text: t('tut_bubble_drop_desc') || 'Tavana bağlı kalmayan baloncuklar düşer — bonus puan kazanırsın!',
        targetSelector: 'canvas',
        animate: (cleanup) => {
          const canvas = document.querySelector('canvas');
          if (!canvas || !window.bubbleEngine || !window.bubbleApi) return;
          let running = true;
          const engine = window.bubbleEngine;
          const api = window.bubbleApi;

          const animate = async () => {
            while(running) {
              let tr = -1, tc = -1, targetColor = null;
              for (let r = 0; r < engine.rows - 1; r++) {
                for (let c = 0; c < engine.cols; c++) {
                  if (engine.grid[r] && engine.grid[r][c] && engine.grid[r+1] && engine.grid[r+1][c]) {
                    tr = r; tc = c; targetColor = engine.grid[r][c];
                    break;
                  }
                }
                if (tr !== -1) break;
              }
              if (tr === -1) { await wait(1000); continue; }

              const topRect = api.getCellRect(tr, tc);
              const botRect = api.getCellRect(tr+1, tc);
              const botColor = engine.grid[tr+1][tc];
              const sRect = api.getShooterPos();

              engine.grid[tr][tc] = null;
              engine.grid[tr+1][tc] = null;
              const origShooterColor = engine.currentBubble;
              engine.currentBubble = null;

              const createBubble = (rect, colorCode) => {
                const b = document.createElement('div');
                b.className = 'tut-bubble-el fixed rounded-full shadow-[0_4px_8px_rgba(0,0,0,0.3)] pointer-events-none transition-all duration-300 ease-in-out';
                b.style.width = (rect.radius * 2) + 'px';
                b.style.height = (rect.radius * 2) + 'px';
                b.style.left = (rect.x - rect.radius) + 'px';
                b.style.top = (rect.y - rect.radius) + 'px';
                b.style.background = `radial-gradient(circle at 30% 30%, #fff 0%, ${typeof colorCode === 'number' ? '#00E676' : colorCode} 40%, rgba(0,0,0,0.6) 100%)`;
                b.style.zIndex = '400';
                document.body.appendChild(b);
                return b;
              };

              const topB = createBubble(topRect, targetColor);
              const botB = createBubble(botRect, botColor);
              const shooterB = createBubble(sRect, targetColor);

              await wait(600);
              if (!running) {
                engine.grid[tr][tc] = targetColor; engine.grid[tr+1][tc] = botColor; engine.currentBubble = origShooterColor;
                break;
              }

              shooterB.style.top = (topRect.y) + 'px';
              shooterB.style.left = (topRect.x + topRect.radius) + 'px';
              await wait(300);

              if (running) {
                topB.style.filter = 'brightness(2)'; shooterB.style.filter = 'brightness(2)';
                topB.style.transform = 'scale(1.2)'; shooterB.style.transform = 'scale(1.2)';
                await wait(100);
                topB.style.opacity = '0'; shooterB.style.opacity = '0';
                await wait(200);
                
                if (running) {
                  botB.style.transition = 'all 0.6s cubic-bezier(0.5, 0, 1, 1)';
                  botB.style.top = (botRect.y + botRect.radius * 8) + 'px';
                  botB.style.transform = 'scale(0.8)';
                  botB.style.opacity = '0';
                  await wait(1200);
                }
              }

              topB.remove(); botB.remove(); shooterB.remove();
              if (engine.grid[tr]) engine.grid[tr][tc] = targetColor;
              if (engine.grid[tr+1]) engine.grid[tr+1][tc] = botColor;
              engine.currentBubble = origShooterColor;
            }
          };
          animate();
          cleanup.push(() => {
            running = false;
            document.querySelectorAll('.tut-bubble-el').forEach(el => el.remove());
          });
        }
      },
      {
        title: t('tut_bubble_hammer_title') || 'Çekiç Kullan',
        text: t('tut_bubble_hammer_desc') || 'Zorlandığında Çekiç kullan! Çekice dokun ve ardından patlatmak istediğin balonu seç.',
        targetSelector: '#btn-hammer',
        animate: (cleanup) => {
          const hammerBtn = document.querySelector('#btn-hammer');
          const canvas = document.querySelector('canvas');
          if (!hammerBtn || !canvas || !window.bubbleEngine || !window.bubbleApi) return;
          let running = true;
          const engine = window.bubbleEngine;
          const api = window.bubbleApi;

          const animate = async () => {
            while(running) {
              let tr = -1, tc = -1, targetColor = null;
              for (let r = 0; r < engine.rows; r++) {
                for (let c = 0; c < engine.cols; c++) {
                  if (engine.grid[r] && engine.grid[r][c]) {
                    tr = r; tc = c; targetColor = engine.grid[r][c];
                    break;
                  }
                }
                if (tr !== -1) break;
              }
              if (tr === -1) { await wait(1000); continue; }

              const tRect = api.getCellRect(tr, tc);
              const hRect = hammerBtn.getBoundingClientRect();
              engine.grid[tr][tc] = null;

              const targetB = document.createElement('div');
              targetB.className = 'tut-bubble-el fixed rounded-full shadow-[0_4px_8px_rgba(0,0,0,0.3)] pointer-events-none transition-all duration-300 ease-in-out';
              targetB.style.width = (tRect.radius * 2) + 'px';
              targetB.style.height = (tRect.radius * 2) + 'px';
              targetB.style.left = (tRect.x - tRect.radius) + 'px';
              targetB.style.top = (tRect.y - tRect.radius) + 'px';
              targetB.style.background = `radial-gradient(circle at 30% 30%, #fff 0%, ${typeof targetColor === 'number' ? '#A45BFF' : targetColor} 40%, rgba(0,0,0,0.6) 100%)`;
              targetB.style.zIndex = '400';
              document.body.appendChild(targetB);

              const vCursor = document.createElement('div');
              vCursor.className = 'tut-bubble-el fixed w-12 h-12 bg-white/20 rounded-full border border-white flex items-center justify-center z-[500] pointer-events-none transition-all duration-[600ms] ease-in-out opacity-0';
              vCursor.innerHTML = '<span class="material-symbols-outlined text-white text-2xl drop-shadow-md">touch_app</span>';
              vCursor.style.left = (hRect.left + hRect.width/2 - 24) + 'px';
              vCursor.style.top = (hRect.top + 60) + 'px';
              document.body.appendChild(vCursor);

              await wait(400);
              if (!running) { engine.grid[tr][tc] = targetColor; break; }
              
              vCursor.style.opacity = '1';
              vCursor.style.left = (hRect.left + hRect.width/2 - 24) + 'px';
              vCursor.style.top = (hRect.top + hRect.height/2 - 24) + 'px';
              await wait(600);
              if (!running) { engine.grid[tr][tc] = targetColor; break; }
              
              vCursor.style.transform = 'scale(0.8)';
              hammerBtn.style.transition = 'all 0.5s ease-out';
              hammerBtn.style.transform = 'scale(1.15)';
              hammerBtn.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.8)';
              await wait(200);
              vCursor.style.transform = 'scale(1)';
              hammerBtn.style.transform = 'scale(1)';
              await wait(400);
              if (!running) { engine.grid[tr][tc] = targetColor; break; }
              
              vCursor.style.left = (tRect.x - 24) + 'px';
              vCursor.style.top = (tRect.y - 24) + 'px';
              await wait(600);
              if (!running) { engine.grid[tr][tc] = targetColor; break; }
              
              vCursor.style.transform = 'scale(0.8)';
              await wait(200);
              vCursor.style.transform = 'scale(1)';
              
              hammerBtn.style.boxShadow = '';
              targetB.style.filter = 'brightness(2) sepia(1) hue-rotate(180deg)';
              targetB.style.transform = 'scale(1.4)';
              
              const spark = document.createElement('div');
              spark.className = 'tut-bubble-el fixed z-[450] animate-ping opacity-80 pointer-events-none';
              spark.style.width = (tRect.radius * 3) + 'px';
              spark.style.height = (tRect.radius * 3) + 'px';
              spark.style.left = (tRect.x - tRect.radius * 1.5) + 'px';
              spark.style.top = (tRect.y - tRect.radius * 1.5) + 'px';
              spark.style.background = 'radial-gradient(circle, #fff 0%, transparent 70%)';
              document.body.appendChild(spark);
              
              await wait(150);
              targetB.style.opacity = '0';
              
              await wait(800);
              targetB.remove(); vCursor.remove(); spark.remove();
              if (engine.grid[tr]) engine.grid[tr][tc] = targetColor;
            }
          };
          animate();
          cleanup.push(() => {
            running = false;
            hammerBtn.style.transition = 'none';
            hammerBtn.style.transform = 'scale(1)';
            hammerBtn.style.boxShadow = '';
            document.querySelectorAll('.tut-bubble-el').forEach(el => el.remove());
          });
        }
      }
    ];
  } else if (mode === 'arrow') {
    // Ok Bulmacası için API destekli tutorial
    steps = [
      {
        title: t('tut_arrow_tap_title') || 'Oka Dokun',
        text: t('tut_arrow_tap_desc') || 'Bir ok, baktığı yönde tahtanın kenarına kadar boşsa, dokununca uçar gider.',
        targetSelector: 'canvas',
        animate: (cleanup) => {
          if (window.arrowTutorialApi) {
            const vCursor = createVirtualCursor();
            const stop = window.arrowTutorialApi.startAnim('free', vCursor);
            cleanup.push(stop, () => vCursor.remove());
          }
        }
      },
      {
        title: t('tut_arrow_block_title') || 'Yolu Kapalıysa Dikkat',
        text: t('tut_arrow_block_desc') || 'Önü başka oklarla kapalı bir oka dokunursan bir can kaybedersin. Önce yolu açık okları temizle.',
        targetSelector: 'canvas',
        animate: (cleanup) => {
          if (window.arrowTutorialApi) {
            const vCursor = createVirtualCursor();
            const stop = window.arrowTutorialApi.startAnim('blocked', vCursor);
            cleanup.push(stop, () => vCursor.remove());
          }
        }
      },
      {
        title: t('tut_arrow_reveal_title') || 'Gizli Resmi Ortaya Çıkar',
        text: t('tut_arrow_reveal_desc') || 'Okları temizledikçe altından renkli bir resim belirir. Hepsini temizleyince seviyeyi kazanırsın!',
        targetSelector: 'canvas',
        animate: (cleanup) => {
          if (window.arrowTutorialApi) {
            const vCursor = createVirtualCursor();
            const stop = window.arrowTutorialApi.startAnim('reveal', vCursor);
            cleanup.push(stop, () => vCursor.remove());
          }
        }
      },
      {
        title: t('tut_arrow_hint_title') || 'Takıldın mı? İpucu',
        text: t('tut_arrow_hint_desc') || 'Sağ üstteki ampul düğmesine dokun; oynanabilir bir ok parlayarak sana yol gösterir.',
        targetSelector: '#arrow-top-hint',
        animate: (cleanup) => {
          if (window.arrowTutorialApi) {
            const hintBtn = document.querySelector('#arrow-top-hint');
            const vCursor = createVirtualCursor();
            const stop = window.arrowTutorialApi.startAnim('hint', vCursor, hintBtn);
            cleanup.push(stop, () => vCursor.remove());
          }
        }
      },
      {
        title: t('tut_arrow_zoom_title') || 'Yakınlaştırma ve Kaydırma',
        text: t('tut_arrow_zoom_desc') || 'Büyük bulmacalarda iki parmağını kullanarak ekranı yakınlaştırabilir ve kaydırarak diğer okları görebilirsin.',
        targetSelector: 'canvas',
        animate: (cleanup) => {
          if (window.arrowTutorialApi) {
            const vCursor1 = createVirtualCursor();
            const vCursor2 = createVirtualCursor();
            const stop = window.arrowTutorialApi.startAnim('zoom', vCursor1, vCursor2);
            cleanup.push(stop, () => { vCursor1.remove(); vCursor2.remove(); });
          }
        }
      }
    ];
  }

  let currentStep = 0;
  const spotlight = document.createElement('div');
  spotlight.className = 'absolute rounded-[2rem] border-[3px] border-accent-cyan/90 bg-transparent transition-all duration-500 pointer-events-none z-40';
  spotlight.style.boxShadow = '0 0 30px rgba(0,229,255,0.4) inset, 0 0 30px rgba(0,229,255,0.4)';
  overlay.appendChild(spotlight);

  const card = document.createElement('div');
  card.className = 'w-full max-w-[300px] mx-auto mt-4 p-4 rounded-2xl glass-card text-center flex flex-col items-center shadow-2xl relative z-50 transform -translate-y-8 transition-all duration-500 border border-white/20 dark:border-white/10 bg-white/10 dark:bg-[#0f172a]/90 backdrop-blur-xl';
  overlay.appendChild(card);

  const cleanCurrentAnimation = () => {
    animationCleanups.forEach(fn => fn());
    animationCleanups = [];
  };

  const updateStep = () => {
    cleanCurrentAnimation();
    const step = steps[currentStep];

    const topSelectors = ['#match-target-bar', '#btn-hammer', '#btn-shuffle', '#btn-extra-moves'];
    
    card.classList.remove('mt-4', 'my-auto', 'mt-[60vh]', 'mb-auto');

    if (mode === 'x2') {
      card.classList.add('mt-[60vh]', 'mb-auto');
    } else if (mode === 'bubble') {
      card.classList.add('mt-[50vh]', 'mb-auto');
    } else if ((mode === 'match' && ([2, 3, 4].includes(currentStep) || topSelectors.includes(step.targetSelector))) || (mode === 'arrow' && currentStep === 3)) {
      card.classList.add('my-auto');
    } else {
      card.classList.add('mt-4');
    }
    
    card.innerHTML = `
      <div class="flex items-center space-x-2 mb-2 text-secondary dark:text-accent-cyan">
        <span class="material-symbols-outlined text-2xl animate-bounce">school</span>
        <h3 class="text-lg font-black tracking-tight flex-1">${step.title}</h3>
        <button id="tutorial-skip" class="shrink-0 text-[11px] font-bold text-gray-400 hover:text-gray-200 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-full active:scale-95 transition-all">
          ${t('tut_skip') || 'Atla'}
        </button>
      </div>
      <p class="text-sm text-gray-700 dark:text-gray-200 mb-4 font-medium leading-relaxed">${step.text}</p>
      <div class="flex items-center justify-between w-full mt-1 pt-3 border-t border-black/10 dark:border-white/10">
        <span class="text-[10px] font-black text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-full">${t('tut_step') || 'ADIM'} ${currentStep + 1} / ${steps.length}</span>
        <button id="tutorial-next" class="px-4 py-2 bg-gradient-to-r from-[#0058bc] to-[#00e5ff] text-white font-black text-xs rounded-xl shadow-lg hover:shadow-cyan-500/30 active:scale-95 transition-all flex items-center gap-1">
          ${currentStep === steps.length - 1 ? (t('tut_got_it') || 'Oyuna Başla') : (t('tut_next') || 'İleri')}
          <span class="material-symbols-outlined text-[14px]">${currentStep === steps.length - 1 ? 'play_arrow' : 'arrow_forward'}</span>
        </button>
      </div>
    `;

    setTimeout(() => {
      const target = document.querySelector(step.targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        spotlight.style.width = `${rect.width + 32}px`;
        spotlight.style.height = `${rect.height + 32}px`;
        spotlight.style.left = `${rect.left - 16}px`;
        spotlight.style.top = `${rect.top - 16}px`;
        spotlight.style.opacity = '1';
      } else {
        spotlight.style.opacity = '0';
      }

      if (step.animate) {
        // Bir adımın animasyonu hata atarsa tüm tutorial akışı kırılmasın / isPlaying takılmasın.
        try { step.animate(animationCleanups); } catch (e) { console.warn('Tutorial animate error:', e); }
      }
    }, 100);

    // Atla: tutorial'ı kapat ve bir daha otomatik açılmaması için tamamlandı işaretle.
    const skipBtn = card.querySelector('#tutorial-skip');
    if (skipBtn) skipBtn.addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      Storage.set(`tutorial_completed_${mode}`, true);
      abortTutorial();
    });

    card.querySelector('#tutorial-next').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      if (currentStep < steps.length - 1) {
        currentStep++;
        updateStep();
      } else {
        window.removeEventListener('hashchange', abortTutorial);
        cleanCurrentAnimation();
        // Tutorial completed, save to storage so it doesn't show automatically again
        Storage.set(`tutorial_completed_${mode}`, true);
        overlay.classList.remove('opacity-100');
        card.classList.add('-translate-y-8');
        card.style.opacity = '0';
        spotlight.style.opacity = '0';
        isPlaying = false;
        if (vCursor.parentNode) vCursor.remove();
        setTimeout(() => overlay.remove(), 500);
      }
    });
  };

  const abortTutorial = () => {
    cleanCurrentAnimation();
    overlay.classList.remove('opacity-100');
    card.classList.add('-translate-y-8');
    card.style.opacity = '0';
    spotlight.style.opacity = '0';
    isPlaying = false;
    if (vCursor.parentNode) vCursor.remove();
    if (overlay.parentNode) overlay.remove();
    window.removeEventListener('hashchange', abortTutorial);
  };
  window.addEventListener('hashchange', abortTutorial);

  document.body.appendChild(overlay);
  
  setTimeout(() => {
    overlay.classList.add('opacity-100');
    card.classList.remove('-translate-y-8');
    updateStep();
  }, 10);
}
