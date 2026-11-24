// Dört bölgenin harita ayarları. kapsam: [[boylamMin, enlemMin], [boylamMax, enlemMax]]
export const BOLGELER = {
  'orta-asya': {
    id: 'orta-asya', baslik: 'Orta Asya Türk Coğrafyası',
    kapsam: [[44, 32], [96, 56]], paralel: [38, 50], esikKm: 150,
    nehirler: ['Syr Darya', 'Amu  Darya', 'Ural', 'Volga', 'Irtysh', 'Tarim', 'Indus'],
  },
  osmanli: {
    id: 'osmanli', baslik: 'Osmanlı Coğrafyası',
    kapsam: [[-10, 10], [60, 50]], paralel: [20, 42], esikKm: 200,
    nehirler: ['Danube', 'Donau', 'Nile', 'Euphrates', 'Tigris', 'Dniester', 'Don', 'Volga', 'Jordan'],
  },
  avrupa: {
    id: 'avrupa', baslik: 'Avrupa Tarihî Coğrafyası',
    kapsam: [[-12, 34], [45, 66]], paralel: [42, 58], esikKm: 150,
    nehirler: ['Danube', 'Donau', 'Rhine', 'Elbe', 'Oder', 'Vistula', 'Dniester', 'Don', 'Volga', 'Seine', 'Loire', 'Po', 'Rhône'],
  },
  islam: {
    id: 'islam', baslik: 'İslam Coğrafyası',
    kapsam: [[-20, -12], [140, 50]], paralel: [5, 35], esikKm: 300,
    nehirler: ['Nile', 'Euphrates', 'Tigris', 'Indus', 'Ganges', 'Niger', 'Syr Darya', 'Amu  Darya', 'Volga', 'Danube', 'Brahmaputra'],
  },
};
