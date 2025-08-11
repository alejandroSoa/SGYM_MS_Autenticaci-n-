
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import Permission from './permission.js'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import SoftDelete from './Traits/soft_delete.js'

export default class Role extends SoftDelete(BaseModel) {
  static table = 'role'
  
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string

    @manyToMany(() => Permission, {
  pivotTable: 'role_permission',
})
public permission!: ManyToMany<typeof Permission>

}