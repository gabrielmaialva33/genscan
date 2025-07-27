import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'family_trees'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table.string('name', 255).notNullable()
      table.text('description').nullable()
      table.integer('owner_id').references('id').inTable('users').notNullable()
      table.enum('privacy', ['private', 'public', 'family']).defaultTo('private').notNullable()
      table.jsonb('settings').nullable()
      table.string('cover_image_url', 500).nullable()
      table.integer('members_count').defaultTo(0).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.timestamp('deleted_at', { useTz: true }).nullable()

      // Indexes
      table.index('owner_id')
      table.index('privacy')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
