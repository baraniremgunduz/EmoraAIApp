// Fallback response'lar - API çalışmazsa kullanılacak cevaplar

export interface FallbackResponses {
  tr: string[];
  en: string[];
}

export const FALLBACK_RESPONSES: Record<string, FallbackResponses> = {
  friendly: {
    tr: [
      "Merhaba! 😊 Nasıl hissediyorsun? Benimle paylaşmak istediğin bir şey var mı?",
      "Selam! Bugün nasılsın? Benimle sohbet etmek ister misin? 💬",
      "Hey! Nasıl gidiyor? Benimle konuşmak ister misin?",
      "Merhaba! Bugün nasıl geçiyor? Bir şeyler paylaşmak ister misin? 🤗",
      "Selam! Nasıl hissediyorsun? Benimle sohbet etmek ister misin?",
      "Merhaba! Bugün nasılsın? Benimle konuşmak ister misin? 😊",
      "Hey! Nasıl gidiyor? Benimle paylaşmak istediğin bir şey var mı?",
      "Selam! Bugün nasıl geçiyor? Benimle sohbet etmek ister misin? 💭",
      "Merhaba! Nasıl hissediyorsun? Benimle konuşmak ister misin?",
      "Hey! Bugün nasılsın? Benimle paylaşmak istediğin bir şey var mı? 😄"
    ],
    en: [
      "Hello! 😊 How are you feeling? Is there something you'd like to share with me?",
      "Hi! How are you today? Would you like to chat with me? 💬",
      "Hey! How's it going? Would you like to talk with me?",
      "Hello! How's your day going? Would you like to share something? 🤗",
      "Hi! How are you feeling? Would you like to chat with me?",
      "Hello! How are you today? Would you like to talk with me? 😊",
      "Hey! How's it going? Is there something you'd like to share with me?",
      "Hi! How's your day going? Would you like to chat with me? 💭",
      "Hello! How are you feeling? Would you like to talk with me?",
      "Hey! How are you today? Is there something you'd like to share with me? 😄"
    ]
  },
  professional: {
    tr: [
      "Merhaba! Bugün nasıl yardımcı olabilirim?",
      "Selam! Size nasıl destek olabilirim?",
      "Merhaba! Hangi konuda yardıma ihtiyacınız var?",
      "Selam! Bugün ne üzerinde çalışmak istiyorsunuz?",
      "Merhaba! Size nasıl yardımcı olabilirim?",
      "Selam! Hangi konuda konuşmak istersiniz?",
      "Merhaba! Bugün nasıl destek olabilirim?",
      "Selam! Size nasıl yardım edebilirim?",
      "Merhaba! Hangi konuda yardıma ihtiyacınız var?",
      "Selam! Bugün ne üzerinde çalışmak istiyorsunuz?"
    ],
    en: [
      "Hello! How can I assist you today?",
      "Hi! How can I support you?",
      "Hello! What area do you need help with?",
      "Hi! What would you like to work on today?",
      "Hello! How can I help you?",
      "Hi! What would you like to discuss?",
      "Hello! How can I support you today?",
      "Hi! How can I assist you?",
      "Hello! What area do you need help with?",
      "Hi! What would you like to work on today?"
    ]
  },
  casual: {
    tr: [
      "Hey! Ne var ne yok? 😄",
      "Selam! Nasılsın? 😊",
      "Hey! Bugün nasıl geçiyor? 🎉",
      "Selam! Ne haber? 😎",
      "Hey! Nasıl gidiyor? 😄",
      "Selam! Bugün nasılsın? 😊",
      "Hey! Ne var ne yok? 🎉",
      "Selam! Nasıl geçiyor? 😎",
      "Hey! Ne haber? 😄",
      "Selam! Bugün nasıl gidiyor? 😊"
    ],
    en: [
      "Hey! What's up? 😄",
      "Hi! How are you? 😊",
      "Hey! How's your day going? 🎉",
      "Hi! What's new? 😎",
      "Hey! How's it going? 😄",
      "Hi! How are you today? 😊",
      "Hey! What's up? 🎉",
      "Hi! How's it going? 😎",
      "Hey! What's new? 😄",
      "Hi! How's your day going? 😊"
    ]
  },
  premium: {
    tr: [
      "Merhaba! Gelişmiş AI asistanınız olarak size nasıl yardımcı olabilirim?",
      "Selam! Premium özelliklerimle size nasıl destek olabilirim?",
      "Merhaba! Hangi konuda derinlemesine yardıma ihtiyacınız var?",
      "Selam! Bugün hangi yaratıcı projede çalışmak istiyorsunuz?",
      "Merhaba! Size nasıl gelişmiş destek sağlayabilirim?",
      "Selam! Hangi konuda kişiselleştirilmiş yardıma ihtiyacınız var?",
      "Merhaba! Bugün hangi karmaşık konuda çalışmak istiyorsunuz?",
      "Selam! Size nasıl sofistike destek sağlayabilirim?",
      "Merhaba! Hangi konuda gelişmiş analiz yapmamı istersiniz?",
      "Selam! Bugün hangi yaratıcı fikirde çalışmak istiyorsunuz?"
    ],
    en: [
      "Hello! How can I assist you as your advanced AI assistant?",
      "Hi! How can I support you with my premium features?",
      "Hello! What area do you need in-depth help with?",
      "Hi! What creative project would you like to work on today?",
      "Hello! How can I provide you with advanced support?",
      "Hi! What area do you need personalized help with?",
      "Hello! What complex topic would you like to work on today?",
      "Hi! How can I provide you with sophisticated support?",
      "Hello! What area would you like me to perform advanced analysis on?",
      "Hi! What creative idea would you like to work on today?"
    ]
  }
};

export const getRandomFallbackResponse = (personality: string, language: string): string => {
  const responses = FALLBACK_RESPONSES[personality] || FALLBACK_RESPONSES.friendly;
  const langResponses = responses[language as keyof FallbackResponses] || responses.tr;
  const randomIndex = Math.floor(Math.random() * langResponses.length);
  return langResponses[randomIndex];
};

