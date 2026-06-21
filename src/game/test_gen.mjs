import { generateEndlessLevel } from './arrowGenerator.js';
let failCount = 0;
for(let i=0; i<10; i++){
  const data = generateEndlessLevel(100);
  if(data.shape==='Hata') failCount++;
}
console.log('Failed ' + failCount + '/10 times');
