// Password validator test
import {
  validatePassword,
  getPasswordStrengthText,
  getPasswordStrengthColor,
} from '../passwordValidator';

describe('Password Validator', () => {
  describe('validatePassword', () => {
    it('should reject passwords shorter than 8 characters', () => {
      const result = validatePassword('short');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Şifre en az 8 karakter olmalıdır');
    });

    it('should reject passwords without uppercase', () => {
      const result = validatePassword('lowercase123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Şifre en az bir büyük harf içermelidir');
    });

    it('should reject passwords without lowercase', () => {
      const result = validatePassword('UPPERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Şifre en az bir küçük harf içermelidir');
    });

    it('should reject passwords without numbers', () => {
      const result = validatePassword('NoNumbers!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Şifre en az bir rakam içermelidir');
    });

    it('should reject passwords without special characters', () => {
      const result = validatePassword('NoSpecial123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Şifre en az bir özel karakter içermelidir');
    });

    it('should reject common passwords', () => {
      const result = validatePassword('password123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Bu şifre çok yaygın kullanılıyor');
    });

    it('should accept strong passwords', () => {
      const result = validatePassword('StrongP@ss123');
      expect(result.valid).toBe(true);
      expect(result.strength).toBe('strong');
      expect(result.errors).toHaveLength(0);
    });

    it('should identify medium strength passwords', () => {
      const result = validatePassword('Medium123');
      expect(result.strength).toBe('medium');
    });

    it('should identify weak strength passwords', () => {
      const result = validatePassword('weak123');
      expect(result.strength).toBe('weak');
    });
  });

  describe('getPasswordStrengthText', () => {
    it('should return correct strength text', () => {
      expect(getPasswordStrengthText('weak')).toBe('Zayıf');
      expect(getPasswordStrengthText('medium')).toBe('Orta');
      expect(getPasswordStrengthText('strong')).toBe('Güçlü');
    });
  });

  describe('getPasswordStrengthColor', () => {
    it('should return correct colors', () => {
      expect(getPasswordStrengthColor('weak')).toBe('#ff4444');
      expect(getPasswordStrengthColor('medium')).toBe('#ffaa00');
      expect(getPasswordStrengthColor('strong')).toBe('#00C851');
    });
  });
});
