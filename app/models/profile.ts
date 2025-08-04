import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import User from './user.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Profile extends BaseModel {
   static table = 'profile'
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare fullName: string

  @column()
  declare phone: string | null

  @column.date()
  declare birthDate: DateTime

  @column()
  declare gender: 'M' | 'F' | 'Other'

  @column()
  declare photoUrl: string | null

@belongsTo(() => User)
public user!: BelongsTo<typeof User>

}
