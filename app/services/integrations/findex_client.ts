import axios, { AxiosInstance, AxiosError } from 'axios'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import findexConfig from '#config/findex'
import {
  FindexPersonResponse,
  FindexMotherSearchResponse,
  isFindexPersonResponse,
  isFindexMotherSearchResponse,
  isFindexErrorResponse,
} from '#interfaces/findex_interface'

/**
 * Findex API client for fetching Brazilian genealogy data
 */
@inject()
export default class FindexClient {
  private client: AxiosInstance
  private requestCount: number = 0
  private lastRequestTime: number = 0

  constructor() {
    this.client = axios.create({
      baseURL: findexConfig.baseUrl,
      timeout: findexConfig.request.timeout,
      headers: {
        Use: `User-Agent: ${findexConfig.request.userAgent}`,
      },
    })

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Findex API request', {
          url: config.url,
          params: config.params,
        })
        return config
      },
      (error) => {
        logger.error('Findex API request error', error)
        return Promise.reject(error)
      }
    )

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Findex API response', {
          status: response.status,
          data: response.data,
        })
        return response
      },
      (error) => {
        logger.error('Findex API response error', {
          status: error.response?.status,
          data: error.response?.data,
        })
        return Promise.reject(error)
      }
    )
  }

  /**
   * Apply rate limiting
   */
  private async applyRateLimit(): Promise<void> {
    if (!findexConfig.rateLimit.enabled) return

    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    // Reset counter if more than a minute has passed
    if (timeSinceLastRequest > 60000) {
      this.requestCount = 0
    }

    // If we've hit the rate limit, wait
    if (this.requestCount >= findexConfig.rateLimit.maxRequestsPerMinute) {
      const waitTime = 60000 - timeSinceLastRequest
      if (waitTime > 0) {
        logger.info(`Rate limit reached. Waiting ${waitTime}ms`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        this.requestCount = 0
      }
    }

    this.requestCount++
    this.lastRequestTime = Date.now()
  }

  /**
   * Handle API errors
   */
  private handleError(error: AxiosError): never {
    if (error.response) {
      const data = error.response.data as any
      if (isFindexErrorResponse(data)) {
        throw new Error(`Findex API error: ${data.message || data.error}`)
      }
      throw new Error(`Findex API error: ${error.response.status} ${error.response.statusText}`)
    } else if (error.request) {
      throw new Error('Findex API: No response received')
    } else {
      throw new Error(`Findex API: ${error.message}`)
    }
  }

  /**
   * Retry logic for failed requests
   */
  private async retryRequest<T>(
    request: () => Promise<T>,
    retries: number = findexConfig.request.retries
  ): Promise<T> {
    try {
      return await request()
    } catch (error) {
      if (
        retries > 0 &&
        error instanceof AxiosError &&
        error.response?.status &&
        error.response.status >= 500
      ) {
        logger.warn(`Retrying request. Retries left: ${retries - 1}`)
        await new Promise((resolve) => setTimeout(resolve, findexConfig.request.retryDelay))
        return this.retryRequest(request, retries - 1)
      }
      throw error
    }
  }

  /**
   * Search person by CPF (national ID)
   */
  async searchByCPF(cpf: string): Promise<FindexPersonResponse> {
    // Remove non-numeric characters
    const cleanCPF = cpf.replace(/\D/g, '')

    if (cleanCPF.length !== 11) {
      throw new Error('Invalid CPF format. Must contain 11 digits.')
    }

    await this.applyRateLimit()

    return this.retryRequest(async () => {
      try {
        const response = await this.client.get('', {
          params: {
            token: findexConfig.tokens.cpf,
            cpf: cleanCPF,
          },
        })

        if (!isFindexPersonResponse(response.data)) {
          throw new Error('Invalid response format from Findex API')
        }

        return response.data
      } catch (error) {
        if (error instanceof AxiosError) {
          this.handleError(error)
        }
        throw error
      }
    })
  }

  /**
   * Search people by mother's name
   */
  async searchByMotherName(motherName: string): Promise<FindexMotherSearchResponse[]> {
    if (!motherName || motherName.trim().length < 3) {
      throw new Error('Mother name must have at least 3 characters')
    }

    await this.applyRateLimit()

    return this.retryRequest(async () => {
      try {
        const response = await this.client.get('', {
          params: {
            token: findexConfig.tokens.parent,
            mae: motherName.trim().toUpperCase(),
          },
        })

        if (!isFindexMotherSearchResponse(response.data)) {
          throw new Error('Invalid response format from Findex API')
        }

        return response.data
      } catch (error) {
        if (error instanceof AxiosError) {
          this.handleError(error)
        }
        throw error
      }
    })
  }

  /**
   * Validate CPF format
   */
  static isValidCPF(cpf: string): boolean {
    const cleanCPF = cpf.replace(/\D/g, '')

    if (cleanCPF.length !== 11) return false

    // Check if all digits are the same
    if (/^(\d)\1+$/.test(cleanCPF)) return false

    // Validate CPF algorithm
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += Number.parseInt(cleanCPF[i]) * (10 - i)
    }
    let remainder = (sum * 10) % 11
    if (remainder === 10) remainder = 0
    if (remainder !== Number.parseInt(cleanCPF[9])) return false

    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += Number.parseInt(cleanCPF[i]) * (11 - i)
    }
    remainder = (sum * 10) % 11
    if (remainder === 10) remainder = 0
    if (remainder !== Number.parseInt(cleanCPF[10])) return false

    return true
  }

  /**
   * Format CPF for display
   */
  static formatCPF(cpf: string): string {
    const cleanCPF = cpf.replace(/\D/g, '')
    if (cleanCPF.length !== 11) return cpf
    return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
}
