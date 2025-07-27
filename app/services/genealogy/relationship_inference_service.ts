import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

type RelationshipType =
  | 'parent'
  | 'child'
  | 'spouse'
  | 'sibling'
  | 'grandparent'
  | 'grandchild'
  | 'uncle_aunt'
  | 'nephew_niece'
  | 'cousin'

interface RelationshipContext {
  fromPersonId: string
  toPersonId: string
  apiRelationship: string // Original relationship from API (MAE, PAI, IRMA(O), etc)
  fromPersonName?: string
  toPersonName?: string
  levelDifference?: number // Difference in tree levels
}

/**
 * Service to intelligently infer relationship types based on context
 */
@inject()
export default class RelationshipInferenceService {
  /**
   * Map of API relationships to system relationship types with bidirectional mapping
   */
  private readonly relationshipMap = new Map<
    string,
    { forward: RelationshipType; inverse: RelationshipType }
  >([
    ['MAE', { forward: 'child', inverse: 'parent' }], // If A is MAE of B, A->B is child, B->A is parent
    ['MÃE', { forward: 'child', inverse: 'parent' }],
    ['PAI', { forward: 'child', inverse: 'parent' }],
    ['FILHA(O)', { forward: 'parent', inverse: 'child' }],
    ['FILHO', { forward: 'parent', inverse: 'child' }],
    ['FILHA', { forward: 'parent', inverse: 'child' }],
    ['IRMA(O)', { forward: 'sibling', inverse: 'sibling' }],
    ['IRMÃO', { forward: 'sibling', inverse: 'sibling' }],
    ['IRMÃ', { forward: 'sibling', inverse: 'sibling' }],
    ['AVO', { forward: 'grandchild', inverse: 'grandparent' }],
    ['AVÔ', { forward: 'grandchild', inverse: 'grandparent' }],
    ['AVÓ', { forward: 'grandchild', inverse: 'grandparent' }],
    ['AVO(A)', { forward: 'grandchild', inverse: 'grandparent' }],
    ['NETO', { forward: 'grandparent', inverse: 'grandchild' }],
    ['NETA', { forward: 'grandparent', inverse: 'grandchild' }],
    ['NETO(A)', { forward: 'grandparent', inverse: 'grandchild' }],
    ['TIO', { forward: 'nephew_niece', inverse: 'uncle_aunt' }],
    ['TIA', { forward: 'nephew_niece', inverse: 'uncle_aunt' }],
    ['TIA(O)', { forward: 'nephew_niece', inverse: 'uncle_aunt' }],
    ['SOBRINHO', { forward: 'uncle_aunt', inverse: 'nephew_niece' }],
    ['SOBRINHA', { forward: 'uncle_aunt', inverse: 'nephew_niece' }],
    ['SOBRINHA(O)', { forward: 'uncle_aunt', inverse: 'nephew_niece' }],
    ['PRIMO', { forward: 'cousin', inverse: 'cousin' }],
    ['PRIMA', { forward: 'cousin', inverse: 'cousin' }],
    ['PRIMA(O)', { forward: 'cousin', inverse: 'cousin' }],
    ['ESPOSO', { forward: 'spouse', inverse: 'spouse' }],
    ['ESPOSA', { forward: 'spouse', inverse: 'spouse' }],
    ['CÔNJUGE', { forward: 'spouse', inverse: 'spouse' }],
    ['MARIDO', { forward: 'spouse', inverse: 'spouse' }],
    ['MULHER', { forward: 'spouse', inverse: 'spouse' }],
  ])

  /**
   * Infer the relationship type between two people based on context
   */
  inferRelationship(context: RelationshipContext): {
    forward: RelationshipType
    inverse: RelationshipType
  } {
    const { apiRelationship, fromPersonName, toPersonName, levelDifference } = context

    // Try direct mapping first
    const mapping = this.relationshipMap.get(apiRelationship.toUpperCase())
    if (mapping) {
      logger.info(
        `Inferred relationship: ${fromPersonName || 'Person A'} -> ${toPersonName || 'Person B'} = ${mapping.forward} (API: ${apiRelationship})`
      )
      return mapping
    }

    // If no direct mapping, try to infer based on patterns
    const upperRelation = apiRelationship.toUpperCase()

    // Check for compound relationships
    if (upperRelation.includes('MAE') || upperRelation.includes('MÃE')) {
      return { forward: 'child', inverse: 'parent' }
    }
    if (upperRelation.includes('PAI')) {
      return { forward: 'child', inverse: 'parent' }
    }
    if (upperRelation.includes('FILH')) {
      return { forward: 'parent', inverse: 'child' }
    }
    if (upperRelation.includes('IRM')) {
      return { forward: 'sibling', inverse: 'sibling' }
    }
    if (upperRelation.includes('AV')) {
      // Could be avô/avó (grandparent) or need to check context
      if (levelDifference && levelDifference > 1) {
        return { forward: 'grandchild', inverse: 'grandparent' }
      }
    }

    // Default to cousin for unknown relationships
    logger.warn(
      `Unknown relationship type '${apiRelationship}' between ${fromPersonName || 'Person A'} and ${toPersonName || 'Person B'}. Defaulting to cousin.`
    )
    return { forward: 'cousin', inverse: 'cousin' }
  }

