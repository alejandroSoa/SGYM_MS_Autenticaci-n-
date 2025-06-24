
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Role extends BaseModel {
  static table = 'role'
  
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string
}