/** Nápověda pro pole značka/model (datalist). Uživatel může zadat cokoli. */
export const CAR_MODELS: Record<string, string[]> = {
  'Škoda': ['Citigo', 'Fabia', 'Fabia Combi', 'Rapid', 'Rapid Spaceback', 'Scala', 'Octavia', 'Octavia Combi', 'Octavia RS', 'Superb', 'Superb Combi', 'Roomster', 'Yeti', 'Kamiq', 'Karoq', 'Kodiaq', 'Enyaq', 'Enyaq Coupé', 'Elroq'],
  'Volkswagen': ['Up!', 'Polo', 'Golf', 'Golf Variant', 'Golf Sportsvan', 'Golf Plus', 'Jetta', 'Passat', 'Passat Variant', 'Passat CC', 'Arteon', 'Scirocco', 'Beetle', 'T-Roc', 'T-Cross', 'Taigo', 'Tiguan', 'Tiguan Allspace', 'Touareg', 'Touran', 'Sharan', 'Caddy', 'Multivan', 'Transporter', 'Amarok', 'ID.3', 'ID.4', 'ID.5', 'ID.7', 'ID. Buzz'],
  'BMW': ['Řada 1', 'Řada 2', 'Řada 2 Active Tourer', 'Řada 2 Gran Coupé', 'Řada 3', 'Řada 3 Touring', 'Řada 3 GT', 'Řada 4', 'Řada 4 Gran Coupé', 'Řada 5', 'Řada 5 Touring', 'Řada 6 GT', 'Řada 7', 'Řada 8', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'Z4', 'i3', 'i4', 'i5', 'iX', 'iX1', 'iX3', 'M2', 'M3', 'M4', 'M5'],
  'Mercedes-Benz': ['A', 'B', 'C', 'C kombi', 'C Coupé', 'CLA', 'CLA Shooting Brake', 'CLS', 'E', 'E kombi', 'E Coupé', 'S', 'GLA', 'GLB', 'GLC', 'GLC Coupé', 'GLE', 'GLE Coupé', 'GLS', 'G', 'SL', 'AMG GT', 'EQA', 'EQB', 'EQC', 'EQE', 'EQS', 'Citan', 'V', 'Vito', 'Sprinter'],
  'Audi': ['A1', 'A1 Sportback', 'A3', 'A3 Sportback', 'A3 Sedan', 'A4', 'A4 Avant', 'A4 Allroad', 'A5', 'A5 Sportback', 'A6', 'A6 Avant', 'A6 Allroad', 'A7 Sportback', 'A8', 'Q2', 'Q3', 'Q3 Sportback', 'Q4 e-tron', 'Q5', 'Q5 Sportback', 'Q7', 'Q8', 'Q8 e-tron', 'e-tron GT', 'TT', 'RS3', 'RS4', 'RS5', 'RS6', 'RS7'],
  'Toyota': ['Aygo', 'Aygo X', 'Yaris', 'Yaris Cross', 'GR Yaris', 'Corolla', 'Corolla Touring Sports', 'Auris', 'Avensis', 'Camry', 'C-HR', 'RAV4', 'Highlander', 'Land Cruiser', 'Hilux', 'Prius', 'Proace', 'Proace City', 'Supra', 'bZ4X', 'Verso'],
  'Ford': ['Ka+', 'Fiesta', 'Focus', 'Focus Combi', 'Mondeo', 'Mondeo Combi', 'B-MAX', 'C-MAX', 'S-MAX', 'Galaxy', 'EcoSport', 'Puma', 'Kuga', 'Edge', 'Explorer', 'Mustang', 'Mustang Mach-E', 'Ranger', 'Transit', 'Transit Connect', 'Transit Custom', 'Tourneo Connect', 'Tourneo Custom'],
  'Hyundai': ['i10', 'i20', 'i30', 'i30 Kombi', 'i30 N', 'i40', 'i40 Kombi', 'ix20', 'ix35', 'Elantra', 'Kona', 'Kona Electric', 'Bayon', 'Tucson', 'Santa Fe', 'Ioniq', 'Ioniq 5', 'Ioniq 6', 'Staria'],
  'Kia': ['Picanto', 'Rio', 'Ceed', 'Ceed SW', 'ProCeed', 'XCeed', 'Optima', 'Stinger', 'Soul', 'Venga', 'Niro', 'e-Niro', 'Niro EV', 'Stonic', 'Sportage', 'Sorento', 'Carnival', 'EV6', 'EV9'],
  'Peugeot': ['107', '108', '206', '207', '208', 'e-208', '301', '307', '308', '308 SW', '408', '407', '508', '508 SW', '2008', 'e-2008', '3008', '4008', '5008', 'Partner', 'Rifter', 'Expert', 'Traveller', 'RCZ'],
  'Renault': ['Twingo', 'Clio', 'Clio Grandtour', 'Megane', 'Megane Grandtour', 'Mégane E-Tech', 'Fluence', 'Laguna', 'Talisman', 'Talisman Grandtour', 'Scenic', 'Grand Scenic', 'Espace', 'Captur', 'Kadjar', 'Austral', 'Koleos', 'Arkana', 'Kangoo', 'Trafic', 'Master', 'Zoe'],
  'Opel': ['Adam', 'Karl', 'Corsa', 'Corsa-e', 'Astra', 'Astra Sports Tourer', 'Insignia', 'Insignia Sports Tourer', 'Meriva', 'Zafira', 'Zafira Life', 'Combo', 'Combo Life', 'Crossland', 'Crossland X', 'Grandland', 'Grandland X', 'Mokka', 'Mokka-e', 'Antara', 'Vivaro', 'Movano'],
  'Seat': ['Mii', 'Ibiza', 'Ibiza ST', 'Leon', 'Leon ST', 'Leon Sportstourer', 'Toledo', 'Altea', 'Altea XL', 'Alhambra', 'Arona', 'Ateca', 'Tarraco'],
  'Cupra': ['Formentor', 'Leon', 'Ateca', 'Born', 'Tavascan', 'Terramar'],
  'Volvo': ['S40', 'S60', 'S90', 'V40', 'V40 Cross Country', 'V50', 'V60', 'V60 Cross Country', 'V70', 'V90', 'V90 Cross Country', 'C30', 'C40', 'XC40', 'XC60', 'XC70', 'XC90', 'EX30', 'EX90'],
  'Honda': ['Jazz', 'Civic', 'Civic Tourer', 'Accord', 'Insight', 'CR-V', 'HR-V', 'ZR-V', 'e:Ny1', 'Honda e', 'CR-Z', 'FR-V'],
  'Mazda': ['2', '3', '5', '6', '6 Wagon', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'CX-7', 'CX-80', 'MX-5', 'MX-30'],
  'Nissan': ['Micra', 'Note', 'Pulsar', 'Leaf', 'Juke', 'Qashqai', 'X-Trail', 'Ariya', 'Navara', 'Pathfinder', 'NV200', 'Townstar', 'Primastar'],
  'Citroën': ['C1', 'C2', 'C3', 'C3 Picasso', 'C3 Aircross', 'C4', 'C4 Cactus', 'C4 Picasso', 'C4 SpaceTourer', 'C4 X', 'ë-C4', 'C5', 'C5 Aircross', 'C5 X', 'C-Elysée', 'Berlingo', 'SpaceTourer', 'Jumpy', 'Jumper'],
  'DS': ['DS 3', 'DS 3 Crossback', 'DS 4', 'DS 5', 'DS 7', 'DS 9'],
  'Fiat': ['500', '500e', '500X', '500L', 'Panda', 'Punto', 'Grande Punto', 'Tipo', 'Tipo SW', 'Bravo', 'Doblo', 'Fiorino', 'Talento', 'Ducato', '124 Spider', '600'],
  'Dacia': ['Sandero', 'Sandero Stepway', 'Logan', 'Logan MCV', 'Duster', 'Jogger', 'Spring', 'Lodgy', 'Dokker', 'Bigster'],
  'Suzuki': ['Swift', 'Ignis', 'Baleno', 'Vitara', 'S-Cross', 'SX4', 'Jimny', 'Across', 'Swace'],
  'Porsche': ['911', '718 Boxster', '718 Cayman', 'Cayenne', 'Cayenne Coupé', 'Macan', 'Panamera', 'Taycan'],
  'Land Rover': ['Defender', 'Discovery', 'Discovery Sport', 'Freelander', 'Range Rover', 'Range Rover Sport', 'Range Rover Velar', 'Range Rover Evoque'],
  'Jeep': ['Renegade', 'Compass', 'Cherokee', 'Grand Cherokee', 'Wrangler', 'Avenger'],
  'Mitsubishi': ['Space Star', 'Colt', 'Lancer', 'ASX', 'Eclipse Cross', 'Outlander', 'Pajero', 'L200'],
  'Subaru': ['Impreza', 'WRX', 'Legacy', 'Levorg', 'Outback', 'Forester', 'XV', 'Crosstrek', 'BRZ', 'Solterra'],
  'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X'],
  'Lexus': ['CT', 'IS', 'ES', 'GS', 'LS', 'UX', 'NX', 'RX', 'RZ', 'LC'],
  'Mini': ['Cooper', 'Cooper 5dv', 'Clubman', 'Countryman', 'Cabrio', 'Aceman'],
  'Alfa Romeo': ['Giulietta', 'Giulia', 'Stelvio', 'Tonale', 'Junior', 'MiTo', '159'],
  'Jaguar': ['XE', 'XF', 'XJ', 'F-Pace', 'E-Pace', 'I-Pace', 'F-Type'],
  'MG': ['MG4', 'MG5', 'ZS', 'HS', 'EHS', 'Marvel R'],
  'BYD': ['Atto 3', 'Dolphin', 'Seal', 'Seal U', 'Tang', 'Han'],
};

