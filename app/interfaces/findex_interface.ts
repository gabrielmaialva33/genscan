/**
 * Findex API response interfaces
 */

/**
 * Phone number from Findex API
 */
export interface FindexPhone {
  NUMBER: string
}

/**
 * Email from Findex API
 */
export interface FindexEmail {
  EMAIL: string
  EMAIL_PESSOAL: string | 'S' | 'N'
  EMAIL_SCORE: string
}

/**
 * Relative/family member from Findex API
 */
export interface FindexRelative {
  CPF_VINCULO: string
  NOME_VINCULO: string
  VINCULO:
    | 'MAE'
    | 'PAI'
    | 'IRMA(O)'
    | 'FILHA(O)'
    | 'AVO'
    | 'AVO(A)'
    | 'AVÔ'
    | 'AVÓ'
    | 'TIA(O)'
    | 'TIO'
    | 'TIA'
    | 'PRIMA(O)'
    | 'PRIMO'
    | 'PRIMA'
    | 'SOBRINHA(O)'
    | 'SOBRINHO'
    | 'SOBRINHA'
    | string
}

/**
 * Address from Findex API
 */
export interface FindexAddress {
  BAIRRO: string
  CEP: string
  CIDADE: string
  COMPLEMENTO: string
  LOGRADOURO: string
  LOGRADOURO_NUMERO: string
  UF: string
}

/**
 * Complete person data from CPF search
 */
export interface FindexPersonResponse {
  NOME: string
  CPF: string
  SEXO: 'M' | 'F'
  NASCIMENTO: string // DD/MM/YYYY format
  NOME_MAE: string
  NOME_PAI: string
  ESTADO_CIVIL: string
  RG: string
  ORGAO_EMISSOR: string
  UF_EMISSAO: string
  RENDA: string
  TITULO_ELEITOR: string
  PESO: string
  PIS: string
  PODER_AQUISITIVO: string
  FX_PODER_AQUISITIVO: string
  CSB8: string
  CSB8_FAIXA: string
  CSBA: string
  CSBA_FAIXA: string
  NSU: string
  ZONA: string
  SECAO: string
  TELEFONES: FindexPhone[]
  EMAIL: FindexEmail[]
  PARENTES: FindexRelative[]
  ENDERECO: FindexAddress[]
}

/**
 * Person data from mother name search
 */
export interface FindexMotherSearchResponse {
  NOME: string
  CPF: string
  NASCIMENTO: string // DD/MM/YYYY format
  SEXO: 'M' | 'F'
  MAE: string
  PAI: string | null
}

/**
 * API error response
 */
export interface FindexErrorResponse {
  error: string
  message: string
  code?: string
}

/**
 * Type guards
 */
export const isFindexPersonResponse = (data: any): data is FindexPersonResponse => {
  return data && typeof data.CPF === 'string' && Array.isArray(data.TELEFONES)
}

export const isFindexMotherSearchResponse = (data: any): data is FindexMotherSearchResponse[] => {
  return Array.isArray(data) && data.every((item) => typeof item.CPF === 'string')
}

export const isFindexErrorResponse = (data: any): data is FindexErrorResponse => {
  return data && typeof data.error === 'string'
}
