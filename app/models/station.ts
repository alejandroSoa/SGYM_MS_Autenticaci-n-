import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Station extends BaseModel {
  static table = 'stations'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare stationId: string

  @column()
  declare stationToken: string

  @column()
  declare type: 'entrada' | 'salida'

  @column()
  declare location: string

  @column()
  declare firmwareVersion: string

  @column()
  declare status: 'online' | 'offline' | 'standby'

  @column()
  declare userIn: number | null

  @column()
  declare lastActionStatus: 'denied' | 'granted' | null  

  @column.dateTime()
  declare lastPing: DateTime | null

  @column()
  declare hardwareId: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
