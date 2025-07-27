import DataImport from '#models/data_import'
import LucidRepositoryInterface from '#shared/lucid/lucid_repository_interface'

namespace IFamilyDiscovery {
  /**
   * Repository interface
   */
  export interface Repository extends LucidRepositoryInterface<typeof DataImport> {
    /**
     * Find discoveries by user
     */
    findByUserId(userId: number): Promise<DataImport[]>

    /**
     * Find discoveries by family tree
     */
    findByFamilyTreeId(familyTreeId: string): Promise<DataImport[]>

    /**
     * Get discovery with details
     */
    findWithDetails(id: string): Promise<DataImport | null>

    /**
     * Update discovery progress
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
   * Person discovery by CPF payload
   */
  export interface PersonDiscoveryByCPFPayload {
    cpf: string
    family_tree_id: string
    user_id: number
    discover_relatives?: boolean
    merge_duplicates?: boolean
  }

  /**
   * Children discovery by mother name payload
   */
  export interface ChildrenByMotherPayload {
    mother_name: string
    family_tree_id: string
    user_id: number
    discover_relatives?: boolean
    merge_duplicates?: boolean
  }

  /**
   * Children discovery by parent name payload (mother or father)
   */
  export interface ChildrenByParentPayload {
    parent_name: string
    family_tree_id: string
    user_id: number
    discover_relatives?: boolean
    merge_duplicates?: boolean
  }

  /**
   * Discovery result
   */
  export interface DiscoveryResult {
    discovery_id: string
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
   * Discovery progress
   */
  export interface DiscoveryProgress {
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

export default IFamilyDiscovery
