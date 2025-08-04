import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Subscription extends BaseModel {
   static table = 'subscription'
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare membershipId: number

  @column.date()
  declare startDate: DateTime

  @column.date()
  declare endDate: DateTime

  @column()
  declare status: 'active' | 'expired' | 'canceled'

  @column()
  declare isRenewable: boolean

  @column.date()
  declare canceledAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
