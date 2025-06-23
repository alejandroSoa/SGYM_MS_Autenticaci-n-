/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
const UsersController = () => import('#controllers/users_controller')

router.get('/', async () => {
  return {
    hello: 'world',
  }
})
//Borrar
router.post('/users', [UsersController, 'crear'])

router.post('/access/qr', [UsersController, 'accessByQr'])
router.post('/access/refresh', [UsersController, 'refresh'])
router.post('/auth/logout', [UsersController, 'logout']).use(middleware.auth())

router.post('/auth/forgot-password', [UsersController, 'forgotPassword'])
router.post('/auth/reset-password', [UsersController, 'resetPassword'])
router.put('/auth/change-password', [UsersController, 'changePassword']).use(middleware.auth())

router.get('/users/:id/qr', [UsersController, 'getQr']).use(middleware.auth())
router.post('/users/:id/qr', [UsersController, 'generateQr']).use(middleware.auth())
router.delete('/users/:id/qr', [UsersController, 'deleteQr']).use(middleware.auth())
