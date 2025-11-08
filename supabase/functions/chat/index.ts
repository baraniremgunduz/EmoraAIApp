import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Security headers
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; connect-src 'self' https://*.supabase.co https://api.openai.com",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
}

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxRequestsPerMinute: 30,
  maxRequestsPerHour: 200,
  windowMs: 60 * 1000, // 1 dakika
}

// In-memory rate limit store (production'da Redis kullanılmalı)
const rateLimitStore = new Map<string, { count: number; resetAt: number; hourlyCount: number; hourlyResetAt: number }>();

// Response cache (basit in-memory cache)
const responseCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika

// Rate limiting function
async function checkRateLimit(userId: string): Promise<{ allowed: boolean; error?: string; retryAfter?: number }> {
  const now = Date.now();
  const key = `rate_limit_${userId}`;
  const limit = rateLimitStore.get(key);

  // Yeni kullanıcı veya window sıfırlanmış
  if (!limit || now > limit.resetAt) {
    // Saatlik limit kontrolü
    if (!limit || now > limit.hourlyResetAt) {
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + RATE_LIMIT_CONFIG.windowMs,
        hourlyCount: 1,
        hourlyResetAt: now + (60 * 60 * 1000), // 1 saat
      });
      return { allowed: true };
    }

    // Dakikalık window sıfırlandı ama saatlik devam ediyor
    if (limit.hourlyCount >= RATE_LIMIT_CONFIG.maxRequestsPerHour) {
      const retryAfter = Math.ceil((limit.hourlyResetAt - now) / 1000);
      return {
        allowed: false,
        error: `Hourly rate limit exceeded. Please wait ${retryAfter} seconds.`,
        retryAfter,
      };
    }

    // Yeni dakikalık window başlat
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_CONFIG.windowMs,
      hourlyCount: limit.hourlyCount + 1,
      hourlyResetAt: limit.hourlyResetAt,
    });
    return { allowed: true };
  }

  // Dakikalık limit kontrolü
  if (limit.count >= RATE_LIMIT_CONFIG.maxRequestsPerMinute) {
    const retryAfter = Math.ceil((limit.resetAt - now) / 1000);
    return {
      allowed: false,
      error: `Rate limit exceeded. Maximum ${RATE_LIMIT_CONFIG.maxRequestsPerMinute} requests per minute. Please wait ${retryAfter} seconds.`,
      retryAfter,
    };
  }

  // Saatlik limit kontrolü
  if (limit.hourlyCount >= RATE_LIMIT_CONFIG.maxRequestsPerHour) {
    const retryAfter = Math.ceil((limit.hourlyResetAt - now) / 1000);
    return {
      allowed: false,
      error: `Hourly rate limit exceeded. Maximum ${RATE_LIMIT_CONFIG.maxRequestsPerHour} requests per hour. Please wait ${retryAfter} seconds.`,
      retryAfter,
    };
  }

  // Limit geçti, count'u artır
  limit.count++;
  limit.hourlyCount++;
  rateLimitStore.set(key, limit);

  return { allowed: true };
}

// Response caching
function getCacheKey(messages: any[]): string {
  // Son mesajı cache key olarak kullan (basit hash)
  const lastMessage = messages[messages.length - 1];
  return `cache_${lastMessage?.content?.substring(0, 50) || 'empty'}`;
}

function getCachedResponse(cacheKey: string): any | null {
  const cached = responseCache.get(cacheKey);
  if (!cached) return null;

  const now = Date.now();
  if (now > cached.timestamp + cached.ttl) {
    // Cache expired
    responseCache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

function setCachedResponse(cacheKey: string, data: any, ttl: number = CACHE_TTL): void {
  responseCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

// API key rotation support
function getOpenAIApiKey(): string {
  const primaryKey = Deno.env.get('OPENAI_API_KEY_PRIMARY');
  const secondaryKey = Deno.env.get('OPENAI_API_KEY_SECONDARY');
  const rotationDate = Deno.env.get('API_KEY_ROTATION_DATE'); // YYYY-MM-DD format

  // Rotation date varsa kontrol et
  if (rotationDate) {
    const rotation = new Date(rotationDate);
    const now = new Date();
    
    // Rotation tarihi geçtiyse secondary kullan
    if (now >= rotation) {
      return secondaryKey || primaryKey || Deno.env.get('OPENAI_API_KEY') || '';
    }
  }

  // Varsayılan olarak primary veya fallback
  return primaryKey || Deno.env.get('OPENAI_API_KEY') || '';
}

// OpenAI API çağrısı (fallback ile)
async function callOpenAIWithFallback(messages: any[], model: string): Promise<any> {
  const primaryKey = getOpenAIApiKey();
  const secondaryKey = Deno.env.get('OPENAI_API_KEY_SECONDARY');
  
  try {
    return await callOpenAI(messages, model, primaryKey);
  } catch (error: any) {
    // Primary key başarısız olursa ve secondary varsa dene
    if (error.status === 401 && secondaryKey) {
      console.log('Primary API key failed, trying secondary...');
      return await callOpenAI(messages, model, secondaryKey);
    }
    throw error;
  }
}

// OpenAI API çağrısı
async function callOpenAI(messages: any[], model: string, apiKey: string): Promise<any> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1500,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    const error: any = new Error('OpenAI API error');
    error.status = response.status;
    error.details = errorData;
    throw error;
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { ...corsHeaders, ...securityHeaders } 
    });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Backend rate limiting kontrolü
    const rateLimitCheck = await checkRateLimit(user.id);
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ 
          error: rateLimitCheck.error,
          retryAfter: rateLimitCheck.retryAfter,
        }),
        { 
          status: 429, // Too Many Requests
          headers: { 
            ...corsHeaders, 
            ...securityHeaders,
            'Content-Type': 'application/json',
            'Retry-After': rateLimitCheck.retryAfter?.toString() || '60',
          } 
        }
      );
    }

    // Parse request body
    const { messages, model = 'gpt-4o-mini' } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Input validation - mesaj sayısı kontrolü
    if (messages.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Too many messages in request. Maximum 50 messages allowed.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Response caching kontrolü (sadece son mesaj için)
    const cacheKey = getCacheKey(messages);
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      return new Response(
        JSON.stringify(cachedResponse),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            ...securityHeaders, 
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
          } 
        }
      );
    }

    // Call OpenAI API with fallback
    const openaiData = await callOpenAIWithFallback(messages, model);

    // Cache'e kaydet (sadece başarılı response'lar için)
    setCachedResponse(cacheKey, openaiData, CACHE_TTL);

    // Save conversation to Supabase (optional - error handling ile)
    try {
      const { error: insertError } = await supabaseClient
        .from('messages')
        .insert({
          user_id: user.id,
          role: 'assistant',
          content: openaiData.choices[0]?.message?.content || '',
          model: model,
          created_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Database insert error:', insertError)
        // Database hatası API response'u etkilememeli
      }
    } catch (dbError) {
      console.error('Database error:', dbError)
      // Database hatası API response'u etkilememeli
    }

    return new Response(
      JSON.stringify(openaiData),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          ...securityHeaders, 
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
        } 
      }
    )

  } catch (error: any) {
    console.error('Function error:', error)
    
    // Error response'da sensitive bilgi gösterme
    const errorMessage = error.status === 401 
      ? 'Authentication failed'
      : error.status === 429
      ? 'Rate limit exceeded'
      : 'Internal server error';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        status: error.status || 500,
      }),
      { 
        status: error.status || 500, 
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
