import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import UserQrCode from '#models/user_qr_code'
import QRCode from 'qrcode'
import { v4 as uuidv4 } from 'uuid'
import mail from '@adonisjs/mail/services/main'

export default class UsersController {
  public async accessByQr({ request, auth }: HttpContext) {
    const { email, password } = request.all()
    const user = await User.verifyCredentials(email, password)

    // to generate a token
    return await auth.use('jwt').generate(user)
  }

  //Borrar después de pruebas
  public async crear({request, response}: HttpContext) {
    const { email, password } = request.all()
    const newUser = await User.create({
        roleId: 1,
        email: email,
        password: password,
        isActive: true
    })
    return response.created(newUser)
  }

  //Ajustar para revocar tokens
  public async logout() {
    
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

  //Falta validar el token generado en forgotPassword
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

  public async generateQr({ params, response }: HttpContext) {
    const userId = Number(params.id)

    const user = await User.find(userId)
    if (!user) {
      return response.notFound({
        status: 'error',
        data: {},
        msg: 'Usuario no encontrado.'
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

  public async getQr({ params, response }: HttpContext) {
    const userId = Number(params.id)

    const user = await User.find(userId)
    if (!user) {
      return response.notFound({
        status: 'error',
        data: {},
        msg: 'Usuario no encontrado.',
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

  public async deleteQr({ params, response }: HttpContext) {
    const qrUser = await UserQrCode.findBy('userId', params.id)
    const user = await User.find(params.id)

    if(user) {
        if (qrUser) {
            await qrUser.delete()

            return response.ok({
            status: 'success',
            data: {
                user_id: qrUser.userId,
            },
            msg: 'Código QR eliminado correctamente.',
            })
        } else {
            return response.notFound({
            status: 'error',
            data: {},
            msg: 'Código QR no encontrado para el usuario.',
            })
        }
    } else {
        return response.notFound({
            status: 'error',
            data: {},
            msg: 'Usuario no encontrado',
        })
    }
  }
}