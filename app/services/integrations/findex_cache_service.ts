import { inject } from '@adonisjs/core'
import redis from '@adonisjs/redis/services/main'
import { DateTime } from 'luxon'
import { createHash } from 'node:crypto'
import { FindexPersonResponse, FindexMotherSearchResponse } from '#interfaces/findex_interface'

@inject()
export default class FindexCacheService {
  private readonly CACHE_PREFIX = 'findex:cache'
  private readonly CPF_TTL = 30 * 24 * 60 * 60 // 30 days in seconds
  private readonly MOTHER_SEARCH_TTL = 7 * 24 * 60 * 60 // 7 days in seconds
  private readonly METRICS_TTL = 24 * 60 * 60 // 24 hours in seconds

  /**
   * Cache CPF search result
   */
  async cacheCPFData(cpf: string, data: FindexPersonResponse): Promise<void> {
    const key = this.CPF_KEY(cpf)
    const cacheData = {
      data,
      cached_at: DateTime.now().toISO(),
      ttl: this.CPF_TTL,
    }

    await redis.setex(key, this.CPF_TTL, JSON.stringify(cacheData))
    await this.incrementMetric('cpf_cached')
  }

  /**
   * Get cached CPF data
   */
  async getCachedCPFData(cpf: string): Promise<FindexPersonResponse | null> {
    const key = this.CPF_KEY(cpf)
    const cached = await redis.get(key)

    if (!cached) {
      await this.incrementMetric('cpf_cache_miss')
      return null
    }

    try {
      const cacheData = JSON.parse(cached)
      await this.incrementMetric('cpf_cache_hit')
      return cacheData.data
    } catch (error) {
      await redis.del(key)
      await this.incrementMetric('cpf_cache_error')
      return null
    }
  }

  /**
   * Cache mother name search results
   */
  async cacheMotherSearchData(
    motherName: string,
    data: FindexMotherSearchResponse[]
  ): Promise<void> {
    const key = this.MOTHER_SEARCH_KEY(motherName)
    const cacheData = {
      data,
      cached_at: DateTime.now().toISO(),
      ttl: this.MOTHER_SEARCH_TTL,
    }

    await redis.setex(key, this.MOTHER_SEARCH_TTL, JSON.stringify(cacheData))
    await this.incrementMetric('mother_search_cached')
  }

  /**
   * Cache father name search results
   */
  async cacheFatherSearchData(
    fatherName: string,
    data: FindexMotherSearchResponse[]
  ): Promise<void> {
    const key = this.FATHER_SEARCH_KEY(fatherName)
    const cacheData = {
      data,
      cached_at: DateTime.now().toISO(),
      ttl: this.MOTHER_SEARCH_TTL,
    }

    await redis.setex(key, this.MOTHER_SEARCH_TTL, JSON.stringify(cacheData))
    await this.incrementMetric('father_search_cached')
  }

  /**
   * Get cached mother search data
   */
  async getCachedMotherSearchData(
    motherName: string
  ): Promise<FindexMotherSearchResponse[] | null> {
    const key = this.MOTHER_SEARCH_KEY(motherName)
    const cached = await redis.get(key)

    if (!cached) {
      await this.incrementMetric('mother_search_cache_miss')
      return null
    }

    try {
      const cacheData = JSON.parse(cached)
      await this.incrementMetric('mother_search_cache_hit')
      return cacheData.data
    } catch (error) {
      await redis.del(key)
      await this.incrementMetric('mother_search_cache_error')
      return null
    }
  }

  /**
   * Get cached father search data
   */
  async getCachedFatherSearchData(fatherName: string): Promise<FindexMotherSearchResponse[] | null> {
    const key = this.FATHER_SEARCH_KEY(fatherName)
    const cached = await redis.get(key)

    if (!cached) {
      await this.incrementMetric('father_search_cache_miss')
      return null
    }

    try {
      const cacheData = JSON.parse(cached)
      await this.incrementMetric('father_search_cache_hit')
      return cacheData.data
    } catch (error) {
      await redis.del(key)
      await this.incrementMetric('father_search_cache_error')
      return null
    }
  }

