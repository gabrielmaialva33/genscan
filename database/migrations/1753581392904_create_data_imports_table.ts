import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'data_imports'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table.integer('user_id').references('id').inTable('users').notNullable()
      table.uuid('family_tree_id').references('id').inTable('family_trees').notNullable()
      table.enum('import_type', ['national_id', 'mother_name', 'manual', 'csv']).notNullable()
      table.string('search_value', 255).notNullable()
      table.jsonb('api_request').nullable()
      table.jsonb('api_response').nullable()
      table.integer('persons_created').defaultTo(0).notNullable()
      table.integer('relationships_created').defaultTo(0).notNullable()
      table.integer('persons_updated').defaultTo(0).notNullable()
      table.integer('duplicates_found').defaultTo(0).notNullable()
      table
        .enum('status', ['pending', 'processing', 'success', 'partial', 'failed'])
        .defaultTo('pending')
      table.text('error_message').nullable()
      table.jsonb('import_summary').nullable()
      table.timestamp('started_at', { useTz: true }).nullable()
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      // Indexes
      table.index('user_id')
      table.index('family_tree_id')
      table.index('status')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
