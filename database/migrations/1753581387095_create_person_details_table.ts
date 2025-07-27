import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'person_details'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table
        .uuid('person_id')
        .references('id')
        .inTable('people')
        .unique()
        .notNullable()
        .onDelete('CASCADE')
      table.jsonb('phone_numbers').nullable()
      table.jsonb('emails').nullable()
      table.jsonb('addresses').nullable()
      table.decimal('income', 10, 2).nullable()
      table.string('education_level', 100).nullable()
      table.string('marital_status', 50).nullable()
      table.string('blood_type', 10).nullable()
      table.jsonb('social_media').nullable()
      table.jsonb('documents').nullable()
      table.jsonb('api_data').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