  /**
   * Check if CPF is currently being processed (deduplication)
   */
  async isProcessing(cpf: string): Promise<boolean> {
    const key = this.PROCESSING_KEY(cpf)
    const isProcessing = await redis.get(key)
    return isProcessing === '1'
  }

  /**
   * Mark CPF as being processed
   */
  async markAsProcessing(cpf: string, ttl: number = 300): Promise<void> {
    const key = this.PROCESSING_KEY(cpf)
    await redis.setex(key, ttl, '1')
  }

  /**
   * Unmark CPF as being processed
   */
  async unmarkAsProcessing(cpf: string): Promise<void> {
    const key = this.PROCESSING_KEY(cpf)
    await redis.del(key)
  }

  /**
   * Cache warming for related CPFs
   */
  async warmCacheForRelatives(relatives: { CPF_VINCULO: string }[]): Promise<void> {
    for (const relative of relatives) {
      const cachedData = await this.getCachedCPFData(relative.CPF_VINCULO)
      if (!cachedData) {
        // Mark as priority for future caching
        await this.addToPriorityQueue(relative.CPF_VINCULO)
      }
    }
  }

  /**
   * Add CPF to priority queue for future processing
   */
  async addToPriorityQueue(cpf: string): Promise<void> {
    const key = this.PRIORITY_QUEUE_KEY()
    const score = DateTime.now().toUnixInteger()
    await redis.zadd(key, score, cpf)
  }

  /**
   * Get next CPF from priority queue
   */
  async getNextFromPriorityQueue(): Promise<string | null> {
    const key = this.PRIORITY_QUEUE_KEY()
    const result = await redis.zpopmin(key)
    return result.length > 0 ? result[1] : null
  }

  /**
   * Invalidate cache for specific CPF
   */
  async invalidateCPFCache(cpf: string): Promise<void> {
    const key = this.CPF_KEY(cpf)
    await redis.del(key)
    await this.incrementMetric('cpf_cache_invalidated')
  }

  /**
   * Invalidate mother search cache
   */
  async invalidateMotherSearchCache(motherName: string): Promise<void> {
    const key = this.MOTHER_SEARCH_KEY(motherName)
    await redis.del(key)
    await this.incrementMetric('mother_search_cache_invalidated')
  }

  /**
   * Invalidate father search cache
   */
  async invalidateFatherSearchCache(fatherName: string): Promise<void> {
    const key = this.FATHER_SEARCH_KEY(fatherName)
    await redis.del(key)
    await this.incrementMetric('father_search_cache_invalidated')
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    cpf_cache_hits: number
    cpf_cache_misses: number
    cpf_cached: number
    mother_search_hits: number
    mother_search_misses: number
    mother_search_cached: number
    father_search_hits: number
    father_search_misses: number
    father_search_cached: number
    cache_errors: number
    processing_locks: number
    priority_queue_size: number
  }> {
    const metrics = await Promise.all([
      this.getMetric('cpf_cache_hit'),
      this.getMetric('cpf_cache_miss'),
      this.getMetric('cpf_cached'),
      this.getMetric('mother_search_cache_hit'),
      this.getMetric('mother_search_cache_miss'),
      this.getMetric('mother_search_cached'),
      this.getMetric('father_search_cache_hit'),
      this.getMetric('father_search_cache_miss'),
      this.getMetric('father_search_cached'),
      this.getMetric('cpf_cache_error'),
      this.getMetric('mother_search_cache_error'),
      this.getMetric('father_search_cache_error'),
    ])

    const processingKeys = await redis.keys(`${this.CACHE_PREFIX}:processing:*`)
    const priorityQueueSize = await redis.zcard(this.PRIORITY_QUEUE_KEY())

    return {
      cpf_cache_hits: metrics[0],
      cpf_cache_misses: metrics[1],
      cpf_cached: metrics[2],
      mother_search_hits: metrics[3],
      mother_search_misses: metrics[4],
      mother_search_cached: metrics[5],
      father_search_hits: metrics[6],
      father_search_misses: metrics[7],
      father_search_cached: metrics[8],
      cache_errors: metrics[9] + metrics[10] + metrics[11],
      processing_locks: processingKeys.length,
      priority_queue_size: priorityQueueSize,
    }
  }

