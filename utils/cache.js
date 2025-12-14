/**
 * Simple in-memory cache with TTL support
 * For production, consider using Redis for persistence and scalability
 */

class SimpleCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultTTL = options.defaultTTL || 3600000; // 1 hour default
    this.maxSize = options.maxSize || 1000; // Maximum cache entries
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };

    // Clean up expired entries periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, options.cleanupInterval || 300000); // Every 5 minutes
  }

  /**
   * Generate a cache key from an object
   * @param {Object} obj - Object to create key from
   * @returns {string} - Cache key
   */
  static generateKey(obj) {
    // Sort keys and stringify for consistent key generation
    const sortedObj = Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        const value = obj[key];
        // Sort arrays for consistent keys
        acc[key] = Array.isArray(value) ? [...value].sort() : value;
        return acc;
      }, {});
    return JSON.stringify(sortedObj);
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in ms (optional)
   */
  set(key, value, ttl = this.defaultTTL) {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
      createdAt: Date.now()
    });

    this.stats.sets++;
  }

  /**
   * Check if a key exists and is valid
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }

  /**
   * Evict the oldest entry
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Cache] Cleaned up ${cleaned} expired entries`);
    }
  }

  /**
   * Destroy the cache (clear interval)
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

// Create cache instances for different purposes
const recipeCache = new SimpleCache({
  defaultTTL: 3600000,  // 1 hour - recipes don't change often
  maxSize: 500
});

const imageAnalysisCache = new SimpleCache({
  defaultTTL: 1800000,  // 30 minutes
  maxSize: 200
});

// Cache configuration
const CACHE_CONFIG = {
  RECIPE_TTL: 3600000,       // 1 hour
  IMAGE_ANALYSIS_TTL: 1800000, // 30 minutes
  CHAT_TTL: 300000,          // 5 minutes (chats are more dynamic)
};

/**
 * Pre-generated recipes pool for "Surprise Me" feature
 * These are cached recipes that can be served instantly
 */
const surpriseMePool = new SimpleCache({
  defaultTTL: 86400000,  // 24 hours
  maxSize: 50            // Keep 50 pre-generated recipes
});

/**
 * Add a recipe to the surprise pool
 */
const addToSurprisePool = (recipe) => {
  const key = `surprise-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  surpriseMePool.set(key, recipe);
};

/**
 * Get a random recipe from the surprise pool
 */
const getRandomFromPool = () => {
  const keys = Array.from(surpriseMePool.cache.keys());
  if (keys.length === 0) return null;
  
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  const recipe = surpriseMePool.get(randomKey);
  
  // Remove it so it's not served twice
  if (recipe) {
    surpriseMePool.delete(randomKey);
  }
  
  return recipe;
};

module.exports = {
  SimpleCache,
  recipeCache,
  imageAnalysisCache,
  surpriseMePool,
  addToSurprisePool,
  getRandomFromPool,
  CACHE_CONFIG
};

