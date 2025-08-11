import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'


export default class AccessPaymentsController {
   public async acces({auth, response}: HttpContext) {
    const userAuth =  auth.user
    if (!userAuth) {
      return response.unauthorized({
        status: 'error',
        msg: 'Usuario no autenticado'
      })
    }
    const user = await User.find(userAuth.id)

    if (user) {
      await user.preload('role')
    }

   if (!user) {
     return response.notFound({
       status: 'error',
       msg: 'Usuario no encontrado'
     })
   }

   if (user.role.name == 'admin' || user.role.name == 'manager' || user.role.name == 'receptionist') {
    return response.ok({
        status: 'success',
        data: {
            path: 'dashboard/admin'
        },
        msg: 'acceso permitido'
    })
   }

   if (user.role.name == 'user') {
    return response.ok({
        status: 'success',
        data: {
            path: 'dashboard/user'
        },
        msg: 'acceso permitido'
    })

   }
   else {
    return response.forbidden({
        status: 'error',
        data: {
            path: 'dashboard/forbidden'
        },
        msg: 'acceso denegado'
    })
}
}
}