  /**
   * Clear all Findex cache
   */
  async clearAllCache(): Promise<void> {
    const pattern = `${this.CACHE_PREFIX}:*`
    const keys = await redis.keys(pattern)

    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }

  /**
   * Clean expired cache entries manually
   */
  async cleanExpiredEntries(): Promise<number> {
    let cleanedCount = 0

    // Clean CPF cache
    const cpfPattern = `${this.CACHE_PREFIX}:cpf:*`
    const cpfKeys = await redis.keys(cpfPattern)

    for (const key of cpfKeys) {
      const ttl = await redis.ttl(key)
      if (ttl <= 0) {
        await redis.del(key)
        cleanedCount++
      }
    }

    // Clean mother search cache
    const motherPattern = `${this.CACHE_PREFIX}:mother:*`
    const motherKeys = await redis.keys(motherPattern)

    for (const key of motherKeys) {
      const ttl = await redis.ttl(key)
      if (ttl <= 0) {
        await redis.del(key)
        cleanedCount++
      }
    }

    return cleanedCount
  }

  /**
   * Get cache hit rate
   */
  async getCacheHitRate(): Promise<{
    cpf_hit_rate: number
    mother_search_hit_rate: number
    father_search_hit_rate: number
    overall_hit_rate: number
  }> {
    const stats = await this.getCacheStats()

    const cpfHitRate =
      stats.cpf_cache_hits + stats.cpf_cache_misses > 0
        ? (stats.cpf_cache_hits / (stats.cpf_cache_hits + stats.cpf_cache_misses)) * 100
        : 0

    const motherHitRate =
      stats.mother_search_hits + stats.mother_search_misses > 0
        ? (stats.mother_search_hits / (stats.mother_search_hits + stats.mother_search_misses)) * 100
        : 0

    const fatherHitRate =
      stats.father_search_hits + stats.father_search_misses > 0
        ? (stats.father_search_hits / (stats.father_search_hits + stats.father_search_misses)) * 100
        : 0

    const totalHits = stats.cpf_cache_hits + stats.mother_search_hits + stats.father_search_hits
    const totalRequests = totalHits + stats.cpf_cache_misses + stats.mother_search_misses + stats.father_search_misses
    const overallHitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0

    return {
      cpf_hit_rate: Math.round(cpfHitRate * 100) / 100,
      mother_search_hit_rate: Math.round(motherHitRate * 100) / 100,
      father_search_hit_rate: Math.round(fatherHitRate * 100) / 100,
      overall_hit_rate: Math.round(overallHitRate * 100) / 100,
    }
  }

  /**
   * Increment metric counter
   */
  private async incrementMetric(metric: string): Promise<void> {
    const key = this.METRIC_KEY(metric)
    const currentCount = await redis.get(key)

    if (currentCount) {
      await redis.incr(key)
    } else {
      await redis.setex(key, this.METRICS_TTL, '1')
    }
  }

  /**
   * Get metric value
   */
  private async getMetric(metric: string): Promise<number> {
    const key = this.METRIC_KEY(metric)
    const value = await redis.get(key)
    return value ? Number.parseInt(value, 10) : 0
  }

  /**
   * Generate hash for mother name (for consistent caching)
   */
  private hashMotherName(motherName: string): string {
    return createHash('md5').update(motherName.trim().toUpperCase()).digest('hex')
  }

  /**
   * Cache key generators
   */
  private readonly CPF_KEY = (cpf: string) => `${this.CACHE_PREFIX}:cpf:${cpf.replace(/\D/g, '')}`

  private readonly MOTHER_SEARCH_KEY = (motherName: string) =>
    `${this.CACHE_PREFIX}:mother:${this.hashMotherName(motherName)}`

  private readonly FATHER_SEARCH_KEY = (fatherName: string) =>
    `${this.CACHE_PREFIX}:father:${this.hashMotherName(fatherName)}`

  private readonly PROCESSING_KEY = (cpf: string) =>
    `${this.CACHE_PREFIX}:processing:${cpf.replace(/\D/g, '')}`

  private readonly PRIORITY_QUEUE_KEY = () => `${this.CACHE_PREFIX}:priority_queue`

  private readonly METRIC_KEY = (metric: string) => `${this.CACHE_PREFIX}:metrics:${metric}`
}
