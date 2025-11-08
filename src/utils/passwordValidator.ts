// Şifre güçlülük kontrolü utility
// Güçlü şifre validasyonu için

export interface PasswordValidationResult {
  valid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errors: string[];
  requirements: {
    minLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    notCommon: boolean;
  };
}

// Yaygın zayıf şifreler listesi
const COMMON_PASSWORDS = [
  'password',
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty',
  'abc123',
  'password1',
  'admin',
  'letmein',
  'welcome',
  'monkey',
  '1234567',
  'sunshine',
  'princess',
  'azerty',
  'trustno1',
  'dragon',
  'baseball',
  'iloveyou',
  'master',
  'hello',
  'freedom',
  'whatever',
  'qazwsx',
  'mustang',
  'shadow',
  'ashley',
  'football',
  'jesus',
  'michael',
  'ninja',
  'mustang',
  'password123',
  'şifre',
  '123456',
  'qwerty123',
];

// Şifre güçlülük kontrolü
export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
  const requirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    notCommon: !COMMON_PASSWORDS.includes(password.toLowerCase()),
  };

  // Hata mesajları
  if (!requirements.minLength) {
    errors.push('Şifre en az 8 karakter olmalıdır');
  }
  if (!requirements.hasUpperCase) {
    errors.push('Şifre en az bir büyük harf içermelidir');
  }
  if (!requirements.hasLowerCase) {
    errors.push('Şifre en az bir küçük harf içermelidir');
  }
  if (!requirements.hasNumber) {
    errors.push('Şifre en az bir rakam içermelidir');
  }
  if (!requirements.hasSpecialChar) {
    errors.push('Şifre en az bir özel karakter içermelidir (!@#$%^&* vb.)');
  }
  if (!requirements.notCommon) {
    errors.push('Bu şifre çok yaygın kullanılıyor, lütfen daha güçlü bir şifre seçin');
  }

  // Güçlülük hesaplama
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  const metRequirements = Object.values(requirements).filter(Boolean).length;
  
  if (metRequirements >= 5 && requirements.minLength && requirements.notCommon) {
    strength = 'strong';
  } else if (metRequirements >= 3) {
    strength = 'medium';
  }

  const valid = errors.length === 0;

  return {
    valid,
    strength,
    errors,
    requirements,
  };
};

// Şifre güçlülük açıklaması
export const getPasswordStrengthText = (strength: 'weak' | 'medium' | 'strong'): string => {
  switch (strength) {
    case 'weak':
      return 'Zayıf';
    case 'medium':
      return 'Orta';
    case 'strong':
      return 'Güçlü';
    default:
      return 'Bilinmiyor';
  }
};

// Şifre güçlülük rengi (UI için)
export const getPasswordStrengthColor = (strength: 'weak' | 'medium' | 'strong'): string => {
  switch (strength) {
    case 'weak':
      return '#ff4444'; // Kırmızı
    case 'medium':
      return '#ffaa00'; // Turuncu
    case 'strong':
      return '#00C851'; // Yeşil
    default:
      return '#666666';
  }
};

