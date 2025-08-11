import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import SoftDelete from '#models/Traits/soft_delete'

export default class JwtRefreshToken extends SoftDelete(BaseModel) {
   static table = 'jwt_refresh_tokens'
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tokenableId: number

  @column()
  declare type: string

  @column()
  declare name: string | null

  @column()
  declare hash: string

  @column()
  declare abilities: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare expiresAt: DateTime | null

  @column.dateTime()
  declare lastUsedAt: DateTime | null

    @column.dateTime({ serializeAs: null })
  declare deletedAt: DateTime | null
}