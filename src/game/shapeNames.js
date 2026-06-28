// Şekil adı yerelleştirmesi (Arrow modu "gizli resim" isimleri).
// Anahtar = allShapes.js'teki (temizlenmiş) Türkçe ad. Değer = İngilizce karşılık.
// getShapeName(name, lang): lang 'tr' ise Türkçe adı, değilse İngilizce'yi (yoksa Türkçe'ye düşer) döndürür.
// NOT: Şimdilik tr + en tam; diğer 9 dil otomatik İngilizce'ye düşer (kırık değil). Diğer diller
// aynı yapıya { [ad]: { es, fr, ... } } olarak parti hâlinde eklenebilir.

export const SHAPE_EN = {
  // Geometrik
  "Kare": "Square", "Daire": "Circle", "Üçgen": "Triangle", "Elmas": "Diamond",
  "Artı": "Plus", "Çarpı": "Cross", "Altıgen": "Hexagon", "Yıldız": "Star",
  "Çerçeve": "Frame", "Kalp": "Heart",
  // Nesneler
  "Ev": "House", "Kılıç": "Sword", "Kupa": "Trophy", "Anahtar": "Key",
  "Şemsiye": "Umbrella", "Kitap": "Book", "Sandalye": "Chair", "Masa": "Table",
  "Kalkan": "Shield", "Ok işareti": "Arrow", "Merdiven": "Ladder", "Zarf": "Envelope",
  "Saat": "Clock", "Gözlük": "Glasses", "Kulaklık": "Headphones", "Gitar": "Guitar",
  "Çekiç": "Hammer", "Kilit": "Lock", "Lamba": "Lamp", "Mikroskop": "Microscope",
  // Araçlar
  "Araba": "Car", "Uçak": "Airplane", "Gemi": "Ship", "Kamyon": "Truck",
  "Tren": "Train", "Bisiklet": "Bicycle", "Roket": "Rocket", "Helikopter": "Helicopter",
  "Denizaltı": "Submarine", "UFO": "UFO", "Traktör": "Tractor", "Yelkenli": "Sailboat",
  "Yat": "Yacht", "Motosiklet": "Motorcycle", "Dozer": "Bulldozer", "Vinç": "Crane",
  "Otobüs": "Bus", "Skateboard": "Skateboard", "Uzay Mekik": "Space Shuttle", "Zeplin": "Zeppelin",
  // Hayvanlar
  "Kedi": "Cat", "Köpek": "Dog", "Kuş": "Bird", "Balık": "Fish",
  "Kelebek": "Butterfly", "Örümcek": "Spider", "Tavşan": "Rabbit", "Kurbağa": "Frog",
  "Fil": "Elephant", "Zürafa": "Giraffe", "Yılan": "Snake", "Kaplumbağa": "Turtle",
  "At": "Horse", "İnek": "Cow", "Domuz": "Pig", "Koyun": "Sheep",
  "Maymun": "Monkey", "Penguen": "Penguin", "Aslan": "Lion", "Ayı": "Bear",
  // Doğa & yiyecek
  "Ağaç": "Tree", "Çam Ağacı": "Pine Tree", "Mantary": "Mushroom", "Güneş": "Sun",
  "Ay": "Moon", "Bulut": "Cloud", "Şimşek": "Lightning", "Elma": "Apple",
  "Muz": "Banana", "Kiraz": "Cherry", "Çiçek": "Flower", "Dağ": "Mountain",
  "Kardan Adam": "Snowman", "Kaktüs": "Cactus", "Havuç": "Carrot", "Pizza": "Pizza",
  "Robot": "Robot", "Teleskop": "Telescope", "Joystick": "Joystick", "Gamepad": "Gamepad",
  "Puzzle": "Puzzle", "Tarak": "Comb", "Fırça": "Brush", "Ayna": "Mirror",
  "Bavul": "Suitcase", "Çanta": "Bag", "Şapka": "Hat", "Ayakkabı": "Shoe",
  "Çorap": "Sock", "Eldiven": "Glove", "Ampul": "Lightbulb", "El Çantası": "Handbag",
  "Cep Telefonu": "Mobile Phone", "Kahve Fincanı": "Coffee Cup", "Asma Kilit": "Padlock",
  "Makas": "Scissors", "Çatal": "Fork", "Satranç Piyonu": "Chess Pawn", "Zar": "Dice",
  "Vazo": "Vase", "Büyüteç": "Magnifier", "Mum": "Candle", "Mantar": "Mushroom",
  "Yaprak": "Leaf", "Yıldırım": "Lightning Bolt", "Hilal": "Crescent", "Pusula": "Compass",
  "Mektup Zarfı": "Envelope", "Mıknatıs": "Magnet", "Masa Lambası": "Table Lamp",
  "Foto Makinesi": "Camera", "Radyo": "Radio", "Televizyon": "Television", "Daktilo": "Typewriter",
  "Gramofon": "Gramophone", "Kılıç-Kalkan": "Sword & Shield", "Çapraz Tabanca": "Crossed Pistols",
  "Korsan Gemisi": "Pirate Ship", "Klasik Oto": "Classic Car", "Lokomotif": "Locomotive",
  "Uzay Mekiği": "Space Shuttle", "Şato": "Castle", "Yel Değirmeni": "Windmill",
  "Deniz Feneri": "Lighthouse", "Çadır": "Tent", "Taş": "Rock", "Baykuş": "Owl",
  "Kedi Kafası": "Cat Face", "At Kafası": "Horse Head", "Ahtapot": "Octopus", "Palmiye": "Palm Tree",
  "Yandan Profil": "Side Profile", "Göz": "Eye", "El": "Hand", "Ayak İzi": "Footprint",
  "Kafatası": "Skull", "Dedektif": "Detective", "Astronot": "Astronaut", "Dalga": "Wave",
  "Miğfer": "Helmet", "Kurt": "Wolf", "Ejderha": "Dragon", "Anka Kuşu": "Phoenix",
  "Dinozor": "Dinosaur", "Balon": "Balloon", "Harita": "Map", "Saat Kulesi": "Clock Tower",
  "Piyano": "Piano", "Mona Lisa": "Mona Lisa", "İnci Küpesi": "Pearl Earring", "Eyfel": "Eiffel Tower",
  "Özgürlük": "Statue of Liberty", "Kolezyum": "Colosseum", "Tac Mahal": "Taj Mahal",
  "Piramit": "Pyramid", "Satranç": "Chess", "Gramofon Detayı": "Gramophone", "Çarkıfelek": "Ferris Wheel",
  "Savaş Gemisi": "Battleship", "Zeplin Detay": "Zeppelin", "Fırtına": "Storm", "Dev Gemi": "Giant Ship",
  "Dev Ejderha": "Giant Dragon", "Labirent": "Labyrinth", "DNA": "DNA", "Kartal": "Eagle"
};
