const fs = require('fs');
const file = 'src/screens/multiplayerDuelMode.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `      });
    }
  };
    }
  };`;

const replaceStr = `      });
    }
  };`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync(file, content);
  console.log('Fixed double brackets');
} else {
  console.log('Target string not found');
}
