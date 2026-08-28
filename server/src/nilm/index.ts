import { DetectorDegraus } from './detectorDegraus.js'
import type { DetectorNILM } from './types.js'

export * from './types.js'
export * from './catalogo.js'
export { DetectorDegraus } from './detectorDegraus.js'

/**
 * Detector em uso pelo sistema. Ponto único de troca:
 * na Fase 6, basta apontar para a implementação de ML.
 */
export const detector: DetectorNILM = new DetectorDegraus()
