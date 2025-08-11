import { DateTime } from 'luxon'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import hash from '@adonisjs/core/services/hash'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

import Role from './role.js'
import Profile from './profile.js'
import UserQrCode from './user_qr_code.js'

import Subscription from './subscription.js'

import Otp from './otp.js'
import SoftDelete from './Traits/soft_delete.js'


const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(SoftDelete(BaseModel), AuthFinder) {
  static table = 'user'

  @column({ isPrimary: true }) declare id: number
  @column() declare roleId: number
  @column() declare email: string
  @column() declare password: string
  @column() declare isActive: boolean
  @column() declare uuid: string
  @column.dateTime({ autoCreate: true }) declare lastAccess: DateTime

  static refreshTokens = DbAccessTokensProvider.forModel(User, {
    prefix: 'rt_',
    table: 'jwt_refresh_tokens',
    type: 'jwt_refresh_token',
    tokenSecretLength: 40,
  })

  @belongsTo(() => Role) declare role: BelongsTo<typeof Role>
  @hasMany(() => Profile) declare profiles: HasMany<typeof Profile>
  @hasMany(() => UserQrCode) declare qrCodes: HasMany<typeof UserQrCode>
@hasMany(() => Subscription) declare subscriptions: HasMany<typeof Subscription>
@hasMany(() => Otp) declare otps: HasMany<typeof Otp>

}
