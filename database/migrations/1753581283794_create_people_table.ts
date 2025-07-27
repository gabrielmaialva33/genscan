import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'people'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table.string('national_id', 20).nullable().unique()
      table.string('full_name', 255).notNullable()
      table.date('birth_date').nullable()
      table.date('death_date').nullable()
      table.enum('gender', ['M', 'F', 'O']).nullable()
      table.string('birth_place', 255).nullable()
      table.string('death_place', 255).nullable()
      table.string('occupation', 255).nullable()
      table.text('notes').nullable()
      table.string('photo_url', 500).nullable()
      table.integer('created_by').references('id').inTable('users').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.timestamp('deleted_at', { useTz: true }).nullable()

      // Indexes
      table.index('national_id')
      table.index('full_name')
      table.index('created_by')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
