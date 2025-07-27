import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Person from '#models/person'
import FamilyTree from '#models/family_tree'
import FamilyTreeMember from '#models/family_tree_member'
import Relationship from '#models/relationship'
import User from '#models/user'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

interface FamilyChartData {
  id: string
  data: {
    'first name'?: string
    'fn'?: string
    'last name'?: string
    'ln'?: string
    'birthday'?: string
    'avatar'?: string
    'image'?: string
    'gender': 'M' | 'F' | 'O'
    'desc'?: string
    'label'?: string
  }
  rels: {
    spouses?: string[]
    father?: string
    mother?: string
    children?: string[]
  }
  main?: boolean
}

export default class FamilyChartExampleSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run() {
    // Check if example trees already exist
    const existingExample = await FamilyTree.query()
      .where('name', 'like', '%Family Chart Example%')
      .first()

    if (existingExample) {
      logger.info('Family chart examples already seeded, skipping...')
      return
    }

    // Get first user to be the owner
    const user = await User.query().orderBy('created_at', 'asc').first()
    if (!user) {
      logger.warn('No users found. Please run UserSeeder first.')
      return
    }

    // Create Basic Tree Example
    await this.createBasicTreeExample(user)

    // Create Aristotle Tree Example
    await this.createAristotleTreeExample(user)

