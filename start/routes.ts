/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/
//aaa

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
import AccessPaymentsController from '#controllers/access_payments_controller'
const UsersController = () => import('#controllers/users_controller')
const OauthController = () => import('#controllers/OAuth/auth_controller')
const StationsController = () => import('#controllers/station_controller')

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


router.group(() => {
  router.get('/stations', [StationsController, 'getAllStations']).use(middleware.auth())
  router.delete('/station', [StationsController, 'deleteStationByToken']).use(middleware.auth())

  // Servicio 1 - Asignar usuario a estación (Guardar ID en la estación)
  router.post('/station/assign-user', [StationsController, 'assignUserToStation']).use(middleware.auth())

  // Servicio 2 - Obtener detalles de estación (por stationToken)
  router.get('/station/details', [StationsController, 'getStationDetails']).use(middleware.auth())

  // Servicio 3 - Validar y actualizar estado del QR
  router.put('/users/:id/qr/status', [UsersController, 'updateQrStatus']).use(middleware.auth())

  // Servicio 4 - Ruta para obtener estaciones en standby
  router.get('/stations/standby',  [StationsController, 'getStationsInStandby']).use(middleware.auth())

  // Servicio 5 - Obtener ID del usuario en estación standby, Para luego ver perfil
  router.get('/stations/user-standby', [StationsController, 'getUserInStandby']).use(middleware.auth())

  // Ruta para editar estación existente
  router.put('/station', [StationsController, 'updateStation']).use(middleware.auth())

  // Servicio 6 - Liberar estación de standby (confirma usuario, libera estación)
  router.post('/stations/release-standby', [StationsController, 'releaseStationStandby']).use(middleware.auth())

  // Servicio 7 - Quemar/eliminar QR
  router.delete('/users/:id/qr', [UsersController, 'deleteQr']).use(middleware.auth())
  
  // Servicio 8 - Generar o devolver QR existente
  router.post('/users/:id/qr', [UsersController, 'generateOrGetQr']).use(middleware.auth())

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


router.post('/access/qr',
//Este servicio ya no se encargará de darle acceso directo al usuario al gimnasio.
//El control de acceso se basará en el estado del QR y el tipo de estación.
// -- Entradas:
//   - token_estacion (Para identificar y validar tipo de estación: entrada/salida)
//   - token_QR (Del usuario)

// CASO 1 - Si es para ENTRADA:
//     - Validar estación (Servicio 2 / Obtener detalles de estación).
//     - Confirmar que el QR esté en estado "GENERADO" (Servicio 3 / Validar QR).
//     - Cambiar el estado del QR a "ENTRADA_OK" (Servicio 3).
//     - Consumir Servicio 1 (Asignar usuario a la estación - standby).

// CASO 2 - Si es para SALIDA:
//     - Validar estación (Servicio 2 / Obtener detalles de estación).
//     - Confirmar que el QR esté en estado "ENTRADA_OK" (Servicio 3 / Validar QR).
//     - Cambiar el estado del QR a "SALIDA_OK" y quemarlo (Servicio 3 + Servicio 7).
//     - Consumir Servicio 1 (Asignar usuario a la estación - standby).

// Si fue exitoso en cualquiera de los casos, la estación quedará en standby
// con el usuario asignado, lista para liberar paso.
      
[UsersController, 'accessByQrI'])

// 9 - Ruta para obtener configuraciones necesarias para nueva estación
router.get('/station/configurations', [StationsController, 'getStationConfigurations'])

// 10 - Ruta para guardar nueva estación internamente
router.post('/station', [StationsController, 'createStation'])

// Ruta 11 - Verificar estado estación
router.post('/station/status', [StationsController, 'checkStationStatus'])

  // Ruta 12 - Obtener código de Arduino para nueva estación
  router.get('/station/arduino-code', [StationsController, 'getArduinoCode'])
  
// ----- Servicios Hechos -----
// 1 - Ruta para asignar usuario a estación (Guardar ID en la estación).
// 2 - Ruta para obtener detalles de estación (En base a token_estacion).
// 3 - Ruta para validar y actualizar estado de QR:
//       Estados: "GENERADO" -> "ENTRADA_OK" -> "SALIDA_OK" -> "Eliminado".
// 4 - Ruta para obtener estaciones en standby.
// 5 - Ruta para obtener detalles del usuario en estación standby.
// 6 - Ruta para liberar estación de standby (Confirma usuario, libera estación):
//       Este servicio consumirá Servicio 7.

// 7 - Ruta para quemar QR (/users/:id/qr).
// 8 - Ruta para generar QR:
//       - Si usuario está afuera: generar nuevo QR estado "GENERADO".
//       - Si usuario está adentro: devolver QR existente en estado "ENTRADA_OK".
// 9 - Ruta para obtener configuraciones necesarias para nueva estación.
// 10 - Ruta para guardar nueva estación internamente con:
//        stationId, stationToken, type, location, firmwareVersion,
//        status, userIn, lastPing, hardwareId.
//11 - Ruta para verificar el estado de la estacion mandando token

router.get('/access/app', [UsersController, 'accesApp']).use(middleware.auth())


router.post('/oauth/token/refresh', [UsersController, 'getrefresh'])



router.get('/oauth/access/payments', [AccessPaymentsController, 'acces']).use(middleware.auth())

router.get('/oauth/access/permissions', [AccessPaymentsController, 'hasPermission']).use(middleware.auth())
