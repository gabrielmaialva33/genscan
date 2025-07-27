import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'relationships'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table.uuid('person_id').references('id').inTable('people').notNullable().onDelete('CASCADE')
      table
        .uuid('related_person_id')
        .references('id')
        .inTable('people')
        .notNullable()
        .onDelete('CASCADE')
      table
        .enum('relationship_type', [
          'parent',
          'child',
          'spouse',
          'sibling',
          'grandparent',
          'grandchild',
          'uncle_aunt',
          'nephew_niece',
          'cousin',
        ])
        .notNullable()
      table
        .uuid('family_tree_id')
        .references('id')
        .inTable('family_trees')
        .notNullable()
        .onDelete('CASCADE')
      table.date('start_date').nullable()
      table.date('end_date').nullable()
      table.enum('status', ['active', 'ended', 'deceased']).defaultTo('active')
      table.text('notes').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      // Unique constraint to prevent duplicate relationships
      table.unique(['person_id', 'related_person_id', 'relationship_type', 'family_tree_id'])

      // Indexes
      table.index('family_tree_id')
      table.index('relationship_type')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
