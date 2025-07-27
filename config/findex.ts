import env from '#start/env'

/**
 * Findex API configuration
 */
const findexConfig = {
  /**
   * API base URL
   */
  baseUrl: 'https://api.findexbuscas.com.br/api.php',

  /**
   * API tokens for different endpoints
   */
  tokens: {
    cpf: env.get('FINDEX_CPF_API_KEY'),
    parent: env.get('FINDEX_PARENT_API_KEY'),
  },

  /**
   * Request configuration
   */
  request: {
    /**
     * User agent header required by the API
     */
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',

    /**
     * Request timeout in milliseconds
     */
    timeout: 30000,

    /**
     * Number of retry attempts on failure
     */
    retries: 3,

    /**
     * Delay between retries in milliseconds
     */
    retryDelay: 1000,
  },

  /**
   * Rate limiting configuration
   */
  rateLimit: {
    /**
     * Maximum requests per minute
     */
    maxRequestsPerMinute: 60,

    /**
     * Enable rate limiting
     */
    enabled: true,
  },
}

export default findexConfig
