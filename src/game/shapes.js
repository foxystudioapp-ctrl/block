export const SHAPES = [
  // 1. Single (1x1)
  {
    matrix: [[1]],
    color: 'cyan'
  },
  
  // 2. 2-Blocks
  {
    matrix: [[1, 1]],
    color: 'blue'
  },
  {
    matrix: [[1], [1]],
    color: 'blue'
  },

  // 3. 3-Blocks
  {
    matrix: [[1, 1, 1]],
    color: 'green'
  },
  {
    matrix: [[1], [1], [1]],
    color: 'green'
  },
  {
    matrix: [
      [1, 1],
      [1, 0]
    ],
    color: 'orange'
  },
  {
    matrix: [
      [1, 1],
      [0, 1]
    ],
    color: 'orange'
  },

  // 4. 4-Blocks
  {
    matrix: [[1, 1, 1, 1]],
    color: 'red'
  },
  {
    matrix: [[1], [1], [1], [1]],
    color: 'red'
  },
  {
    matrix: [
      [1, 1],
      [1, 1]
    ],
    color: 'purple'
  },
  {
    matrix: [
      [1, 1, 1],
      [0, 1, 0]
    ],
    color: 'purple'
  },
  {
    matrix: [
      [1, 1, 1],
      [1, 0, 0]
    ],
    color: 'blue'
  },
  {
    matrix: [
      [1, 1, 1],
      [0, 0, 1]
    ],
    color: 'blue'
  },
  {
    matrix: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    color: 'green'
  },

  // 5. 5-Blocks (Big)
  {
    matrix: [
      [1, 1, 1],
      [1, 0, 0],
      [1, 0, 0]
    ],
    color: 'red'
  },
  {
    matrix: [
      [1, 1, 1],
      [0, 1, 0],
      [0, 1, 0]
    ],
    color: 'cyan'
  },
  {
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0]
    ],
    color: 'purple'
  }
];

export function getRandomShape() {
  const idx = Math.floor(Math.random() * SHAPES.length);
  // Return deep clone of shape
  const shape = SHAPES[idx];
  return {
    matrix: shape.matrix.map(row => [...row]),
    color: shape.color
  };
}

export const hexShapes = [
  // 1. Single hex
  { cells: [{ q: 0, r: 0 }], color: 'cyan' },
  // 2. Lines of 2
  { cells: [{ q: 0, r: 0 }, { q: 1, r: 0 }], color: 'blue' },
  { cells: [{ q: 0, r: 0 }, { q: 0, r: 1 }], color: 'blue' },
  { cells: [{ q: 0, r: 0 }, { q: 1, r: -1 }], color: 'blue' },
  // 3. Lines of 3
  { cells: [{ q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }], color: 'green' },
  { cells: [{ q: 0, r: -1 }, { q: 0, r: 0 }, { q: 0, r: 1 }], color: 'green' },
  { cells: [{ q: -1, r: 1 }, { q: 0, r: 0 }, { q: 1, r: -1 }], color: 'green' },
  // 4. Lines of 4
  { cells: [{ q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }], color: 'orange' },
  { cells: [{ q: 0, r: -1 }, { q: 0, r: 0 }, { q: 0, r: 1 }, { q: 0, r: 2 }], color: 'orange' },
  { cells: [{ q: -1, r: 1 }, { q: 0, r: 0 }, { q: 1, r: -1 }, { q: 2, r: -2 }], color: 'orange' },
  // 5. Triangles
  { cells: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }], color: 'red' },
  { cells: [{ q: 0, r: 0 }, { q: -1, r: 0 }, { q: 0, r: -1 }], color: 'red' },
  // 6. Rhombus
  { cells: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }, { q: 1, r: 1 }], color: 'purple' },
  // 7. Y shape
  { cells: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: -1 }], color: 'cyan' }
];
