import { DateTime } from 'luxon'
import factory from '@adonisjs/lucid/factories'

import DataImport from '#models/data_import'

export const DataImportFactory = factory
  .define(DataImport, async ({ faker }) => {
    const importType = faker.helpers.arrayElement([
      'national_id',
      'mother_name',
      'manual',
      'csv',
    ]) as 'national_id' | 'mother_name' | 'manual' | 'csv'
    const status = faker.helpers.arrayElement([
      'pending',
      'processing',
      'success',
      'partial',
      'failed',
    ]) as 'pending' | 'processing' | 'success' | 'partial' | 'failed'

    let searchValue = ''
    if (importType === 'national_id') {
      searchValue = faker.string.numeric(11)
    } else if (importType === 'mother_name') {
      searchValue = faker.person.fullName()
    } else if (importType === 'csv') {
      searchValue = faker.system.fileName({ extensionCount: 1 })
    } else {
      searchValue = 'manual import'
    }

    const personsCreated = status === 'success' ? faker.number.int({ min: 1, max: 20 }) : 0
    const relationshipsCreated = status === 'success' ? faker.number.int({ min: 0, max: 30 }) : 0
    const personsUpdated = status === 'success' ? faker.number.int({ min: 0, max: 10 }) : 0
    const duplicatesFound = faker.number.int({ min: 0, max: 5 })

    return {
      user_id: faker.number.int({ min: 1, max: 1000 }),
      family_tree_id: faker.string.uuid(),
      import_type: importType,
      search_value: searchValue,
      api_request:
        importType === 'national_id' || importType === 'mother_name'
          ? {
              search_type: importType,
              value: searchValue,
              timestamp: DateTime.now().toISO(),
            }
          : null,
      api_response:
        status === 'success' && (importType === 'national_id' || importType === 'mother_name')
          ? {
              found: true,
              data: {
                name: faker.person.fullName(),
                birth_date: faker.date.birthdate().toISOString(),
                mother_name: faker.person.fullName(),
                father_name: faker.person.fullName(),
              },
            }
          : null,
      persons_created: personsCreated,
      relationships_created: relationshipsCreated,
      persons_updated: personsUpdated,
      duplicates_found: duplicatesFound,
      status: status,
      error_message: status === 'failed' ? faker.lorem.sentence() : null,
      import_summary:
        status === 'success' || status === 'partial'
          ? {
              created_person_ids: Array.from({ length: personsCreated }, () => faker.string.uuid()),
              created_relationship_ids: Array.from({ length: relationshipsCreated }, () =>
                faker.string.uuid()
              ),
              updated_person_ids: Array.from({ length: personsUpdated }, () => faker.string.uuid()),
              errors:
                status === 'partial'
                  ? [{ person: faker.person.fullName(), error: 'Duplicate entry found' }]
                  : [],
            }
          : null,
      started_at: ['processing', 'success', 'partial', 'failed'].includes(status)
        ? DateTime.fromJSDate(faker.date.recent({ days: 7 }))
        : null,
      completed_at: ['success', 'partial', 'failed'].includes(status)
        ? DateTime.fromJSDate(faker.date.recent({ days: 1 }))
        : null,
    }
  })
  .state('success', (dataImport, { faker }) => {
    dataImport.status = 'success'
    dataImport.error_message = null
    dataImport.persons_created = faker.number.int({ min: 1, max: 20 })
    dataImport.relationships_created = faker.number.int({ min: 0, max: 30 })
    dataImport.started_at = DateTime.now().minus({ minutes: 5 })
    dataImport.completed_at = DateTime.now()
  })
  .state('failed', (dataImport) => {
    dataImport.status = 'failed'
    dataImport.error_message = 'API connection timeout'
    dataImport.persons_created = 0
    dataImport.relationships_created = 0
    dataImport.persons_updated = 0
    dataImport.import_summary = null
    dataImport.started_at = DateTime.now().minus({ minutes: 2 })
    dataImport.completed_at = DateTime.now()
  })
  .state('nationalId', (dataImport, { faker }) => {
    dataImport.import_type = 'national_id'
    dataImport.search_value = faker.string.numeric(11)
  })
  .state('motherName', (dataImport, { faker }) => {
    dataImport.import_type = 'mother_name'
    dataImport.search_value = faker.person.fullName()
  })
  .build()
