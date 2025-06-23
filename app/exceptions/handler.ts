import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: any, ctx: HttpContext) {
    if (error.status === 401) {
      console.log(error)
      // Verifica si el error es por expiración de token
      if (
        error.message?.toLowerCase().includes('expired') ||
        error.code === 'E_JWT_EXPIRED' || // depende de la librería
        error.name === 'TokenExpiredError'
      ) {
        return ctx.response.unauthorized({
          status: 'error',
          data: {},
          msg: 'El token ha expirado. Por favor, inicia sesión de nuevo.',
        })
      }

      // Token inválido o no proporcionado
      return ctx.response.unauthorized({
        status: 'error',
        data: {},
        msg: 'Token de acceso inválido, no proporcionado o expirado.',
      })
    }
    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
