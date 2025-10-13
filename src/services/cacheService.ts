// Serviço de cache inteligente usando IndexedDB
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CacheDB extends DBSchema {
  'cache-store': {
    key: string;
    value: {
      key: string;
      data: unknown;
      timestamp: number;
      expiresIn?: number;
    };
  };
}

class CacheService {
  private db: IDBPDatabase<CacheDB> | null = null;
  private readonly DB_NAME = 'secur-ai-cache';
  private readonly STORE_NAME = 'cache-store';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB<CacheDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('cache-store')) {
            db.createObjectStore('cache-store', { keyPath: 'key' });
          }
        },
      });
    } catch (error) {
      console.error('Erro ao inicializar cache:', error);
    }
  }

  async set(key: string, data: unknown, expiresInMs?: number): Promise<void> {
    await this.init();
    if (!this.db) return;

    try {
      await this.db.put(this.STORE_NAME, {
        key,
        data,
        timestamp: Date.now(),
        expiresIn: expiresInMs,
      });
    } catch (error) {
      console.error('Erro ao salvar no cache:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    await this.init();
    if (!this.db) return null;

    try {
      const entry = await this.db.get(this.STORE_NAME, key);
      
      if (!entry) return null;

      // Verificar expiração
      if (entry.expiresIn) {
        const age = Date.now() - entry.timestamp;
        if (age > entry.expiresIn) {
          await this.delete(key);
          return null;
        }
      }

      return entry.data as T;
    } catch (error) {
      console.error('Erro ao buscar do cache:', error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    try {
      await this.db.delete(this.STORE_NAME, key);
    } catch (error) {
      console.error('Erro ao deletar do cache:', error);
    }
  }

  async clear(): Promise<void> {
    await this.init();
    if (!this.db) return;

    try {
      await this.db.clear(this.STORE_NAME);
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }

  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  // Helper para cache com função de fallback
  async getOrSet<T>(
    key: string,
    fallbackFn: () => Promise<T>,
    expiresInMs?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const fresh = await fallbackFn();
    await this.set(key, fresh, expiresInMs);
    return fresh;
  }
}

export const cacheService = new CacheService();

// Constantes de tempo de expiração
export const CACHE_TTL = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;
