import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Profile extends BaseModel {
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


}