export const CAR_BRANDS = Object.keys(CAR_MODELS);

export const FUELS = ['Benzín', 'Diesel', 'Hybrid', 'Plug-in hybrid', 'Elektro', 'LPG', 'CNG'];
export const TRANSMISSIONS = ['Manuál', 'Automat'];
export const BODY_TYPES = ['Hatchback', 'Sedan', 'Kombi', 'SUV', 'Kupé', 'Kabriolet', 'MPV / van', 'Pick-up'];
export const COLORS = ['Bílá', 'Černá', 'Šedá', 'Stříbrná', 'Modrá', 'Červená', 'Zelená', 'Hnědá', 'Jiná'];
export const TECH_CONDITIONS = ['Výborný', 'Velmi dobrý', 'Dobrý', 'Průměrný', 'Špatný'];
export const PAINT_CONDITIONS = ['Bez vad', 'Drobné škrábance', 'Viditelné škody', 'Koroze'];
export const OWNERS = ['1', '2', '3', '4 a více', 'Nevím'];
export const ACCIDENTS = ['Bez nehody', 'Drobná nehoda, opraveno', 'Větší nehoda, opraveno', 'Nevím'];
export const SERVICE_HISTORY = ['Kompletní v autorizovaném servisu', 'Kompletní v nezávislém servisu', 'Neúplná', 'Bez servisní knížky'];
export const ORIGINS = ['ČR', 'Německo', 'Slovensko', 'Rakousko', 'Polsko', 'Francie', 'Itálie', 'Jiný'];
export const IMPORT_DETAILS = ['Koupeno nové v ČR', 'První majitel v ČR', 'Dovoz, přihlášeno v ČR', 'Dovoz, zatím nepřihlášeno'];
export const TIRES = ['Letní', 'Zimní', 'Celoroční', 'Letní + zimní sada', 'Nové', 'Před výměnou'];
export const EQUIPMENT = [
  'Klimatizace', 'Navigace', 'Zadní kamera', 'Parkovací senzory', 'Tempomat', 'Adaptivní tempomat',
  'Vyhřívané sedačky', 'Kožená sedadla', 'Panoramatická střecha', 'Apple CarPlay / Android Auto',
  'Head-up displej', 'LED / Matrix světla', 'Tažné zařízení', 'Keyless', 'Vyhřívaný volant',
  '360° kamera', 'Asistent jízdy v pruhu', 'Hlídání mrtvého úhlu', 'Virtuální kokpit',
  'Elektrická sedadla s pamětí', 'Ventilované sedačky', 'Prémiový zvuk', 'Vzduchový podvozek',
  'Elektrické víko kufru', 'Ambientní osvětlení', 'Nezávislé topení',
];
