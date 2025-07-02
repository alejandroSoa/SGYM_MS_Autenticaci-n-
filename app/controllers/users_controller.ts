import { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import UserQrCode from '#models/user_qr_code'
import QRCode from 'qrcode'
import { v4 as uuidv4 } from 'uuid'
import mail from '@adonisjs/mail/services/main'
import Otp from '#models/otp'
import Role from '#models/role'
import JwtRefreshToken from '#models/jwt_refresh_token'
import Subscription from '#models/subscription'
import Membership from '#models/membership'
import { DateTime } from 'luxon'


export default class UsersController {
  public async accessByQr({ request, auth, response }: HttpContext) {
    const { email, password } = request.all()
    let user: User

    try {
        user = await User.verifyCredentials(email, password)
    } catch {
        return response.unauthorized({
            status: 'error',
            data: {},
            msg: 'Credenciales incorrectas.',
        })
    }

   

    try {
      const refreshToken = await User.refreshTokens.create(user)
      const accessToken = await auth.use('jwt').generate(user)
      const jwt = accessToken as { token: string }
      return response.ok({
          status: 'success',
          data: {
            access_token: jwt.token,
            refreshToken: refreshToken
          },
          msg: 'Tokens generados correctamente.',
      })
    } catch {
      
    }
  }


  public async accessByQrI({ request, response }: HttpContext) {
  try {
    const { qr_token } = request.only(['qr_token'])
    console.log('[INFO] QR Token recibido:', qr_token)

    if (!qr_token) {
      console.warn('[WARN] Token QR no proporcionado')
      return response.badRequest({
        status: 'error',
        data: {},
        msg: 'Token QR requerido.',
      })
    }

    const userQrCode = await UserQrCode.findBy('qrToken', qr_token)
    console.log('[INFO] Resultado de UserQrCode:', userQrCode)

    if (!userQrCode) {
      console.warn('[WARN] QR inválido o no registrado')
      return response.status(404).json({
        status: 'error',
        data: {},
        msg: 'QR inválido o no registrado.',
      })
    }

    const user = await User.find(userQrCode.userId)
    console.log('[INFO] Usuario encontrado:', user)

    if (!user) {
      console.warn('[WARN] Usuario no encontrado con ID:', userQrCode.userId)
      return response.status(404).json({
        status: 'error',
        data: {},
        msg: 'Usuario no encontrado.',
      })
    }

    if (!user.isActive) {
      console.warn('[WARN] Usuario inactivo:', user.id)
      return response.status(403).json({
        status: 'error',
        data: {
          user_id: user.id,
        },
        msg: 'Usuario inactivo. Contacte a recepción.',
      })
    }

    const subscription = await Subscription.query()
      .where('user_id', user.id)
      .andWhere('status', 'active')
      .first()

    console.log('[INFO] Suscripción activa encontrada:', subscription)

    if (!subscription) {
      const expiredSubscription = await Subscription.query()
        .where('user_id', user.id)
        .orderBy('end_date', 'desc')
        .first()

      console.warn('[WARN] No hay suscripción activa. Última suscripción encontrada:', expiredSubscription)

      return response.status(403).json({
        status: 'error',
        data: {
          user_id: user.id,
          subscription_status: expiredSubscription?.status || 'none',
        },
        msg: 'Suscripción expirada. No se permite el acceso.',
      })
    }

    const membership = await Membership.find(subscription.membershipId)
    console.log('[INFO] Membresía encontrada:', membership)

    if (!membership) {
      console.error('[ERROR] Membresía no encontrada con ID:', subscription.membershipId)
      return response.status(500).json({
        status: 'error',
        data: {},
        msg: 'Error inesperado del servidor',
      })
    }

    const accessTime = DateTime.now()
    console.log('[INFO] Acceso autorizado en:', accessTime.toISO())

    return response.ok({
      status: 'success',
      data: {
        user_id: user.id,
        email: user.email,
        subscription_status: subscription.status,
        membership: membership.name,
        valid_until: subscription.endDate.toISODate(),
        access_time: accessTime.toISO(),
      },
      msg: `Acceso permitido. Bienvenido ${user.email}.`,
    })
  } catch (error) {
    console.error('[ERROR] Excepción atrapada en accessByQrI:', error)
    return response.status(500).json({
      status: 'error',
      data: {},
      msg: 'Error inesperado del servidor',
    })
  }
}





  public async refresh({auth, response}: HttpContext) {
    const user = await auth.use('jwt').authenticateWithRefreshToken()
    const newRefreshToken = user.currentToken
    const newToken = await auth.use('jwt').generate(user)

    return response.ok({
      status: 'success',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
      msg: 'Token refrescado correctamente'
    })
  }

  //Borrar después de pruebas
  public async crear({request, response}: HttpContext) {
    const { email, password, role_id } = request.all()
    const newUser = await User.create({
        roleId: role_id,
        email: email,
        password: password,
        isActive: true
    })
    return response.created(newUser)
  }

  public async logout({auth, response}: HttpContext) {
      try {
        const user = await auth.authenticate()
        await JwtRefreshToken.query().where('tokenable_id', user.id).delete()
        return response.ok({
          status: 'success',
          data: {},
          msg: 'Sesión cerrada correctamente'
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

  public async forgotPassword({request, response}: HttpContext) {
    const { email } = request.only(['email'])

    const user = await User.findBy('email', email)

    if(!user) {
        return response.notFound({
            status: 'error',
            data: {
                email:email
            },
            msg: 'El correo electrónico no está registrado en el sistema.',
        })
    }

    const token = Math.floor(10000 + Math.random() * 90000).toString()
    await Otp.create({
      userId: user.id,
      token: token,
      isActive: true
    })

    await mail.send((message) => {
      message
        .to(email)
        .from('help@paginachidota.lat')
        .subject('Recupera tu contraseña')
        .text(`Tu token de recuperación es: ${token}`)
    })

    return response.ok({
        status: 'success',
        data: {
            email: email
        },
        msg: 'Se ha enviado un enlace de recuperación a su correo electrónico.',
    })
  }

  public async resetPassword({request, response}: HttpContext) {
    const { email, token, password, password_confirmation } = request.only(['email', 'token', 'password', 'password_confirmation'])

    const user = await User.findBy('email', email)

    if(!user) {
        return response.notFound({
            status: 'error',
            data: {
                email:email
            },
            msg: 'No se encontró un usuario con el correo proporcionado.',
        })
    }

    const verifyToken = await Otp.query()
      .where('token', token)
      .andWhere('user_id', user.id)
      .andWhere('is_active', true)
      .first()

    if(!verifyToken) {
      return response.notFound({
          status: 'error',
          data: {
              email:email
          },
          msg: 'El token proporcionado no es correcto.',
      })
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
    if (!passwordRegex.test(password)) {
        return response.badRequest({
            status: 'error',
            data: {},
            msg: 'La nueva contraseña no cumple con los requisitos de seguridad.',
        })
    }

    if (password !== password_confirmation) {
        return response.badRequest({
            status: 'error',
            data: {},
            msg: 'Las contraseñas no coinciden.',
        })
    }

    verifyToken.isActive = false
    await verifyToken.save()
    user.password = password
    await user.save()

    return response.ok({
        status: 'success',
        data: {
            email:email
        },
        msg: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.',
    })

  }

  public async changePassword({request, response, auth}: HttpContext) {
    const { current_password, new_password, new_password_confirmation } = request.only(['current_password', 'new_password', 'new_password_confirmation'])

    const user = await auth.authenticate()
    const updateUser = await User.find(user.id)

    if (!updateUser) {
        return response.notFound({
            status: 'error',
            data: {},
            msg: 'Usuario no encontrado',
        })
    }

    // Verifica credenciales
    try {
        await User.verifyCredentials(user.email, current_password)
    } catch {
        return response.unauthorized({
            status: 'error',
            data: {},
            msg: 'La contraseña actual es incorrecta.',
        })
    }

    // Validación de contraseña
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
    if (!passwordRegex.test(new_password)) {
        return response.badRequest({
            status: 'error',
            data: {},
            msg: 'La nueva contraseña no cumple con los requisitos de seguridad.',
        })
    }

    if (new_password !== new_password_confirmation) {
        return response.badRequest({
            status: 'error',
            data: {},
            msg: 'La confirmación de la nueva contraseña no coincide.',
        })
    }

    // Guardado
    updateUser.password = new_password
    await updateUser.save()

    return response.ok({
        status: 'success',
        data: {},
        msg: 'Contraseña actualizada correctamente.',
    })
  }

  public async generateQr({ params, response, auth }: HttpContext) {
    const userId = Number(params.id)
    const requester = await auth.authenticate()

    const user = await User.find(userId)
    if (!user) {
      return response.notFound({
        status: 'error',
        data: {},
        msg: 'Usuario no encontrado.'
      })
    }

    const role = await Role.find(requester.id)

    if (
      !['admin', 'receptionist'].includes(role?.name ?? '') &&
      requester.id !== user.id
    ) {
      return response.forbidden({
        status: 'error',
        data: {},
        msg: 'No tiene permisos para realizar esta acción.',
      })
    }

    const token = uuidv4()

    const qrData = await QRCode.toDataURL(token)

    const qr = await UserQrCode.firstOrNew({ userId: user.id })
    qr.qrToken = token
    await qr.save()

    return response.created({
      status: 'success',
      data: {
        user_id: user.id,
        qr_token: qr.qrToken,
        qr_image_base64: qrData
      },
      msg: 'Código QR generado exitosamente.'
    })
  }

  public async getQr({ params, response, auth }: HttpContext) {
    const userId = Number(params.id)
    const requester = await auth.authenticate()

    const user = await User.find(userId)
    if (!user) {
      return response.notFound({
        status: 'error',
        data: {},
        msg: 'Usuario no encontrado.',
      })
    }

    const role = await Role.find(requester.id)

    if (
      !['admin', 'receptionist'].includes(role?.name ?? '') &&
      requester.id !== user.id
    ) {
      return response.forbidden({
        status: 'error',
        data: {},
        msg: 'No tiene permisos para realizar esta acción.',
      })
    }

    const qrRecord = await UserQrCode.findBy('userId', userId)
    if (!qrRecord?.qrToken) {
      return response.notFound({
        status: 'error',
        data: {},
        msg: 'Código QR no encontrado para el usuario.',
      })
    }

    const qrData = await QRCode.toDataURL(qrRecord.qrToken)

    return response.ok({
      status: 'success',
      data: {
        user_id: userId,
        qr_token: qrRecord.qrToken,
        qr_image_base64: qrData,
      },
      msg: 'Código QR obtenido correctamente.',
    })
  }

  public async deleteQr({ params, response, auth }: HttpContext) {
    const user = await User.find(params.id)
    const requester = await auth.authenticate()

    if(!user) {
        return response.notFound({
            status: 'error',
            data: {},
            msg: 'Usuario no encontrado',
        })
    }

    const role = await Role.find(requester.id)

    if (!['admin', 'receptionist'].includes(role?.name ?? '')) {
      return response.forbidden({
        status: 'error',
        data: {},
        msg: 'No tiene permisos para realizar esta acción.',
      })
    }

    const qrUser = await UserQrCode.findBy('userId', params.id)

    if(!qrUser) {
      return response.notFound({
      status: 'error',
      data: {},
      msg: 'Código QR no encontrado para el usuario.',
      })
    }

    await qrUser.delete()

    return response.ok({
      status: 'success',
      data: {
          user_id: qrUser.userId,
      },
      msg: 'Código QR eliminado correctamente.',
    })
  }

 public async accesApp({ response, auth, request }: HttpContext) {
  // Autenticar y obtener al usuario del token
  await auth.use('jwt').authenticate()
  const tokenUser = auth.user!

  // Buscar al usuario directamente desde la BD por si hubo cambios
  const user = await User.find(tokenUser.id)

  // Si el usuario no existe (fue eliminado o desactivado)
  if (!user) {
    return response.unauthorized({
      status: 'error',
      data: {},
      msg: 'Usuario no encontrado en la base de datos.',
    })
  }

  // Preload del rol actualizado
  await user.preload('role')

  // Obtener el valor de la app desde query params o default a AppWeb
  const app = request.qs().app || 'AppWeb'

  // Roles con acceso solo a AppDesktop
  if ([1, 2, 3, 4, 6].includes(user.role.id) && app === 'AppDesktop') {
    return response.ok({
      status: 'success',
      data: {},
      msg: 'Acceso concedido a AppDesktop.',
    })
  }

  // Rol 5 (cliente) tiene acceso solo a AppWeb o AppMovil
  if (user.role.id === 5 && (app === 'AppWeb' || app === 'AppMovil')) {
    return response.ok({
      status: 'success',
      data: {},
      msg: 'Acceso concedido a AppMovil o AppWeb.',
    })
  }

  // Si ninguna condición se cumple, denegar acceso
  return response.unauthorized({
    status: 'error',
    data: {},
    msg: 'Acceso denegado.',
  })
}



}