# Katkıda Bulunma Rehberi

Emora AI projesine katkıda bulunmak istediğiniz için teşekkür ederiz! Bu rehber, projeye nasıl katkıda bulunabileceğinizi açıklar.

## 🚀 Başlangıç

### Gereksinimler

- Node.js 18+ 
- npm veya yarn
- Expo CLI
- Git

### Kurulum

1. **Repository'yi fork edin**
   ```bash
   # GitHub'da fork butonuna tıklayın
   ```

2. **Repository'yi klonlayın**
   ```bash
   git clone https://github.com/YOUR_USERNAME/emora-ai.git
   cd emora-ai
   ```

3. **Dependencies yükleyin**
   ```bash
   npm install
   ```

4. **Environment variables ayarlayın**
   ```bash
   cp .env.example .env
   # .env dosyasını düzenleyin
   ```

5. **Development server'ı başlatın**
   ```bash
   npm start
   ```

## 📝 Code Style

### ESLint

Proje ESLint kullanıyor. Kodunuzu kontrol edin:

```bash
npm run lint
```

Hataları otomatik düzeltin:

```bash
npm run lint:fix
```

### Prettier

Kod formatlaması için Prettier kullanıyoruz:

```bash
npm run format
```

Format kontrolü:

```bash
npm run format:check
```

### TypeScript

TypeScript type checking:

```bash
npm run typecheck
```

## 🧪 Testler

### Test Çalıştırma

```bash
# Tüm testler
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Test Yazma

- Test dosyaları `__tests__` klasöründe olmalı
- Dosya adı: `ComponentName.test.tsx` veya `functionName.test.ts`
- Jest ve React Native Testing Library kullanın

**Örnek:**
```typescript
import { render, fireEvent } from '@testing-library/react-native';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const { getByText } = render(<MyComponent />);
    expect(getByText('Hello')).toBeTruthy();
  });
});
```

## 🔀 Git Workflow

### Branch Stratejisi

- `main` - Production branch (sadece merge)
- `develop` - Development branch
- `feature/feature-name` - Yeni özellikler
- `fix/bug-name` - Bug fix'ler
- `docs/documentation-name` - Dokümantasyon

### Commit Mesajları

Conventional Commits formatını kullanın:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: Yeni özellik
- `fix`: Bug fix
- `docs`: Dokümantasyon
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code refactoring
- `test`: Test ekleme/düzenleme
- `chore`: Build process, dependencies, etc.

**Örnekler:**
```
feat(chat): Add syntax highlighting for code blocks
fix(auth): Fix token refresh issue
docs(api): Update API documentation
test(chat): Add ChatScreen component tests
```

### Pull Request Process

1. **Feature branch oluşturun**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Değişikliklerinizi yapın ve commit edin**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

3. **Branch'inizi push edin**
   ```bash
   git push origin feature/my-feature
   ```

4. **Pull Request oluşturun**
   - GitHub'da PR açın
   - Açıklayıcı başlık ve açıklama ekleyin
   - İlgili issue'ları referans edin

5. **Code review bekleyin**
   - Review'lar tamamlanana kadar bekleyin
   - Gerekli değişiklikleri yapın

6. **Merge**
   - Review onaylandıktan sonra merge edilir

## 📋 Pull Request Checklist

PR göndermeden önce kontrol edin:

- [ ] Kod ESLint kurallarına uyuyor (`npm run lint`)
- [ ] Kod Prettier ile formatlanmış (`npm run format`)
- [ ] TypeScript hataları yok (`npm run typecheck`)
- [ ] Testler geçiyor (`npm test`)
- [ ] Yeni testler eklendi (gerekliyse)
- [ ] Dokümantasyon güncellendi (gerekliyse)
- [ ] Commit mesajları conventional commits formatında
- [ ] Branch güncel (`git pull origin develop`)

## 🏗️ Mimari

### Repository Pattern

Veritabanı erişimi için Repository Pattern kullanıyoruz:

```typescript
// Interface
export interface IMessageRepository {
  save(message: Message): Promise<Message>;
  findBySessionId(sessionId: string): Promise<Message[]>;
}

// Implementation
export class SupabaseMessageRepository implements IMessageRepository {
  // ...
}
```

### Dependency Injection

Repository'ler DI Container üzerinden inject edilir:

```typescript
import { container } from './di/container';

const messageRepo = container.getMessageRepository();
```

### State Management

Zustand kullanıyoruz:

```typescript
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  login: async (email, password) => {
    // ...
  },
}));
```

## 📚 Dokümantasyon

### Kod İçi Yorumlar

- Complex logic'ler için açıklayıcı yorumlar ekleyin
- JSDoc formatını kullanın:

```typescript
/**
 * Mesajları token limitine göre filtreler
 * @param messages - Filtrelenecek mesajlar
 * @param maxTokens - Maksimum token sayısı
 * @returns Filtrelenmiş mesajlar
 */
function filterMessagesByTokenLimit(messages: Message[], maxTokens: number): Message[] {
  // ...
}
```

### Dokümantasyon Dosyaları

- `ARCHITECTURE.md` - Mimari dokümantasyon
- `API_DOCUMENTATION.md` - API dokümantasyonu
- `SETUP_GUIDE.md` - Kurulum rehberi

## 🐛 Bug Report

Bug bulduysanız:

1. **Issue oluşturun**
   - Açıklayıcı başlık
   - Adımlar (steps to reproduce)
   - Beklenen davranış
   - Gerçek davranış
   - Screenshots (varsa)
   - Environment bilgileri

2. **Bug fix PR gönderin**
   - `fix/` prefix'i ile branch oluşturun
   - Test ekleyin
   - PR'da issue'yu referans edin

## ✨ Feature Request

Yeni özellik önerisi:

1. **Issue oluşturun**
   - Özelliği açıklayın
   - Kullanım senaryosunu belirtin
   - Alternatif çözümleri düşünün

2. **Discussion**
   - Maintainer'lar ile tartışın
   - Onay alın

3. **Implementation**
   - `feature/` prefix'i ile branch oluşturun
   - Test ekleyin
   - Dokümantasyon güncelleyin

## 🔒 Güvenlik

Güvenlik açığı bulduysanız:

- **ÖNEMLİ:** Public issue açmayın
- Email ile bildirin: security@emoraai.com
- Detaylı açıklama yapın
- Proof of concept ekleyin (güvenli şekilde)

## 📞 İletişim

- **Issues:** GitHub Issues
- **Discussions:** GitHub Discussions
- **Email:** support@emoraai.com

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Katkıda bulunarak, kodunuzun da aynı lisans altında lisanslanacağını kabul edersiniz.

---

**Teşekkürler!** 🎉

