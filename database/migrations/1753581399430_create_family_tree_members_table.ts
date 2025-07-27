import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'family_tree_members'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table
        .uuid('family_tree_id')
        .references('id')
        .inTable('family_trees')
        .notNullable()
        .onDelete('CASCADE')
      table.integer('user_id').references('id').inTable('users').notNullable().onDelete('CASCADE')
      table.uuid('person_id').references('id').inTable('people').nullable().onDelete('SET NULL')
      table.enum('role', ['owner', 'admin', 'editor', 'viewer']).defaultTo('viewer').notNullable()
      table.integer('invited_by').references('id').inTable('users').notNullable()
      table.string('invitation_token', 255).nullable()
      table.timestamp('invited_at', { useTz: true }).notNullable()
      table.timestamp('accepted_at', { useTz: true }).nullable()
      table.timestamp('last_accessed_at', { useTz: true }).nullable()
      table.jsonb('permissions').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      // Unique constraint
      table.unique(['family_tree_id', 'user_id'])

      // Indexes
      table.index('user_id')
      table.index('invitation_token')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
