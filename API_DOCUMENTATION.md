# API Dokümantasyonu

## Edge Functions

### POST `/functions/v1/chat`

AI chat endpoint - OpenAI GPT-4o-mini ile sohbet.

#### Request

**Headers:**
```
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Merhaba, nasılsın?"
    }
  ],
  "model": "gpt-4o-mini" // Optional, default: "gpt-4o-mini"
}
```

**Request Limits:**
- Maximum 50 messages per request
- Rate limit: 30 requests/minute, 200 requests/hour per user

#### Response

**Success (200):**
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-4o-mini",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Merhaba! Ben iyiyim, teşekkür ederim. Sen nasılsın? 😊"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "error": "Invalid token"
}
```

**429 Too Many Requests:**
```json
{
  "error": "Rate limit exceeded. Maximum 30 requests per minute. Please wait 45 seconds.",
  "retryAfter": 45
}
```

**400 Bad Request:**
```json
{
  "error": "Messages array is required"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "status": 500
}
```

#### Response Headers

- `X-Cache`: `HIT` or `MISS` - Response caching status
- `Retry-After`: Seconds to wait (429 errors only)
- `Content-Security-Policy`: Security headers
- `X-Content-Type-Options`: `nosniff`
- `X-Frame-Options`: `DENY`
- `X-XSS-Protection`: `1; mode=block`

#### Rate Limiting

- **Per User:**
  - 30 requests per minute
  - 200 requests per hour
- **Response:** `429 Too Many Requests` with `Retry-After` header

#### Caching

- Responses are cached for 5 minutes
- Cache key based on last message content
- Cache hit indicated by `X-Cache: HIT` header

#### Example Usage

```typescript
const response = await fetch('https://your-project.supabase.co/functions/v1/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Hello!' }
    ],
    model: 'gpt-4o-mini'
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

---

## Supabase Database API

### Messages Table

**Table:** `messages`

**Columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `session_id` (uuid, foreign key to chat_sessions)
- `content` (text, encrypted)
- `role` (text: 'user' | 'assistant')
- `created_at` (timestamp)
- `timestamp` (timestamp)

**RLS Policies:**
- Users can only view/insert/update/delete their own messages

**Indexes:**
- `idx_messages_user_id_timestamp` (composite)
- `idx_messages_timestamp`
- `idx_messages_user_id`

### Chat Sessions Table

**Table:** `chat_sessions`

**Columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `title` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**RLS Policies:**
- Users can only view/insert/update/delete their own sessions

**Indexes:**
- `idx_chat_sessions_user_id_created_at` (composite)

### Premium Subscriptions Table

**Table:** `premium_subscriptions`

**Columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `product_id` (text)
- `purchase_token` (text)
- `is_active` (boolean)
- `expires_at` (timestamp, nullable)
- `created_at` (timestamp)

**RLS Policies:**
- Users can only view their own subscriptions

---

## Authentication API

### Sign In

**Endpoint:** `POST /auth/v1/token?grant_type=password`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### Sign Up

**Endpoint:** `POST /auth/v1/signup`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### Sign Out

**Endpoint:** `POST /auth/v1/logout`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `204 No Content`

---

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_INVALID_TOKEN` | Invalid or expired JWT token |
| `AUTH_SESSION_MISSING` | No active session found |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `VALIDATION_ERROR` | Request validation failed |
| `DATABASE_ERROR` | Database operation failed |
| `OPENAI_API_ERROR` | OpenAI API error |

---

## Rate Limiting Details

### Edge Function Rate Limits

- **Window:** 1 minute (rolling window)
- **Limit:** 30 requests per minute per user
- **Hourly Limit:** 200 requests per hour per user
- **Storage:** In-memory (production'da Redis önerilir)

### Rate Limit Headers

When rate limit is exceeded:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 45
Content-Type: application/json

{
  "error": "Rate limit exceeded. Maximum 30 requests per minute. Please wait 45 seconds.",
  "retryAfter": 45
}
```

---

## Security

### Authentication

- All API requests require valid JWT token
- Tokens expire after 1 hour
- Refresh tokens available for token renewal

### Encryption

- Messages are encrypted at rest (AES-256)
- Encryption keys stored securely (react-native-keychain)

### Headers

All responses include security headers:
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

---

**Son Güncelleme:** 2024-12-19
**API Version:** 1.0.0

