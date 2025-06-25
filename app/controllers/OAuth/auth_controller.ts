import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import Otp from '#models/otp'
import JwtRefreshToken from '#models/jwt_refresh_token'
import mail from '@adonisjs/mail/services/main'

export default class AuthController {
  // ===================== VISTAS =====================

  public async showLogin({ view, request }: HttpContext) {
    return view.render('oauth/login', {
      redirectUri: request.qs().redirect_uri || '',
    })
  }

  public async showRegister({ view, request }: HttpContext) {
    return view.render('oauth/register', {
      redirectUri: request.qs().redirect_uri || '',
    })
  }

  public async showForgotPassword({ view, request }: HttpContext) {
    return view.render('oauth/forgotpassword', {
      redirectUri: request.qs().redirect_uri || '',
    })
  }

  public async showResetPassword({ view, request }: HttpContext) {
    return view.render('oauth/resetpassword', {
      redirectUri: request.qs().redirect_uri || '',
    })
  }

  // ===================== REGISTRO =====================

 public async register({ request, auth, response, view }: HttpContext) {
  const { email, password, redirect_uri } = request.only(['email', 'password', 'redirect_uri'])

  // Buscar si ya existe un usuario con ese email
  const existingUser = await User.findBy('email', email)

  if (existingUser) {
    // Usuario ya existe, regresar a la vista con error y conservar email
    return view.render('oauth/register', {
      redirectUri: redirect_uri,
      error: 'El correo electrónico ya está registrado',
      oldEmail: email,
    })
  }

  // Si no existe, crear usuario
  const user = await User.create({ email, password, roleId: 1 })
  const token = await auth.use('jwt').generate(user)

  let redirectUrl: URL
  try {
    redirectUrl = new URL(redirect_uri)
  } catch {
    return response.redirect('/oauth/login')
  }

  redirectUrl.searchParams.set('access_token', token.token)
  return response.redirect(redirectUrl.toString())
}


  // ===================== LOGIN =====================

  public async login({ request, auth, response, view }: HttpContext) {
    const { email, password, redirect_uri } = request.only(['email', 'password', 'redirect_uri'])
    const user = await User.query().where('email', email).first()

    if (!user || !(await hash.use('scrypt').verify(user.password, password))) {
      return view.render('oauth/login', {
        redirectUri: request.input('redirect_uri'),
        error: 'Credenciales inválidas',
        // puedes enviar también el email para no hacerlo escribir de nuevo:
        oldEmail: email,
      })
    }

    const token = await auth.use('jwt').generate(user)

  let redirectUrl: URL
  try {
    redirectUrl = new URL(redirect_uri)
  } catch {
    return response.redirect('/oauth/login')
  }

  redirectUrl.searchParams.set('access_token', token.token)
  return response.redirect(redirectUrl.toString())
  }

  // ===================== REFRESH =====================

  public async refresh({ auth, response }: HttpContext) {
    const user = await auth.use('jwt').authenticateWithRefreshToken()
    const newRefreshToken = user.currentToken
    const newToken = await auth.use('jwt').generate(user)

    return response.ok({
      status: 'success',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
      msg: 'Token refrescado correctamente',
    })
  }

  // ===================== LOGOUT =====================

  public async logout({ auth, response }: HttpContext) {
    try {
      const user = await auth.authenticate()
      await JwtRefreshToken.query().where('tokenable_id', user.id).delete()
      return response.ok({
        status: 'success',
        data: {},
        msg: 'Sesión cerrada correctamente',
      })
    } catch (error) {
      return response.internalServerError({
        status: 'error',
        data: {},
        msg: 'No se pudo cerrar la sesión. Intenta de nuevo.',
        error: error.message,
      })
    }
  }

  // ===================== FORGOT PASSWORD =====================

  public async forgotPassword({ request, response, view }: HttpContext) {
    const { email, redirect_uri } = request.only(['email', 'redirect_uri'])
    const user = await User.findBy('email', email)

    if (!user) {
      return response.notFound({
        status: 'error',
        data: { email },
        msg: 'El correo electrónico no está registrado en el sistema.',
      })
    }

    const token = Math.floor(10000 + Math.random() * 90000).toString()

    await Otp.create({
      userId: user.id,
      token,
      isActive: true,
    })

    await mail.send((message) => {
      message
        .to(email)
        .from('help@paginachidota.lat')
        .subject('Recupera tu contraseña')
        .text(`Tu token de recuperación es: ${token}`)
    })

    return view.render('oauth/resetpassword', {
      redirectUri: redirect_uri || '',
    })
  }



  public async resetPassword({ request, auth, response, view }: HttpContext) {
  const {
    email,
    token,
    password,
    password_confirmation,
    redirect_uri,
  } = request.only([
    'email',
    'token',
    'password',
    'password_confirmation',
    'redirect_uri',
  ])

  const oldInputs = { email, token, redirectUri: redirect_uri }

  const user = await User.findBy('email', email)
  if (!user) {
    return view.render('oauth/resetpassword', {
      error: 'No se encontró un usuario con el correo proporcionado.',
      ...oldInputs,
    })
  }

  const verifyToken = await Otp.query()
    .where('token', token)
    .andWhere('user_id', user.id)
    .andWhere('is_active', true)
    .first()

  if (!verifyToken) {
    return view.render('oauth/resetpassword', {
      error: 'El token proporcionado no es correcto.',
      ...oldInputs,
    })
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
  if (!passwordRegex.test(password)) {
    return view.render('oauth/resetpassword', {
      error: 'La nueva contraseña no cumple con los requisitos de seguridad.',
      ...oldInputs,
    })
  }

  if (password !== password_confirmation) {
    return view.render('oauth/resetpassword', {
      error: 'Las contraseñas no coinciden.',
      ...oldInputs,
    })
  }

  verifyToken.isActive = false
  await verifyToken.save()
  user.password = password
  await user.save()

  const newToken = await auth.use('jwt').generate(user)

  
  let redirectUrl: URL
  try {
    redirectUrl = new URL(redirect_uri)
  } catch {
    return response.redirect('/oauth/login')
  }

  redirectUrl.searchParams.set('access_token', newToken.token)
  return response.redirect(redirectUrl.toString())
}
}
