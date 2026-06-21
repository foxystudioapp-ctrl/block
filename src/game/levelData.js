export const GridShapes = {
  square: null, // default
  plus: [
    "00111100",
    "00111100",
    "11111111",
    "11111111",
    "11111111",
    "11111111",
    "00111100",
    "00111100"
  ],
  diamond: [
    "00011000",
    "00111100",
    "01111110",
    "11111111",
    "11111111",
    "01111110",
    "00111100",
    "00011000"
  ],
  triangle: [
    "00011000",
    "00011000",
    "00111100",
    "00111100",
    "01111110",
    "01111110",
    "11111111",
    "11111111"
  ],
  hollow: [
    "11111111",
    "11111111",
    "11000011",
    "11000011",
    "11000011",
    "11000011",
    "11111111",
    "11111111"
  ],
  corners: [
    "00111100",
    "01111110",
    "11111111",
    "11111111",
    "11111111",
    "11111111",
    "01111110",
    "00111100"
  ],
  cross: [
    "11000011",
    "11100111",
    "01111110",
    "00111100",
    "00111100",
    "01111110",
    "11100111",
    "11000011"
  ]
};

export function getAdventureLevels() {
  const levels = [];
  const totalLevels = 100;
  const shapesKeys = Object.keys(GridShapes);
  
  for (let i = 1; i <= totalLevels; i++) {
    let shapeName = 'square';
    
    // Every 5th level has a special shape
    if (i % 5 === 0) {
      shapeName = shapesKeys[(i / 5) % shapesKeys.length];
      if (shapeName === 'square') shapeName = 'plus'; // Ensure it's not square if it's a milestone
    }
    
    // Specific hardcoded overrides
    if (i === 10) shapeName = 'diamond';
    if (i === 25) shapeName = 'triangle';
    if (i === 50) shapeName = 'hollow';
    if (i === 100) shapeName = 'cross';
    
    levels.push({
      id: i,
      targetScore: 500 + (i * 250), // Scales difficulty
      gridShape: shapeName
    });
  }
  
  return levels;
}
