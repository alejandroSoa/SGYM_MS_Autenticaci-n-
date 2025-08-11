
import { BaseModel, column } from '@adonisjs/lucid/orm'
import SoftDelete from './Traits/soft_delete.js'

export default class Permission extends SoftDelete(BaseModel) {
    static table = 'permission'
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string | null

}
