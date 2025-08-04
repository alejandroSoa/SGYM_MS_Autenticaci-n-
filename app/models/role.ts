
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import Permission from './permission.js'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'

export default class Role extends BaseModel {
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
public permissions!: ManyToMany<typeof Permission>

}