// Input sanitization utility - XSS koruması için
// Kullanıcı input'larını temizler ve güvenli hale getirir

const MAX_MESSAGE_LENGTH = 5000; // Maksimum mesaj uzunluğu

// HTML/script tag'lerini temizle
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Önce uzunluk kontrolü
  let sanitized = input.trim();

  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    sanitized = sanitized.substring(0, MAX_MESSAGE_LENGTH);
  }

  // HTML tag'lerini temizle (basit regex ile)
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Script tag'leri
    .replace(/<[^>]+>/g, '') // Tüm HTML tag'leri
    .replace(/javascript:/gi, '') // JavaScript: protokolü
    .replace(/on\w+\s*=/gi, '') // Event handler'lar (onclick, onerror, vb.)
    .replace(/data:text\/html/gi, ''); // Data URI'ler

  // React Native Text component otomatik escape eder, bu yüzden HTML escape'e gerek yok
  // Ancak script tag'leri ve event handler'ları temizledik
  // Sadece trim yap ve döndür
  return sanitized.trim();
};

// Prompt injection koruması
export const detectPromptInjection = (input: string): boolean => {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const lowerInput = input.toLowerCase();

  // Yaygın prompt injection pattern'leri
  const injectionPatterns = [
    'ignore previous instructions',
    'forget all previous',
    'you are now',
    'act as if',
    'pretend to be',
    'system:',
    'assistant:',
    'user:',
    'ignore the above',
    'disregard previous',
    'önceki talimatları yok say',
    'sistem:',
    'asistan:',
    'kullanıcı:',
  ];

  return injectionPatterns.some(pattern => lowerInput.includes(pattern));
};

// Mesaj uzunluğu kontrolü
export const validateMessageLength = (input: string): { valid: boolean; error?: string } => {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Mesaj boş olamaz' };
  }

  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Mesaj boş olamaz' };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Mesaj ${MAX_MESSAGE_LENGTH} karakterden uzun olamaz`,
    };
  }

  return { valid: true };
};

// Tam input validasyonu (sanitize + injection check + length)
export const validateAndSanitizeInput = (
  input: string
): {
  valid: boolean;
  sanitized?: string;
  error?: string;
} => {
  // Uzunluk kontrolü
  const lengthCheck = validateMessageLength(input);
  if (!lengthCheck.valid) {
    return { valid: false, error: lengthCheck.error };
  }

  // Prompt injection kontrolü
  if (detectPromptInjection(input)) {
    return {
      valid: false,
      error: 'Bu mesaj güvenlik nedeniyle gönderilemez',
    };
  }

  // Sanitize et
  const sanitized = sanitizeInput(input);

  if (!sanitized || sanitized.length === 0) {
    return { valid: false, error: 'Geçerli bir mesaj giriniz' };
  }

  return { valid: true, sanitized };
};
