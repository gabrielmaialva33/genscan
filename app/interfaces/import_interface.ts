import DataImport from '#models/data_import'
import LucidRepositoryInterface from '#shared/lucid/lucid_repository_interface'

namespace IImport {
  /**
   * Repository interface
   */
  export interface Repository extends LucidRepositoryInterface<typeof DataImport> {
    /**
     * Find imports by user
     */
    findByUserId(userId: number): Promise<DataImport[]>

    /**
     * Find imports by family tree
     */
    findByFamilyTreeId(familyTreeId: string): Promise<DataImport[]>

    /**
     * Get import with details
     */
    findWithDetails(id: string): Promise<DataImport | null>

    /**
     * Update import progress
     */
    updateProgress(
      id: string,
      progress: {
        persons_created?: number
        relationships_created?: number
        persons_updated?: number
        duplicates_found?: number
      }
    ): Promise<void>
  }

  /**
   * Import from CPF payload
   */
  export interface ImportFromCPFPayload {
    cpf: string
    family_tree_id: string
    user_id: number
    import_relatives?: boolean
    merge_duplicates?: boolean
  }

  /**
   * Import from mother name payload
   */
  export interface ImportFromMotherPayload {
    mother_name: string
    family_tree_id: string
    user_id: number
    import_relatives?: boolean
    merge_duplicates?: boolean
  }

  /**
   * Import result
   */
  export interface ImportResult {
    import_id: string
    status: 'success' | 'partial' | 'failed'
    persons_created: number
    relationships_created: number
    persons_updated: number
    duplicates_found: number
    errors?: Array<{
      person: string
      error: string
    }>
  }

  /**
   * Import progress
   */
  export interface ImportProgress {
    id: string
    status: 'pending' | 'processing' | 'success' | 'partial' | 'failed'
    total_to_process: number
    processed: number
    persons_created: number
    relationships_created: number
    errors: number
    current_action?: string
  }

  /**
   * Relative mapping result
   */
  export interface RelativeMapping {
    api_cpf: string
    api_name: string
    api_relationship: string
    person_id?: string
    is_new: boolean
    relationship_type:
      | 'parent'
      | 'child'
      | 'spouse'
      | 'sibling'
      | 'grandparent'
      | 'grandchild'
      | 'uncle_aunt'
      | 'nephew_niece'
      | 'cousin'
  }
}

export default IImport
