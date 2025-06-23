import { BaseModel, column, beforeSave } from '@adonisjs/lucid/orm'

export default class Otp extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare token: string

  @column({ columnName: 'is_active' })
  declare isActive: boolean

  @beforeSave()
  public static async deactivatePreviousOtps(otp: Otp) {
    if (otp.userId && otp.isActive) {
      await Otp.query()
        .where('user_id', otp.userId)
        .andWhere('is_active', true)
        .whereNot('id', otp.id ?? 0)
        .update({ isActive: false })
    }
  }
}