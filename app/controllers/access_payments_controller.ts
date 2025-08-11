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

    public async hasPermission({ auth, response, request }: HttpContext) {
  const userAuth = auth.user
  const { page } = request.qs()

  if (!userAuth) {
    return response.unauthorized({
      status: 'error',
      msg: 'Usuario no autenticado'
    })
  }

  const user = await User.find(userAuth.id)
  if (!user) {
    return response.notFound({
      status: 'error',
      msg: 'Usuario no encontrado'
    })
  }

  await user.preload('role')

  // Permisos por rol
  const rolePermissions: Record<string, string[]> = {
    admin: [
      'dashboard/admin',
      'dashboard/admin/membership',
      'dashboard/admin/promotion',
      'dashboard/admin/subscription',
      'dashboard/admin/payment',
      'dashboard/admin/payment-method',
      'dashboard/admin',
      'main'
    ],
    manager: [
      'dashboard/admin',
      'dashboard/admin/membership',
      'dashboard/admin/promotion',
      'dashboard/admin/subscription',
      'dashboard/admin/payment',
      'dashboard/admin/payment-method',
      'dashboard/admin',
        'main'
    ],
    receptionist: [
      'dashboard/admin',
      'dashboard/admin/membership',
      'dashboard/admin/promotion',
      'dashboard/admin/subscription',
      'dashboard/admin/payment',
      'dashboard/admin/payment-method',
      'dashboard/admin',

        'main'
    ],
    user: [
      'dashboard/user',
      'user/manage-subscription'
    ]
  }
console.log('Checking permissions for page:', page)
  console.log('User role:', user.role.name)
  const roleName = user.role.name
  const allowedPages = rolePermissions[roleName] || []
  console.log('Allowed pages for role', roleName, ':', allowedPages)

  if (allowedPages.includes(page)) {
    return response.ok({
      status: 'success',
      data: null,
      msg: 'Permiso concedido'
    })
  }

  return response.forbidden({
    status: 'error',
    data: null,
    msg: 'No tienes permisos para acceder a esta página'
  })
}

}