import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import Otp from '#models/otp'
import JwtRefreshToken from '#models/jwt_refresh_token'
import mail from '@adonisjs/mail/services/main'
import Profile from '#models/profile'
import { DateTime } from 'luxon'


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

  public async showRegisterProfile({ view, request, params }: HttpContext) {
  return view.render('oauth/registerprofile', {
    redirectUri: request.qs().redirect_uri || '',
    userId: params.user_id,
  })
}

  // ===================== REGISTRO =====================

  public async register({ request, view }: HttpContext) {
    const { email, password, redirect_uri } = request.only(['email', 'password', 'redirect_uri'])

    // Validar contraseña segura
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
    if (!passwordRegex.test(password)) {
      return view.render('oauth/register', {
        redirectUri: redirect_uri,
        error: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.',
        oldEmail: email,
      })
    }

    // Verificar si ya existe usuario con ese email
    const existingUser = await User.findBy('email', email)
    if (existingUser) {
      return view.render('oauth/register', {
        redirectUri: redirect_uri,
        error: 'El correo electrónico ya está registrado',
        oldEmail: email,
      })
    }

    // Crear usuario
    const user = await User.create({ email, password, roleId: 1 })
    

    return view.render('oauth/registerprofile', {
    redirectUri: request.qs().redirect_uri || '',
    userId: user.id,
  })
  }

  // ===================== LOGIN =====================

  public async login({ request, auth, response, view }: HttpContext) {
    const { email, password, redirect_uri } = request.only(['email', 'password', 'redirect_uri'])
    const user = await User.query().where('email', email).first()

    if (!user || !(await hash.use('scrypt').verify(user.password, password))) {
      return view.render('oauth/login', {
        redirectUri: redirect_uri,
        error: 'Credenciales inválidas',
        oldEmail: email,
      })
    }
    const refreshToken = await User.refreshTokens.create(user)
    const token = await auth.use('jwt').generate(user)
    const jwt = token as { token: string }
    let redirectUrl: URL
    try {
      redirectUrl = new URL(redirect_uri)
    } catch {
      return response.redirect('/oauth/login')
    }
    // Serializar el refreshToken completo como JSON
const refreshTokenEncoded = encodeURIComponent(JSON.stringify({
  identifier: refreshToken.identifier,
  tokenableId: refreshToken.tokenableId,
  hash: refreshToken.hash,
  createdAt: refreshToken.createdAt,
  updatedAt: refreshToken.updatedAt,
  expiresAt: refreshToken.expiresAt,
  abilities: refreshToken.abilities,
}))

    redirectUrl.searchParams.set('access_token', jwt.token)

    redirectUrl.searchParams.set('refresh_token', refreshTokenEncoded)
    
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

public async forgotPassword({ request, view }: HttpContext) {
  const { email, redirect_uri } = request.only(['email', 'redirect_uri'])

  if (!email) {
    return view.render('oauth/forgotpassword', {
      redirectUri: redirect_uri || '',
      error: 'Por favor, ingresa un correo electrónico.',
    })
  }

  const user = await User.findBy('email', email)

  if (!user) {
    return view.render('oauth/forgotpassword', {
      redirectUri: redirect_uri || '',
      error: 'El correo electrónico no está registrado en el sistema.',
      email, // para mantener el valor en el input
    })
  }

  // Generar token
  const token = Math.floor(10000 + Math.random() * 90000).toString()

  await Otp.create({
    userId: user.id,
    token,
    isActive: true,
  })

  // Enviar mail con el token
  await mail.send((message) => {
    message
      .to(email)
      .from('help@paginachidota.lat')
      .subject('Recupera tu contraseña')
      .text(`Tu token de recuperación es: ${token}`)
  })

  return view.render('oauth/resetpassword', {
    redirectUri: redirect_uri || '',
    email,
    info: 'Se ha enviado un código de recuperación a tu correo.',
  })
}



  // ===================== RESET PASSWORD =====================

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


public async registerProfile({ request, response, view, params, auth }: HttpContext) {
  const redirectUri = request.qs().redirect_uri || '/oauth/login'
  const userId = params.user_id

  const { full_name, phone, birth_date, gender } = request.only([
    'full_name',
    'phone',
    'birth_date',
    'gender',
  ])

  // Validar campos obligatorios
  if (!userId || !full_name || !birth_date || !gender) {
    return view.render('oauth/registerprofile', {
      redirectUri,
      error: 'Faltan campos obligatorios: nombre completo, fecha de nacimiento o género.',
      oldUserId: userId,
      oldFullName: full_name,
      oldPhone: phone,
      oldBirthDate: birth_date,
      oldGender: gender,
    })
  }

  // Validar fecha de nacimiento
  const birthDate = DateTime.fromISO(birth_date)
  if (!birthDate.isValid) {
    return view.render('oauth/registerprofile', {
      redirectUri,
      error: 'La fecha de nacimiento no es válida.',
      oldUserId: userId,
      oldFullName: full_name,
      oldPhone: phone,
      oldBirthDate: birth_date,
      oldGender: gender,
    })
  }

  // Validar teléfono si está presente
  if (phone && !/^\d{10}$/.test(phone)) {
    return view.render('oauth/registerprofile', {
      redirectUri,
      error: 'El teléfono debe tener 10 dígitos numéricos.',
      oldUserId: userId,
      oldFullName: full_name,
      oldPhone: phone,
      oldBirthDate: birth_date,
      oldGender: gender,
    })
  }

  try {
    const existingProfile = await Profile.findBy('user_id', userId)
if (existingProfile) {
  return view.render('oauth/registerprofile', {
    redirectUri,
    error: 'Ya existe un perfil para este usuario.',
    oldUserId: userId,
    oldFullName: full_name,
    oldPhone: phone,
    oldBirthDate: birth_date,
    oldGender: gender,
  })
}

    // Crear perfil
    const profile = new Profile()
    profile.userId = userId
    profile.fullName = full_name
    profile.phone = phone ?? null
    profile.birthDate = birthDate
    profile.gender = gender

    await profile.save()

    // Obtener usuario y generar token
    const user = await User.find(userId)
    if (!user) {
      return view.render('oauth/registerprofile', {
        redirectUri,
        error: 'No se encontró el usuario asociado.',
        oldUserId: userId,
        oldFullName: full_name,
        oldPhone: phone,
        oldBirthDate: birth_date,
        oldGender: gender,
      })
    }

    const token = await auth.use('jwt').generate(user)

    let redirectUrl: URL
    try {
      redirectUrl = new URL(redirectUri)
    } catch {
      return response.redirect('/oauth/login')
    }

    redirectUrl.searchParams.set('access_token', token.token)
    return response.redirect(redirectUrl.toString())
  } catch (error) {
    console.error(error)
    return view.render('oauth/registerprofile', {
      redirectUri,
      error: 'Ocurrió un error al crear el perfil. Intenta nuevamente.',
      oldUserId: userId,
      oldFullName: full_name,
      oldPhone: phone,
      oldBirthDate: birth_date,
      oldGender: gender,
    })
  }
}



}

