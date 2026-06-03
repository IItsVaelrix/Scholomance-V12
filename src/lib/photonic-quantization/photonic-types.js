/**
 * @typedef {Object} PhotonicVectorPacket
 * @property {string} packetId
 * @property {'kv-cache'|'embedding'|'attention-probe'|'manual'} sourceKind
 * @property {number} dimension
 * @property {number} bitWidth
 * @property {'float32'|'int8'|'int4'|'int2'|'binary'|'packed'} storageKind
 * @property {'none'|'random-rotation'|'hadamard'|'polar'|'custom'} rotationKind
 * @property {'none'|'scalar'|'polar'|'qjl-residual'|'custom'} quantizationKind
 * @property {'none'|'qjl'|'sign-bit'|'residual-codebook'|'custom'} residualKind
 * @property {'inner-product'|'matrix-vector'|'matrix-matrix'|'similarity-search'|'diagnostic'} targetOperation
 * @property {Array<number>|Float32Array|Int8Array|Uint8Array} [data]
 * @property {Object} [metadata]
 */

/**
 * @typedef {Object} PhotonicDiagnostic
 * @property {string} code
 * @property {'error'|'warn'|'info'} severity
 * @property {string} message
 * @property {Object} details
 */

/**
 * @typedef {Object} PhotonicOperation
 * @property {string} id
 * @property {'ROTATE'|'QUANTIZE'|'RESIDUAL'|'MVM'|'INNER_PRODUCT'|'NONLINEAR'|'MEMORY_MOVE'|'CONTROL'} kind
 * @property {'photonic-friendly'|'electronic-required'|'hybrid'|'unsupported'} executionClass
 * @property {number} order
 * @property {Object} params
 * @property {Array<string>} dependsOn
 */

/**
 * @typedef {Object} PhotonicOperationGraph
 * @property {string} graphId
 * @property {Array<PhotonicOperation>} operations
 * @property {Array<string>} linearPath
 * @property {Array<string>} electronicBoundaries
 * @property {string} graphHash
 */

/**
 * @typedef {Object} PhotonicBridgeReport
 * @property {string} schemaVersion
 * @property {string} packetId
 * @property {boolean} ok
 * @property {'off'|'shadow'|'warn'|'gate'} mode
 * @property {number} compatibilityScore
 * @property {string} compatibilityGrade
 * @property {PhotonicOperationGraph|null} operationGraph
 * @property {Array<PhotonicDiagnostic>} diagnostics
 * @property {Array<string>} assumptions
 * @property {Array<string>} blockedReasons
 * @property {string} reportHash
 */
