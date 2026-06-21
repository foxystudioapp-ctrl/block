export function getLocalAvatar(seed) {
  if (!seed) return './avatars/1.svg';
  
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const num = Math.abs(hash) % 50 + 1;
  return `./avatars/${num}.svg`;
}

export const avatarOptions = [
  // Animals (Hayvan)
  { id: 'akita', cost: 0, category: 'animal' },
  { id: 'cat', cost: 0, category: 'animal' },
  { id: 'lion', cost: 0, category: 'animal' },
  { id: 'fox', cost: 0, category: 'animal' },
  { id: 'panda', cost: 0, category: 'animal' },
  { id: 'owl', cost: 0, category: 'animal' },
  { id: 'penguin', cost: 0, category: 'animal' },
  { id: 'tiger', cost: 10000, premium: true, category: 'animal' },
  { id: 'bear', cost: 10000, premium: true, category: 'animal' },
  { id: 'koala', cost: 10000, premium: true, category: 'animal' },
  { id: 'wolf', cost: 10000, premium: true, category: 'animal' },
  { id: 'monkey', cost: 10000, premium: true, category: 'animal' },
  { id: 'elephant', cost: 10000, premium: true, category: 'animal' },
  { id: 'rhino', cost: 10000, premium: true, category: 'animal' },
  { id: 'zebra', cost: 10000, premium: true, category: 'animal' },
  { id: 'giraffe', cost: 10000, premium: true, category: 'animal' },
  { id: 'deer', cost: 10000, premium: true, category: 'animal' },
  
  // Erkek (Male) - Local avatars
  { id: 'Jack', cost: 0, category: 'male' }, { id: 'Oliver', cost: 0, category: 'male' }, { id: 'Leo', cost: 0, category: 'male' }, 
  { id: 'Sam', cost: 0, category: 'male' }, { id: 'Nolan', cost: 0, category: 'male' }, { id: 'Max', cost: 0, category: 'male' }, 
  { id: 'Lucas', cost: 0, category: 'male' }, { id: 'Ethan', cost: 0, category: 'male' }, { id: 'Mason', cost: 0, category: 'male' }, 
  { id: 'Logan', cost: 0, category: 'male' }, { id: 'Grandpa', cost: 0, category: 'male' }, { id: 'Elder', cost: 0, category: 'male' },
  { id: 'Felix', cost: 0, category: 'male' }, { id: 'Arthur', cost: 0, category: 'male' }, { id: 'Theo', cost: 0, category: 'male' },
  { id: 'Henry', cost: 1000, category: 'male' }, { id: 'Oscar', cost: 1000, category: 'male' }, { id: 'William', cost: 1000, category: 'male' },
  { id: 'James', cost: 1000, category: 'male' }, { id: 'George', cost: 1000, category: 'male' }, { id: 'Charles', cost: 1000, category: 'male' },
  { id: 'Thomas', cost: 1000, category: 'male' }, { id: 'Daniel', cost: 2500, category: 'male' }, { id: 'Matthew', cost: 2500, category: 'male' },
  { id: 'David', cost: 2500, category: 'male' }, { id: 'Joseph', cost: 2500, category: 'male' }, { id: 'Samuel', cost: 2500, category: 'male' },
  { id: 'John', cost: 2500, category: 'male' }, { id: 'Luke', cost: 2500, category: 'male' }, { id: 'Isaac', cost: 5000, category: 'male' },
  // 20 new male avatars
  { id: 'Aaron', cost: 5000, category: 'male' }, { id: 'Adam', cost: 5000, category: 'male' }, { id: 'Alex', cost: 5000, category: 'male' },
  { id: 'Ben', cost: 5000, category: 'male' }, { id: 'Brian', cost: 5000, category: 'male' }, { id: 'Caleb', cost: 5000, category: 'male' },
  { id: 'Cameron', cost: 7500, category: 'male' }, { id: 'Carter', cost: 7500, category: 'male' }, { id: 'Christian', cost: 7500, category: 'male' },
  { id: 'Connor', cost: 7500, category: 'male' }, { id: 'Dylan', cost: 7500, category: 'male' }, { id: 'Eli', cost: 7500, category: 'male' },
  { id: 'Elias', cost: 7500, category: 'male' }, { id: 'Evan', cost: 10000, category: 'male' }, { id: 'Gabriel', cost: 10000, category: 'male' },
  { id: 'Gavin', cost: 10000, category: 'male' }, { id: 'Hunter', cost: 10000, category: 'male' }, { id: 'Ian', cost: 10000, category: 'male' },
  { id: 'Nathan', cost: 10000, category: 'male' }, { id: 'Owen', cost: 10000, category: 'male' },
  { id: 'wizard', cost: 10000, premium: true, category: 'male' },
  { id: 'king', cost: 50000, premium: true, category: 'male' },
  
  // Kadın (Female) - Local avatars
  { id: 'Luna', cost: 0, category: 'female' }, { id: 'Mia', cost: 0, category: 'female' }, { id: 'Zoe', cost: 0, category: 'female' }, 
  { id: 'Ava', cost: 0, category: 'female' }, { id: 'Ivy', cost: 0, category: 'female' }, { id: 'Lily', cost: 0, category: 'female' }, 
  { id: 'Chloe', cost: 0, category: 'female' }, { id: 'Aria', cost: 0, category: 'female' }, { id: 'Ruby', cost: 0, category: 'female' }, 
  { id: 'Ella', cost: 0, category: 'female' }, { id: 'Granny', cost: 0, category: 'female' }, { id: 'Wise', cost: 0, category: 'female' },
  { id: 'Nora', cost: 0, category: 'female' }, { id: 'Hazel', cost: 0, category: 'female' }, { id: 'Mila', cost: 0, category: 'female' },
  { id: 'Sofia', cost: 1000, category: 'female' }, { id: 'Alice', cost: 1000, category: 'female' }, { id: 'Emma', cost: 1000, category: 'female' },
  { id: 'Olivia', cost: 1000, category: 'female' }, { id: 'Charlotte', cost: 1000, category: 'female' }, { id: 'Amelia', cost: 1000, category: 'female' },
  { id: 'Harper', cost: 1000, category: 'female' }, { id: 'Evelyn', cost: 2500, category: 'female' }, { id: 'Abigail', cost: 2500, category: 'female' },
  { id: 'Emily', cost: 2500, category: 'female' }, { id: 'Elizabeth', cost: 2500, category: 'female' }, { id: 'Avery', cost: 2500, category: 'female' },
  { id: 'Grace', cost: 2500, category: 'female' }, { id: 'Victoria', cost: 2500, category: 'female' }, { id: 'Scarlett', cost: 5000, category: 'female' },
  // 20 new female avatars
  { id: 'Sarah', cost: 5000, category: 'female' }, { id: 'Jessica', cost: 5000, category: 'female' }, { id: 'Ashley', cost: 5000, category: 'female' },
  { id: 'Amanda', cost: 5000, category: 'female' }, { id: 'Melissa', cost: 5000, category: 'female' }, { id: 'Stephanie', cost: 5000, category: 'female' },
  { id: 'Rebecca', cost: 7500, category: 'female' }, { id: 'Lauren', cost: 7500, category: 'female' }, { id: 'Brittany', cost: 7500, category: 'female' },
  { id: 'Megan', cost: 7500, category: 'female' }, { id: 'Rachel', cost: 7500, category: 'female' }, { id: 'Hannah', cost: 7500, category: 'female' },
  { id: 'Kayla', cost: 7500, category: 'female' }, { id: 'Samantha', cost: 10000, category: 'female' }, { id: 'Taylor', cost: 10000, category: 'female' },
  { id: 'Brianna', cost: 10000, category: 'female' }, { id: 'Natalie', cost: 10000, category: 'female' }, { id: 'Isabella', cost: 10000, category: 'female' },
  { id: 'Alexis', cost: 10000, category: 'female' }, { id: 'Alyssa', cost: 10000, category: 'female' },
  { id: 'ninja', cost: 10000, premium: true, category: 'female' },
  { id: 'queen', cost: 50000, premium: true, category: 'female' }
];

export const getAvatarUrl = (seed) => {
  const avatar = avatarOptions.find(a => a.id === seed);
  
  // PNG olarak yüklenmesi gereken özel karakterler ve tüm hayvanlar
  if (['ninja', 'wizard', 'king', 'queen', 'akita', 'cat', 'lion', 'fox', 'panda', 'owl', 'penguin', 'tiger', 'bear', 'koala', 'wolf', 'monkey', 'elephant', 'rhino', 'zebra', 'giraffe', 'deer'].includes(seed) || (avatar && avatar.category === 'animal')) {
    return `./avatars/${seed}.png`;
  }

  // Artık avatar SVG'lerini local (dosyadan) çekiyoruz ki oyun açılırken anında yüklensin.
  if (avatar && (avatar.category === 'male' || avatar.category === 'female')) {
    return `./avatars/humans/${seed}.svg`;
  }

  // Geriye dönük uyumluluk veya bilinmeyen seedler için lokal avatarlar (bot isimleri vs.)
  return getLocalAvatar(seed);
};
