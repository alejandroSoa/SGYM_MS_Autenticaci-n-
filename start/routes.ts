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
const OauthController = () => import('#controllers/OAuth/auth_controller')

router.get('/', async () => {
  return {
    hello: 'world',
  }
})
//Borrar
router.post('/users', [UsersController, 'crear'])


router.post('/access/refresh', [UsersController, 'refresh'])
router.post('/auth/logout', [UsersController, 'logout']).use(middleware.auth())

router.post('/auth/forgot-password', [UsersController, 'forgotPassword'])
router.post('/auth/reset-password', [UsersController, 'resetPassword'])
router.put('/auth/change-password', [UsersController, 'changePassword']).use(middleware.auth())

router.get('/users/:id/qr', [UsersController, 'getQr']).use(middleware.auth())
router.post('/users/:id/qr', [UsersController, 'generateQr']).use(middleware.auth())
router.delete('/users/:id/qr', [UsersController, 'deleteQr']).use(middleware.auth())

router.group(() => {
  router.get('/login', [OauthController, 'showLogin']).as('oauth.login')
  router.get('/register', [OauthController, 'showRegister']).as('oauth.register')
  router.get('/forgotpassword', [OauthController, 'showForgotPassword']).as('oauth.forgotpassword')
   router.get('/resetpassword', [OauthController, 'showResetPassword']).as('oauth.resetpassword')
    router.get('/registerprofile/:user_id', [OauthController, 'showRegisterProfile']).as('oauth.registerprofile')

  router.post('/login', [OauthController, 'login']).as('oauth.login.submit')
  router.post('/register', [OauthController, 'register']).as('oauth.register.submit')
  router.post('/resetpassword', [OauthController, 'resetPassword']).as('oauth.resetpassword.submit')
  router.post('/forgotpassword', [OauthController, 'forgotPassword']).as('oauth.forgotPassword.submit')
  router.post('/registerprofile/:user_id', [OauthController, 'registerProfile']).as('oauth.registerprofile.submit')
  
}).prefix('/oauth')


router.post('/access/qr', [UsersController, 'accessByQrI'])

router.get('/access/app', [UsersController, 'accesApp']).use(middleware.auth())


router.post('/oauth/token/refresh', [UsersController, 'getrefresh'])
