import { errors, symbols } from '@adonisjs/auth'
import { AuthClientResponse, GuardContract } from '@adonisjs/auth/types'
import type { HttpContext } from '@adonisjs/core/http'
import jwt from 'jsonwebtoken'
import { JwtGuardOptions, JwtUserProviderContract } from './types.js'

export class JwtGuard<UserProvider extends JwtUserProviderContract<unknown>>
  implements GuardContract<UserProvider[typeof symbols.PROVIDER_REAL_USER]>
{
  /**
   * A list of events and their types emitted by
   * the guard.
   */
  declare [symbols.GUARD_KNOWN_EVENTS]: {}
  /**
   * A unique name for the guard driver
   */
  driverName: 'jwt' = 'jwt'
  /**
   * A flag to know if the authentication was an attempt
   * during the current HTTP request
   */
  authenticationAttempted: boolean = false
  /**
   * A boolean to know if the current request has
   * been authenticated
   */
  isAuthenticated: boolean = false
  /**
   * Reference to the currently authenticated user
   */
  user?: UserProvider[typeof symbols.PROVIDER_REAL_USER]
  #ctx: HttpContext
  #userProvider: UserProvider
  #options: JwtGuardOptions<UserProvider[typeof symbols.PROVIDER_REAL_USER]>

  constructor(
    ctx: HttpContext,
    userProvider: UserProvider,
    option: JwtGuardOptions<UserProvider[typeof symbols.PROVIDER_REAL_USER]>
  ) {
    this.#ctx = ctx
    this.#userProvider = userProvider
    this.#options = option
    if (!this.#options.content) this.#options.content = (user) => ({ userId: user.getId() })
  }

  /**
   * Generate a JWT token for a given user.
   */
  async generate(user: UserProvider[typeof symbols.PROVIDER_REAL_USER]) {
    const providerUser = await this.#userProvider.createUserForGuard(user)
    // @ts-ignore
    const token = jwt.sign(
      this.#options.content!(providerUser),
      this.#options.secret,
      this.#options.expiresIn
        ? {
            expiresIn: this.#options.expiresIn,
          }
        : {}
    )

    if (this.#options.useCookies) {
      return this.#ctx.response.cookie('token', token, {
        httpOnly: true,
      })
    }

    return {
      type: 'bearer',
      token: token,
      expiresIn: this.#options.expiresIn,
    }
  }

  /**
   * Authenticate the current HTTP request and return
   * the user instance if there is a valid JWT token
   * or throw an exception
   */
  async authenticate(): Promise<UserProvider[typeof symbols.PROVIDER_REAL_USER]> {
    /**
     * Avoid re-authentication when it has been done already
     * for the given request
     */
    if (this.authenticationAttempted) {
      return this.getUserOrFail()
    }
    this.authenticationAttempted = true

    const cookieHeader = this.#ctx.request.request.headers.cookie
    let token

    /**
     * If cookies are enabled, then read the token from the cookies
     */
    if (cookieHeader) {
      token =
        this.#ctx.request.cookie('token') ??
        (this.#ctx.request.request.headers.cookie!.match(/token=(.*?)(;|$)/) || [])[1]
    }

    /**
     * If token is missing on cookies, then try to read it from the header authorization
     */
    if (!token) {
      /**
       * Ensure the auth header exists
       */
      const authHeader = this.#ctx.request.header('authorization')
      if (!authHeader) {
        const message = this.#ctx.i18n?.t('errors.unauthorized_access') || 'Unauthorized access'
        throw new errors.E_UNAUTHORIZED_ACCESS(message, {
          guardDriverName: this.driverName,
        })
      }

      /**
       * Split the header value and read the token from it
       */
      ;[, token] = authHeader!.split('Bearer ')
      if (!token) {
        const message = this.#ctx.i18n?.t('errors.unauthorized_access') || 'Unauthorized access'
        throw new errors.E_UNAUTHORIZED_ACCESS(message, {
          guardDriverName: this.driverName,
        })
      }
    }

    /**
     * Verify token
     */
    let payload

    try {
      payload = jwt.verify(token, this.#options.secret)
    } catch (error) {
      const message = this.#ctx.i18n?.t('errors.unauthorized_access') || 'Unauthorized access'
      throw new errors.E_UNAUTHORIZED_ACCESS(message, {
        guardDriverName: this.driverName,
      })
    }

    if (typeof payload !== 'object' || !('userId' in payload)) {
      const message = this.#ctx.i18n?.t('errors.unauthorized_access') || 'Unauthorized access'
      throw new errors.E_UNAUTHORIZED_ACCESS(message, {
        guardDriverName: this.driverName,
      })
    }

    /**
     * Fetch the user by user ID and save a reference to it
     */
    const providerUser = await this.#userProvider.findById(payload.userId)
    if (!providerUser) {
      const message = this.#ctx.i18n?.t('errors.unauthorized_access') || 'Unauthorized access'
      throw new errors.E_UNAUTHORIZED_ACCESS(message, {
        guardDriverName: this.driverName,
      })
    }

    this.isAuthenticated = true
    this.user = providerUser.getOriginal()
    return this.getUserOrFail()
  }

  /**
   * Same as authenticate, but does not throw an exception
   */
  async check(): Promise<boolean> {
    try {
      await this.authenticate()
      return true
    } catch {
      return false
    }
  }

  /**
   * Returns the authenticated user or throws an error
   */
  getUserOrFail(): UserProvider[typeof symbols.PROVIDER_REAL_USER] {
    if (!this.user) {
      const message = this.#ctx.i18n?.t('errors.unauthorized_access') || 'Unauthorized access'
      throw new errors.E_UNAUTHORIZED_ACCESS(message, {
        guardDriverName: this.driverName,
      })
    }

    return this.user
  }

  /**
   * This method is called by Japa during testing when "loginAs"
   * method is used to login the user.
   */
  async authenticateAsClient(
    user: UserProvider[typeof symbols.PROVIDER_REAL_USER]
  ): Promise<AuthClientResponse> {
    const providerUser = await this.#userProvider.createUserForGuard(user)
    // @ts-ignore
    const token = jwt.sign(
      this.#options.content!(providerUser),
      this.#options.secret,
      this.#options.expiresIn
        ? {
            expiresIn: this.#options.expiresIn,
          }
        : {}
    )

    return {
      headers: {
        authorization: `Bearer ${token}`,
      },
    }
  }
}
