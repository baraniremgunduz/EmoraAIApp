# Mimari Dokümantasyon

## Genel Bakış

Bu uygulama modern, ölçeklenebilir ve test edilebilir bir mimari kullanmaktadır:
- **Repository Pattern**: Veritabanı erişimini soyutlar
- **Dependency Injection**: Loose coupling ve test edilebilirlik
- **Zustand**: Performanslı state management
- **Caching Layer**: Performans optimizasyonu
- **Error Handling**: Merkezi hata yönetimi

## Mimari Katmanlar

### 1. Repository Pattern

**Konum**: `src/repositories/`

#### Interface'ler
- `IMessageRepository` - Mesaj işlemleri
- `IChatRepository` - AI chat işlemleri
- `ISessionRepository` - Session yönetimi
- `IAuthRepository` - Authentication
- `IAnalyticsRepository` - Analytics tracking
- `INotificationRepository` - Push notifications

#### Implementasyonlar
- `SupabaseMessageRepository` - Supabase mesaj implementasyonu
- `SupabaseChatRepository` - Supabase AI chat implementasyonu
- `SupabaseSessionRepository` - Supabase session implementasyonu
- `SupabaseAuthRepository` - Supabase auth implementasyonu
- `SupabaseAnalyticsRepository` - Supabase analytics implementasyonu
- `ExpoNotificationRepository` - Expo notifications implementasyonu

**Avantajlar**:
- Backend değişikliği kolay (sadece implementasyon değişir)
- Test edilebilirlik (mock repository'ler)
- Single Responsibility Principle

### 2. Dependency Injection Container

**Konum**: `src/di/container.ts`

```typescript
import { container } from './di/container';

// Repository al
const messageRepo = container.getMessageRepository();
const chatRepo = container.getChatRepository();
```

**Özellikler**:
- Singleton pattern
- Lazy initialization
- Test için mock injection desteği

### 3. Zustand State Management

**Konum**: `src/stores/`

#### Auth Store
```typescript
import { useAuthStore } from './stores/authStore';

const { user, isAuthenticated, login, logout } = useAuthStore();
```

**Özellikler**:
- Persist middleware (AsyncStorage)
- Type-safe
- Selective re-renders

#### Chat Store
```typescript
import { useChatStore } from './stores/chatStore';

const { messages, sendMessage, loadSession } = useChatStore();
```

**Özellikler**:
- Real-time state updates
- Error handling
- Loading states

### 4. Caching Layer

**Konum**: `src/repositories/cache/CacheManager.ts`

```typescript
import { CacheManager } from './repositories/cache/CacheManager';

// Cache'e kaydet (5 dakika TTL)
await CacheManager.set('key', data, 5 * 60 * 1000);

// Cache'den al
const data = await CacheManager.get('key');

// Cache'i temizle
await CacheManager.delete('key');
```

**Özellikler**:
- TTL (Time To Live) desteği
- AsyncStorage tabanlı
- Otomatik expiry kontrolü

### 5. Error Handling

**Konum**: `src/repositories/errors/RepositoryError.ts`

```typescript
import { RepositoryError } from './repositories/errors/RepositoryError';

try {
  // Repository işlemi
} catch (error) {
  const repoError = RepositoryError.fromError(error, 'Context');
  
  if (repoError.isNetworkError()) {
    // Network hatası
  }
  
  if (repoError.isAuthError()) {
    // Auth hatası
  }
  
  // Kullanıcı dostu mesaj
  const message = repoError.getUserFriendlyMessage();
}
```

**Özellikler**:
- Merkezi hata yönetimi
- Hata kategorileri (Network, Auth, Server, Client)
- Kullanıcı dostu mesajlar
- Logging entegrasyonu

## Kullanım Örnekleri

### Repository Kullanımı

```typescript
// Service'te repository kullanımı
export class ChatService {
  constructor(
    private messageRepo: IMessageRepository,
    private chatRepo: IChatRepository
  ) {}

  async sendMessage(content: string, userId: string) {
    // Repository üzerinden veri erişimi
    const messages = await this.messageRepo.findBySessionId(sessionId, userId);
    const aiResponse = await this.chatRepo.getAIResponse(messages);
    await this.messageRepo.save([userMessage, aiMessage], sessionId, userId);
  }
}
```

### Zustand Store Kullanımı

```typescript
// Component'te
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';

function ChatScreen() {
  const { user, isAuthenticated } = useAuthStore();
  const { messages, sendMessage, isLoading } = useChatStore();
  
  const handleSend = async () => {
    if (user) {
      await sendMessage('Hello', user.id);
    }
  };
}
```

### Caching Kullanımı

```typescript
// Repository'de otomatik cache
async findBySessionId(sessionId: string, userId: string) {
  // Cache kontrolü
  const cached = await CacheManager.get(`messages_${sessionId}_${userId}`);
  if (cached) return cached;
  
  // Veritabanından al
  const messages = await this.supabase.from('messages')...;
  
  // Cache'e kaydet
  await CacheManager.set(`messages_${sessionId}_${userId}`, messages, 5 * 60 * 1000);
  
  return messages;
}
```

## Test Stratejisi

### Repository Testleri

```typescript
// Mock repository ile test
const mockMessageRepo: jest.Mocked<IMessageRepository> = {
  findBySessionId: jest.fn(),
  save: jest.fn(),
  // ...
};

const chatService = new ChatService(mockMessageRepo, mockChatRepo);
```

### Store Testleri

```typescript
// Zustand store testleri
import { useAuthStore } from './stores/authStore';

test('login updates state', async () => {
  await useAuthStore.getState().login('email', 'password');
  expect(useAuthStore.getState().isAuthenticated).toBe(true);
});
```

## Gelecek İyileştirmeler

1. **Query Builder**: Repository'lerde daha gelişmiş query builder
2. **Offline Support**: Repository seviyesinde offline cache
3. **Real-time Updates**: Supabase realtime subscriptions
4. **Batch Operations**: Toplu işlemler için optimizasyon
5. **Metrics**: Repository performans metrikleri

## Dosya Yapısı

```
src/
├── repositories/
│   ├── interfaces/          # Repository interface'leri
│   ├── implementations/     # Supabase/Expo implementasyonları
│   ├── cache/              # Cache yönetimi
│   └── errors/             # Hata yönetimi
├── di/
│   └── container.ts        # DI Container
├── stores/                 # Zustand stores
│   ├── authStore.ts
│   └── chatStore.ts
└── services/               # Business logic
    ├── chatService.ts
    └── authService.ts
```

## Best Practices

1. **Repository Pattern**: Tüm veritabanı erişimleri repository üzerinden
2. **Dependency Injection**: Servisler constructor injection kullanır
3. **Error Handling**: RepositoryError kullan, generic Error değil
4. **Caching**: Sık kullanılan veriler için cache kullan
5. **State Management**: Global state için Zustand, local state için useState

