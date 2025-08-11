import { DateTime } from 'luxon'
import { BaseModel, ModelQueryBuilder, column } from '@adonisjs/lucid/orm'

export default function SoftDelete<TBase extends typeof BaseModel>(Base: TBase) {
  return class SoftDeleteMixin extends Base {
    
    constructor(...args: any[]) {
  super(...args)
}

    @column.dateTime({ serializeAs: null })
    public deletedAt!: DateTime | null

    public static query(this: typeof BaseModel, ...args: any[]) {
      const builder = (super.query as any)(...args) as ModelQueryBuilder
      if (!(this as any)._withTrashed) {
        builder.whereNull(`${this.table}.deleted_at`)
      }
      return builder
    }

    public static withTrashed(this: typeof BaseModel) {
      (this as any)._withTrashed = true
      const query = this.query()
      delete (this as any)._withTrashed
      return query
    }

    public static onlyTrashed(this: typeof SoftDeleteMixin) {
      return this.withTrashed().whereNotNull(`${this.table}.deleted_at`)
    }

    public static withoutTrashed(this: typeof BaseModel) {
      return this.query().whereNull(`${this.table}.deleted_at`)
    }

    public async softDelete() {
      this.deletedAt = DateTime.now()
      await this.save()
    }

    public async restore() {
      this.deletedAt = null
      await this.save()
    }
  }
}
