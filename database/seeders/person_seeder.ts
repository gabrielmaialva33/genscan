import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { PersonFactory } from '#database/factories/person_factory'
import { PersonDetailFactory } from '#database/factories/person_detail_factory'
import Person from '#models/person'
import FamilyTree from '#models/family_tree'
import FamilyTreeMember from '#models/family_tree_member'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

export default class PersonSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run() {
    // Check if people already exist
    const existingPeople = await Person.query().count('* as total')
    if (existingPeople[0].$extras.total > 0) {
      logger.info('People already seeded, skipping...')
      return
    }

    // Get all family trees
    const familyTrees = await FamilyTree.query().preload('owner').orderBy('created_at', 'asc')

    if (familyTrees.length === 0) {
      logger.warn('No family trees found. Please run FamilyTreeSeeder first.')
      return
    }

    // Create people for each family tree
    for (const tree of familyTrees) {
      logger.debug(`  Creating people for tree: ${tree.name}`)

      // Generate 4 generations
      const generations = await this.createGenerations(tree)

      // Link the tree owner to a person in the tree
      const ownerPerson = generations.parents[0]
      const ownerMember = await FamilyTreeMember.query()
        .where('family_tree_id', tree.id)
        .where('user_id', tree.owner_id)
        .where('role', 'owner')
        .first()

      if (ownerMember) {
        ownerMember.person_id = ownerPerson.id
        await ownerMember.save()
      }
    }