  /**
   * Infer relationships for siblings discovered through mother search
   */
  inferSiblingRelationships(
    motherName: string,
    children: Array<{ cpf: string; name: string }>
  ): Array<{
    person1: { cpf: string; name: string }
    person2: { cpf: string; name: string }
    relationship: { forward: RelationshipType; inverse: RelationshipType }
  }> {
    const relationships: Array<{
      person1: { cpf: string; name: string }
      person2: { cpf: string; name: string }
      relationship: { forward: RelationshipType; inverse: RelationshipType }
    }> = []

    // All children of the same mother are siblings
    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        relationships.push({
          person1: children[i],
          person2: children[j],
          relationship: { forward: 'sibling', inverse: 'sibling' },
        })
        logger.info(
          `Inferred sibling relationship: ${children[i].name} <-> ${children[j].name} (same mother: ${motherName})`
        )
      }
    }

    return relationships
  }

  /**
   * Validate if a relationship makes sense given the context
   */
  validateRelationship(
    relationshipType: RelationshipType,
    context: {
      ageDifference?: number
      levelDifference?: number
      existingRelationships?: RelationshipType[]
    }
  ): boolean {
    const { ageDifference, levelDifference, existingRelationships } = context

    // Parent-child should have significant age difference
    if (
      (relationshipType === 'parent' || relationshipType === 'child') &&
      ageDifference &&
      ageDifference < 15
    ) {
      logger.warn(`Parent-child relationship with age difference of only ${ageDifference} years`)
      return false
    }

    // Siblings should have reasonable age difference
    if (relationshipType === 'sibling' && ageDifference && ageDifference > 50) {
      logger.warn(`Sibling relationship with age difference of ${ageDifference} years`)
      return false
    }

    // Check for conflicting relationships
    if (existingRelationships?.includes('parent') && relationshipType === 'child') {
      logger.error('Cannot be both parent and child of the same person')
      return false
    }

    // Grandparent relationships should have 2+ level difference
    if (
      (relationshipType === 'grandparent' || relationshipType === 'grandchild') &&
      levelDifference &&
      levelDifference < 2
    ) {
      logger.warn(`Grandparent relationship with level difference of only ${levelDifference}`)
      return false
    }

    return true
  }

  /**
   * Get the inverse of a relationship type
   */
  getInverseRelationship(relationshipType: RelationshipType): RelationshipType {
    const inverseMap: Record<RelationshipType, RelationshipType> = {
      parent: 'child',
      child: 'parent',
      spouse: 'spouse',
      sibling: 'sibling',
      grandparent: 'grandchild',
      grandchild: 'grandparent',
      uncle_aunt: 'nephew_niece',
      nephew_niece: 'uncle_aunt',
      cousin: 'cousin',
    }
    return inverseMap[relationshipType]
  }

  /**
   * Check if two relationship types are compatible (can coexist)
   */
  areRelationshipsCompatible(type1: RelationshipType, type2: RelationshipType): boolean {
    // Cannot be parent and child at the same time
    if ((type1 === 'parent' && type2 === 'child') || (type1 === 'child' && type2 === 'parent')) {
      return false
    }

    // Cannot be grandparent and grandchild at the same time
    if (
      (type1 === 'grandparent' && type2 === 'grandchild') ||
      (type1 === 'grandchild' && type2 === 'grandparent')
    ) {
      return false
    }

    // Spouse relationship is exclusive
    if ((type1 === 'spouse' || type2 === 'spouse') && type1 !== type2) {
      return false
    }

    return true
  }
}
