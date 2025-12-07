// AI'ın ASLA konuşmaması gereken konular
// Bu liste tüm AI personality'lerinde kullanılır

export const RESTRICTED_TOPICS = {
  technical: [
    'kod yazılım dilleri',
    "API key'ler",
    'kullanılan yapay zeka modeli',
    'teknik detaylar',
    'yazılım mimarisi',
    'veritabanı yapısı',
    'güvenlik bilgileri',
    'sistem konfigürasyonları',
    'programming languages',
    'API keys',
    'AI models used',
    'technical details',
    'software architecture',
    'database structure',
    'security information',
    'system configurations',
  ],
  health: [
    'tıbbi müdahale',
    'ilaç önerisi',
    'tedavi önerisi',
    'teşhis',
    'sağlık tavsiyesi',
    'medical intervention',
    'medication recommendation',
    'treatment recommendation',
    'diagnosis',
    'health advice',
  ],
  sensitive: [
    'siyaset',
    'siyasi kişilik',
    'siyasi görüş',
    'intihar',
    'kendine zarar verme',
    'cinsellik',
    'uyuşturucu madde',
    'alkol kullanımı',
    'şiddet',
    'terör',
    'politics',
    'political figures',
    'political views',
    'suicide',
    'self-harm',
    'sexuality',
    'drugs',
    'alcohol use',
    'violence',
    'terrorism',
  ],
};

// Dil bazlı kısıtlı konular
const RESTRICTED_TOPICS_TR = [
  ...RESTRICTED_TOPICS.technical.filter(
    t =>
      !t.includes('programming') &&
      !t.includes('API keys') &&
      !t.includes('AI models') &&
      !t.includes('technical details') &&
      !t.includes('software architecture') &&
      !t.includes('database structure') &&
      !t.includes('security information') &&
      !t.includes('system configurations')
  ),
  ...RESTRICTED_TOPICS.health.filter(
    t =>
      !t.includes('medical intervention') &&
      !t.includes('medication recommendation') &&
      !t.includes('treatment recommendation') &&
      !t.includes('diagnosis') &&
      !t.includes('health advice')
  ),
  ...RESTRICTED_TOPICS.sensitive.filter(
    t =>
      !t.includes('politics') &&
      !t.includes('political figures') &&
      !t.includes('political views') &&
      !t.includes('suicide') &&
      !t.includes('self-harm') &&
      !t.includes('sexuality') &&
      !t.includes('drugs') &&
      !t.includes('alcohol use') &&
      !t.includes('violence') &&
      !t.includes('terrorism')
  ),
];

const RESTRICTED_TOPICS_EN = [
  ...RESTRICTED_TOPICS.technical.filter(
    t =>
      !t.includes('kod') &&
      !t.includes('yazılım') &&
      !t.includes('API key') &&
      !t.includes('yapay zeka') &&
      !t.includes('teknik') &&
      !t.includes('mimari') &&
      !t.includes('veritabanı') &&
      !t.includes('güvenlik') &&
      !t.includes('konfigürasyon')
  ),
  ...RESTRICTED_TOPICS.health.filter(
    t =>
      !t.includes('tıbbi') &&
      !t.includes('ilaç') &&
      !t.includes('tedavi') &&
      !t.includes('teşhis') &&
      !t.includes('sağlık')
  ),
  ...RESTRICTED_TOPICS.sensitive.filter(
    t =>
      !t.includes('siyaset') &&
      !t.includes('siyasi') &&
      !t.includes('intihar') &&
      !t.includes('zarar') &&
      !t.includes('cinsellik') &&
      !t.includes('uyuşturucu') &&
      !t.includes('alkol') &&
      !t.includes('şiddet') &&
      !t.includes('terör')
  ),
];

// Tüm diller için formatlanmış kısıtlama metni
export const getRestrictedTopicsText = (language: string = 'tr'): string => {
  if (language === 'tr') {
    return `ASLA şunları sohbette konuşma: ${RESTRICTED_TOPICS_TR.join(', ')}`;
  } else {
    return `NEVER discuss in conversation: ${RESTRICTED_TOPICS_EN.join(', ')}`;
  }
};

// Tüm yasaklı konuları birleştir (kontrol için)
const ALL_RESTRICTED_TOPICS = [
  ...RESTRICTED_TOPICS.technical,
  ...RESTRICTED_TOPICS.health,
  ...RESTRICTED_TOPICS.sensitive,
];

// Kullanıcı mesajında yasaklı konu kontrolü
export const checkRestrictedTopics = (message: string, language: string = 'tr'): {
  isRestricted: boolean;
  detectedTopics: string[];
  message?: string;
} => {
  const lowerMessage = message.toLowerCase();
  const detectedTopics: string[] = [];

  // Dil bazlı yasaklı konuları kontrol et
  const topicsToCheck = language === 'tr' ? RESTRICTED_TOPICS_TR : RESTRICTED_TOPICS_EN;

  // Her yasaklı konuyu kontrol et
  for (const topic of topicsToCheck) {
    if (lowerMessage.includes(topic.toLowerCase())) {
      detectedTopics.push(topic);
    }
  }

  // Tüm yasaklı konuları da kontrol et (çok dilli mesajlar için)
  for (const topic of ALL_RESTRICTED_TOPICS) {
    if (lowerMessage.includes(topic.toLowerCase()) && !detectedTopics.includes(topic)) {
      detectedTopics.push(topic);
    }
  }

  if (detectedTopics.length > 0) {
    return {
      isRestricted: true,
      detectedTopics,
      message: language === 'tr'
        ? 'Üzgünüz, bu konu hakkında konuşamıyorum. Lütfen başka bir konu seçin.'
        : 'Sorry, I cannot discuss this topic. Please choose another topic.',
    };
  }

  return {
    isRestricted: false,
    detectedTopics: [],
  };
};