    logger.debug('  ✓ Person seeding completed!')
  }

  private async createGenerations(tree: FamilyTree) {
    const baseYear = 1920
    const createdBy = tree.owner_id

    // Generation 1: Great-grandparents (1920-1940)
    const greatGrandparents = {
      // Paternal great-grandparents
      paternalGreatGrandfather: await PersonFactory.merge({
        full_name: 'José Antônio Silva',
        birth_date: DateTime.fromObject({ year: baseYear + Math.floor(Math.random() * 10) }),
        gender: 'M',
        created_by: createdBy,
      })
        .apply('deceased')
        .create(),

      paternalGreatGrandmother: await PersonFactory.merge({
        full_name: 'Maria Clara Silva',
        birth_date: DateTime.fromObject({ year: baseYear + 2 + Math.floor(Math.random() * 10) }),
        gender: 'F',
        created_by: createdBy,
      })
        .apply('deceased')
        .create(),

      // Maternal great-grandparents
      maternalGreatGrandfather: await PersonFactory.merge({
        full_name: 'Francisco Santos',
        birth_date: DateTime.fromObject({ year: baseYear + Math.floor(Math.random() * 10) }),
        gender: 'M',
        created_by: createdBy,
      })
        .apply('deceased')
        .create(),

      maternalGreatGrandmother: await PersonFactory.merge({
        full_name: 'Ana Santos',
        birth_date: DateTime.fromObject({ year: baseYear + 2 + Math.floor(Math.random() * 10) }),
        gender: 'F',
        created_by: createdBy,
      })
        .apply('deceased')
        .create(),
    }

    // Generation 2: Grandparents (1945-1965)
    const grandparents = {
      // Paternal grandparents
      paternalGrandfather: await PersonFactory.merge({
        full_name: 'Carlos Eduardo Silva',
        birth_date: DateTime.fromObject({ year: 1945 + Math.floor(Math.random() * 10) }),
        gender: 'M',
        created_by: createdBy,
        mother_name: greatGrandparents.paternalGreatGrandmother.full_name,
        father_name: greatGrandparents.paternalGreatGrandfather.full_name,
      }).create(),

      paternalGrandmother: await PersonFactory.merge({
        full_name: 'Helena Maria Oliveira',
        birth_date: DateTime.fromObject({ year: 1947 + Math.floor(Math.random() * 10) }),
        gender: 'F',
        created_by: createdBy,
      }).create(),

      // Maternal grandparents
      maternalGrandfather: await PersonFactory.merge({
        full_name: 'Roberto Santos',
        birth_date: DateTime.fromObject({ year: 1946 + Math.floor(Math.random() * 10) }),
        gender: 'M',
        created_by: createdBy,
        mother_name: greatGrandparents.maternalGreatGrandmother.full_name,
        father_name: greatGrandparents.maternalGreatGrandfather.full_name,
      }).create(),

      maternalGrandmother: await PersonFactory.merge({
        full_name: 'Lucia Ferreira',
        birth_date: DateTime.fromObject({ year: 1948 + Math.floor(Math.random() * 10) }),
        gender: 'F',
        created_by: createdBy,
      }).create(),
    }

    // Generation 3: Parents and siblings (1970-1990)
    const parents = []
    const father = await PersonFactory.merge({
      full_name: 'Paulo Silva',
      birth_date: DateTime.fromObject({ year: 1970 + Math.floor(Math.random() * 10) }),
      gender: 'M',
      created_by: createdBy,
      mother_name: grandparents.paternalGrandmother.full_name,
      father_name: grandparents.paternalGrandfather.full_name,
    }).create()
    parents.push(father)

    const mother = await PersonFactory.merge({
      full_name: 'Patricia Santos',
      birth_date: DateTime.fromObject({ year: 1972 + Math.floor(Math.random() * 10) }),
      gender: 'F',
      created_by: createdBy,
      mother_name: grandparents.maternalGrandmother.full_name,
      father_name: grandparents.maternalGrandfather.full_name,
    }).create()
    parents.push(mother)

    // Create siblings for father
    const paternalUncle = await PersonFactory.merge({
      full_name: 'Ricardo Silva',
      birth_date: DateTime.fromObject({ year: 1968 + Math.floor(Math.random() * 10) }),
      gender: 'M',
      created_by: createdBy,
      mother_name: grandparents.paternalGrandmother.full_name,
      father_name: grandparents.paternalGrandfather.full_name,
    }).create()

    const paternalAunt = await PersonFactory.merge({
      full_name: 'Fernanda Silva',
      birth_date: DateTime.fromObject({ year: 1974 + Math.floor(Math.random() * 10) }),
      gender: 'F',
      created_by: createdBy,
      mother_name: grandparents.paternalGrandmother.full_name,
      father_name: grandparents.paternalGrandfather.full_name,
    }).create()

    // Generation 4: Children (1995-2015)
    const children = []
    const numChildren = Math.floor(Math.random() * 3) + 2 // 2-4 children

    for (let i = 0; i < numChildren; i++) {
      const gender = Math.random() > 0.5 ? 'M' : 'F'
      const firstName =
        gender === 'M'
          ? ['Lucas', 'Gabriel', 'Matheus', 'Pedro', 'Rafael'][i]
          : ['Julia', 'Sofia', 'Isabella', 'Laura', 'Ana'][i]

      const child = await PersonFactory.merge({
        full_name: `${firstName} Silva Santos`,
        birth_date: DateTime.fromObject({ year: 1995 + i * 3 + Math.floor(Math.random() * 3) }),
        gender: gender as 'M' | 'F',
        created_by: createdBy,
        mother_name: mother.full_name,
        father_name: father.full_name,
      }).create()

      children.push(child)

      // Create PersonDetail for some people
      if (Math.random() > 0.5) {
        await PersonDetailFactory.merge({
          person_id: child.id,
        }).create()
      }
    }

    // Generation 5: Grandchildren (2015-2025) - only if children are old enough
    const grandchildren = []
    const oldestChild = children[0]
    const childAge = DateTime.now().year - oldestChild.birth_date!.year

    if (childAge >= 25) {
      const numGrandchildren = Math.floor(Math.random() * 2) + 1 // 1-2 grandchildren

      for (let i = 0; i < numGrandchildren; i++) {
        const gender = Math.random() > 0.5 ? 'M' : 'F'
        const firstName =
          gender === 'M' ? ['Miguel', 'Arthur', 'Davi'][i] : ['Alice', 'Helena', 'Valentina'][i]

        const grandchild = await PersonFactory.merge({
          full_name: `${firstName} Silva`,
          birth_date: DateTime.fromObject({ year: 2015 + i * 2 + Math.floor(Math.random() * 3) }),
          gender: gender as 'M' | 'F',
          created_by: createdBy,
          mother_name: oldestChild.gender === 'F' ? oldestChild.full_name : 'Juliana Costa',
          father_name: oldestChild.gender === 'M' ? oldestChild.full_name : 'André Costa',
        })
          .apply('child')
          .create()

        grandchildren.push(grandchild)
      }
    }

    // Create PersonDetails for important family members
    await PersonDetailFactory.merge({
      person_id: father.id,
      income: 8500.0,
      education_level: 'master',
      marital_status: 'married',
    }).create()

    await PersonDetailFactory.merge({
      person_id: mother.id,
      income: 7200.0,
      education_level: 'bachelor',
      marital_status: 'married',
    }).create()

    logger.debug(`    ✓ Created ${Object.keys(greatGrandparents).length} great-grandparents`)
    logger.debug(`    ✓ Created ${Object.keys(grandparents).length} grandparents`)
    logger.debug(`    ✓ Created ${parents.length + 2} parents generation (including siblings)`)
    logger.debug(`    ✓ Created ${children.length} children`)
    if (grandchildren.length > 0) {
      logger.debug(`    ✓ Created ${grandchildren.length} grandchildren`)
    }

    return {
      greatGrandparents,
      grandparents,
      parents: [father, mother],
      unclesAunts: [paternalUncle, paternalAunt],
      children,
      grandchildren,
    }
  }
}