    logger.debug('  ✓ Family chart example seeding completed!')
  }

  private async createBasicTreeExample(user: User) {
    logger.debug('  Creating Basic Family Chart Example...')

    // Create family tree
    const familyTree = await FamilyTree.create({
      name: 'Family Chart Example - Basic Tree',
      description: 'Example family tree from family-chart library basic tree demo',
      owner_id: user.id,
      privacy: 'public',
      settings: {
        theme: 'classic',
        default_layout: 'tree',
        show_photos: true,
        show_dates: true,
      },
      members_count: 0,
    })

    // Add owner as member
    await FamilyTreeMember.create({
      family_tree_id: familyTree.id,
      user_id: user.id,
      person_id: null,
      role: 'owner',
      invited_by: user.id,
      accepted_at: familyTree.created_at,
      invited_at: familyTree.created_at,
      permissions: {
        can_add_people: true,
        can_edit_people: true,
        can_delete_people: true,
        can_invite_members: true,
        can_export: true,
      },
    })

    // Basic tree data
    const basicTreeData: FamilyChartData[] = [
      {
        id: '0',
        rels: {
          spouses: ['8c92765f-92d3-4120-90dd-85a28302504c'],
          father: '0c09cfa0-5e7c-4073-8beb-94f6c69ada19',
          mother: '0fa5c6bc-5b58-40f5-a07e-d787e26d8b56',
          children: [
            'ce2fcb9a-6058-4326-b56a-aced35168561',
            'f626d086-e2d6-4722-b4f3-ca4f15b109ab',
          ],
        },
        data: {
          'first name': 'Agnus',
          'last name': '',
          'birthday': '1970',
          'avatar':
            'https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg',
          'gender': 'M',
        },
      },
      {
        id: '8c92765f-92d3-4120-90dd-85a28302504c',
        data: {
          'gender': 'F',
          'first name': 'Andrea',
          'last name': '',
          'birthday': '',
          'avatar': '',
        },
        rels: {
          spouses: ['0'],
          children: [
            'ce2fcb9a-6058-4326-b56a-aced35168561',
            'f626d086-e2d6-4722-b4f3-ca4f15b109ab',
          ],
          father: 'd8897e67-db7c-4b72-ae7c-69aae266b140',
          mother: '9397093b-30bb-420b-966f-62596b58447f',
        },
      },
      {
        id: '0c09cfa0-5e7c-4073-8beb-94f6c69ada19',
        data: {
          'gender': 'M',
          'first name': 'Zen',
          'last name': '',
          'birthday': '',
          'avatar': '',
        },
        rels: {
          children: ['0'],
          spouses: ['0fa5c6bc-5b58-40f5-a07e-d787e26d8b56'],
        },
      },
      {
        id: '0fa5c6bc-5b58-40f5-a07e-d787e26d8b56',
        data: {
          'gender': 'F',
          'first name': 'Zebra',
          'last name': '',
          'birthday': '',
          'avatar': '',
        },
        rels: {
          spouses: ['0c09cfa0-5e7c-4073-8beb-94f6c69ada19'],
          children: ['0'],
          father: '12a9bddf-855a-4583-a695-c73fa8c0e9b2',
          mother: 'bd56a527-b613-474d-9f38-fcac0aae218b',
        },
      },
      {
        id: 'ce2fcb9a-6058-4326-b56a-aced35168561',
        data: {
          'gender': 'M',
          'first name': 'Ben',
          'last name': '',
          'birthday': '',
          'avatar': '',
        },
        rels: {
          mother: '8c92765f-92d3-4120-90dd-85a28302504c',
          father: '0',
          spouses: ['b4e33c68-20a7-47ba-9dcc-1168a07d5b52'],
          children: [
            'eabd40c9-4518-4485-af5e-e4bc3ffd27fb',
            '240a3f71-c921-42d7-8a13-dec5e1acc4fd',
          ],
        },
      },
      {
        id: 'f626d086-e2d6-4722-b4f3-ca4f15b109ab',
        data: {
          'gender': 'F',
          'first name': 'Becky',
          'last name': '',
          'birthday': '',
          'avatar': '',
        },
        rels: {
          mother: '8c92765f-92d3-4120-90dd-85a28302504c',
          father: '0',
        },
      },
      {
        id: 'eabd40c9-4518-4485-af5e-e4bc3ffd27fb',
        data: {
          'gender': 'M',
          'first name': 'Carlos',
          'last name': '',
          'birthday': '',
          'avatar': '',
        },
        rels: {
          mother: 'b4e33c68-20a7-47ba-9dcc-1168a07d5b52',
          father: 'ce2fcb9a-6058-4326-b56a-aced35168561',
        },
      },
      {
        id: 'b4e33c68-20a7-47ba-9dcc-1168a07d5b52',
        data: {
          'gender': 'F',
          'first name': 'Branka',
          'last name': '',
          'birthday': '',
          'avatar': '',
        },
        rels: {
          spouses: ['ce2fcb9a-6058-4326-b56a-aced35168561'],
          children: [
            'eabd40c9-4518-4485-af5e-e4bc3ffd27fb',
            '240a3f71-c921-42d7-8a13-dec5e1acc4fd',
          ],
        },
      },
      {
        id: '240a3f71-c921-42d7-8a13-dec5e1acc4fd',
        data: {
          'gender': 'F',
          'first name': 'Carla',
          'last name': '',
          'birthday': '',
          'avatar': '',
        },
        rels: {
          mother: 'b4e33c68-20a7-47ba-9dcc-1168a07d5b52',
          father: 'ce2fcb9a-6058-4326-b56a-aced35168561',
        },
      },
      {
        id: '12a9bddf-855a-4583-a695-c73fa8c0e9b2',
        data: {
          'gender': 'M',
          'first name': 'Yvo',
          'last name': '',
          'birthday': '',
          'avatar': '',
        },
        rels: {
          children: ['0fa5c6bc-5b58-40f5-a07e-d787e26d8b56'],
          spouses: ['bd56a527-b613-474d-9f38-fcac0aae218b'],
        },
      },
      {
        id: 'bd56a527-b613-474d-9f38-fcac0aae218b',
        data: {
          'gender': 'F',
          'first name': 'Yva',
          'last name': '',
          'birthday': '',
          'avatar': '',
        },
        rels: {
          spouses: ['12a9bddf-855a-4583-a695-c73fa8c0e9b2'],
          children: ['0fa5c6bc-5b58-40f5-a07e-d787e26d8b56'],
        },
      },
      {
        id: 'd8897e67-db7c-4b72-ae7c-69aae266b140',
        data: {
          'gender': 'M',
          'first name': 'Zadro',
          'last name': '',
          'birthday': '',
          'avatar': '',
        },
        rels: {
          children: ['8c92765f-92d3-4120-90dd-85a28302504c'],
          spouses: ['9397093b-30bb-420b-966f-62596b58447f'],
        },
      },
      {
        id: '9397093b-30bb-420b-966f-62596b58447f',
        data: {
          'gender': 'F',
          'first name': 'Zadra',
          'last name': '',
          'birthday': '',
          'avatar': '',
        },
        rels: {
          spouses: ['d8897e67-db7c-4b72-ae7c-69aae266b140'],
          children: ['8c92765f-92d3-4120-90dd-85a28302504c'],
        },
      },
    ]

    // Create people and relationships
    await this.importFamilyChartData(basicTreeData, familyTree, user)

    logger.debug('  ✓ Basic Family Chart Example created')
  }

  private async createAristotleTreeExample(user: User) {
    logger.debug('  Creating Aristotle Family Chart Example...')

    // Create family tree
    const familyTree = await FamilyTree.create({
      name: 'Family Chart Example - Aristotle Tree',
      description:
        'Example family tree from family-chart library featuring Aristotle and his family',
      owner_id: user.id,
      privacy: 'public',
      settings: {
        theme: 'classic',
        default_layout: 'tree',
        show_photos: true,
        show_dates: true,
      },
      members_count: 0,
    })

    // Add owner as member
    await FamilyTreeMember.create({
      family_tree_id: familyTree.id,
      user_id: user.id,
      person_id: null,
      role: 'owner',
      invited_by: user.id,
      accepted_at: familyTree.created_at,
      invited_at: familyTree.created_at,
      permissions: {
        can_add_people: true,
        can_edit_people: true,
        can_delete_people: true,
        can_invite_members: true,
        can_export: true,
      },
    })

    // Aristotle tree data
    const aristotleTreeData: FamilyChartData[] = [
      {
        id: 'Q868',
        data: {
          fn: 'Aristotelis',
          ln: '',
          desc: 'ancient Greek philosopher',
          label: 'Aristotle',
          image:
            'https://upload.wikimedia.org/wikipedia/commons/a/ae/Aristotle_Altemps_Inv8575.jpg',
          gender: 'M',
        },
        rels: {
          father: 'Q3050463',
          spouses: ['Q462582', 'Q1987698'],
          children: ['Q2217419'],
          mother: '0.0930183100255757',
        },
        main: true,
      },
      {
        id: 'Q462582',
        data: {
          fn: 'Pythias',
          ln: '',
          desc: 'Greek biologist and embryologist',
          label: 'Pythias',
          image: '',
          gender: 'F',
        },
        rels: {
          father: 'Q948620',
          spouses: ['Q868'],
          children: [],
          mother: '0.7784747470919489',
        },
        main: false,
      },
      {
        id: 'Q2217419',
        data: {
          fn: 'Nicomachus',
          ln: '',
          desc: 'Ancient Greek philosopher, son of Aristotle',
          label: 'Nicomachus',
          image: '',
          gender: 'M',
        },
        rels: {
          father: 'Q868',
          mother: 'Q1987698',
          spouses: [],
          children: [],
        },
        main: false,
      },
      {
        id: 'Q3050463',
        data: {
          fn: 'Nicomachus',
          ln: '',
          desc: 'father of Aristotle',
          label: 'Nicomachus',
          image: '',
          gender: 'M',
        },
        rels: {
          spouses: ['0.0930183100255757'],
          children: ['Q868', 'Q4790690'],
        },
        main: false,
      },
      {
        id: 'Q1987698',
        data: {
          fn: 'Herpyllis',
          ln: '',
          desc: "Aristotle's lover",
          label: 'Herpyllis',
          image: '',
          gender: 'F',
        },
        rels: {
          spouses: ['Q868'],
          children: ['Q2217419'],
        },
        main: false,
      },
      {
        id: 'Q948620',
        data: {
          fn: 'Hermias',
          ln: 'of Atarneus',
          desc: "Aristotle's father in law",
          label: 'Hermias of Atarneus',
          image: '',
          gender: 'M',
        },
        rels: {
          spouses: ['0.7784747470919489'],
          children: ['Q462582'],
        },
        main: false,
      },
      {
        id: 'Q4790690',
        data: {
          fn: 'Arimneste',
          ln: '',
          desc: 'sister of Aristotle',
          label: 'Arimneste',
          image: '',
          gender: 'F',
        },
        rels: {
          father: 'Q3050463',
          spouses: [],
          children: [],
          mother: '0.0930183100255757',
        },
        main: false,
      },
      {
        id: '0.0930183100255757',
        rels: {
          spouses: ['Q3050463'],
          children: ['Q868', 'Q4790690'],
        },
        data: {
          gender: 'F',
          fn: 'Unknown',
          ln: '',
          desc: 'Mother of Aristotle',
          label: 'Mother of Aristotle',
          image: '',
        },
      },
      {
        id: '0.7784747470919489',
        rels: {
          spouses: ['Q948620'],
          children: ['Q462582'],
        },
        data: {
          gender: 'F',
          fn: 'Unknown',
          ln: '',
          desc: 'Mother of Pythias',
          label: 'Mother of Pythias',
          image: '',
        },
      },
    ]

    // Create people and relationships
    await this.importFamilyChartData(aristotleTreeData, familyTree, user)

    logger.debug('  ✓ Aristotle Family Chart Example created')
  }

  private async importFamilyChartData(data: FamilyChartData[], familyTree: FamilyTree, user: User) {
    // Map to store created people by their original IDs
    const peopleMap = new Map<string, Person>()

    // First pass: Create all people
    for (const node of data) {
      const firstName = node.data['first name'] || node.data.fn || 'Unknown'
      const lastName = node.data['last name'] || node.data.ln || ''
      const fullName = (node.data.label || `${firstName} ${lastName}`).trim()

      const birthDate = node.data.birthday
        ? DateTime.fromObject({ year: Number.parseInt(node.data.birthday) })
        : null

      const person = await Person.create({
        full_name: fullName,
        birth_date: birthDate,
        gender: node.data.gender,
        photo_url: node.data.avatar || node.data.image || null,
        notes: node.data.desc || null,
        created_by: user.id,
      })

      peopleMap.set(node.id, person)

      // If this is the main person, link them to the family tree owner
      if (node.main) {
        const ownerMember = await FamilyTreeMember.query()
          .where('family_tree_id', familyTree.id)
          .where('user_id', user.id)
          .where('role', 'owner')
          .first()

        if (ownerMember) {
          ownerMember.person_id = person.id
          await ownerMember.save()
        }
      }
    }

    // Second pass: Create relationships
    for (const node of data) {
      const person = peopleMap.get(node.id)
      if (!person) continue

      // Create parent relationships
      if (node.rels.father) {
        const father = peopleMap.get(node.rels.father)
        if (father) {
          // Father -> Child
          await Relationship.create({
            person_id: father.id,
            related_person_id: person.id,
            relationship_type: 'parent',
            family_tree_id: familyTree.id,
            status: 'active',
          })

          // Child -> Father
          await Relationship.create({
            person_id: person.id,
            related_person_id: father.id,
            relationship_type: 'child',
            family_tree_id: familyTree.id,
            status: 'active',
          })
        }
      }

      if (node.rels.mother) {
        const mother = peopleMap.get(node.rels.mother)
        if (mother) {
          // Mother -> Child
          await Relationship.create({
            person_id: mother.id,
            related_person_id: person.id,
            relationship_type: 'parent',
            family_tree_id: familyTree.id,
            status: 'active',
          })

          // Child -> Mother
          await Relationship.create({
            person_id: person.id,
            related_person_id: mother.id,
            relationship_type: 'child',
            family_tree_id: familyTree.id,
            status: 'active',
          })
        }
      }

      // Create spouse relationships
      if (node.rels.spouses) {
        for (const spouseId of node.rels.spouses) {
          const spouse = peopleMap.get(spouseId)
          if (spouse) {
            // Check if relationship already exists (avoid duplicates)
            const existing = await Relationship.query()
              .where('person_id', person.id)
              .where('related_person_id', spouse.id)
              .where('relationship_type', 'spouse')
              .where('family_tree_id', familyTree.id)
              .first()

            if (!existing) {
              await Relationship.create({
                person_id: person.id,
                related_person_id: spouse.id,
                relationship_type: 'spouse',
                family_tree_id: familyTree.id,
                status: 'active',
              })
            }
          }
        }
      }
    }

    // Update member count
    const memberCount = await FamilyTreeMember.query()
      .where('family_tree_id', familyTree.id)
      .count('* as total')

    familyTree.members_count = memberCount[0].$extras.total
    await familyTree.save()
  }
}
