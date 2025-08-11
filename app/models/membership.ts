import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import SoftDelete from './Traits/soft_delete.js'

export default class Membership extends SoftDelete(BaseModel) {
   static table = 'membership'
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare durationDays: number

  @column()
  declare price: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
