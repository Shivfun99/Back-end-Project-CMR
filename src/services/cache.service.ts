import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

/**
 * CacheService provides an abstraction over our data storage.
 * It's designed to be "resilient": it tries to use Redis for production-grade caching,
 * but gracefully falls back to a simple In-Memory cache if Redis isn't configured.
 */
class CacheService {
  private redisClient: RedisClientType | null = null;
  private memoryCache: Map<string, { data: any; expiry: number }> = new Map();
  private readonly DEFAULT_TTL_SECONDS = 3600; // 1-hour expiration

  constructor() {
    this.initialize();
  }

  /**
   * Tries to establish a connection to Redis if a connection string is provided.
   */
  private async initialize() {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      console.info('🚀 [Cache] No REDIS_URL found. Operating in "In-Memory" mode.');
      return;
    }

    try {
      this.redisClient = createClient({ url: redisUrl });
      this.redisClient.on('error', (err) => console.error('❌ [Redis] Connection error:', err.message));
      
      await this.redisClient.connect();
      console.info('✅ [Cache] Connected to Redis successfully.');
    } catch (err) {
      console.warn('⚠️ [Cache] Redis connection failed. Falling back to local memory cache.');
      this.redisClient = null;
    }
  }

  /**
   * Retrieves an item from the cache.
   */
  async get(key: string): Promise<any> {
    // Attempt Redis first
    if (this.redisClient) {
      const data = await this.redisClient.get(key);
      return data ? JSON.parse(data) : null;
    }

    // Fallback to memory
    const entry = this.memoryCache.get(key);
    if (entry) {
      if (Date.now() < entry.expiry) {
        return entry.data;
      }
      // Clean up expired items
      this.memoryCache.delete(key);
    }
    return null;
  }

  /**
   * Stores an item in the cache with a time-to-live.
   */
  async set(key: string, value: any, ttl: number = this.DEFAULT_TTL_SECONDS): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.set(key, JSON.stringify(value), { EX: ttl });
      return;
    }

    this.memoryCache.set(key, {
      data: value,
      expiry: Date.now() + (ttl * 1000),
    });
  }

  /**
   * Removes a specific item from the cache (usually called on data updates).
   */
  async del(key: string): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.del(key);
      return;
    }
    this.memoryCache.delete(key);
  }

  /**
   * Clears the entire cache. Use with caution!
   */
  async flush(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.flushAll();
      return;
    }
    this.memoryCache.clear();
  }
}

export const cacheService = new CacheService();
