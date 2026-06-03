import { PHOTONIC_EXECUTION_CLASSES } from './photonic.config.js';
import { hashObject } from './photonic-diagnostics.js';

function createOperation(id, kind, executionClass, order, params = {}, dependsOn = []) {
  return Object.freeze({
    id,
    kind,
    executionClass,
    order,
    params: Object.freeze({ ...params }),
    dependsOn: Object.freeze([...dependsOn].sort()),
  });
}

function targetOperationKind(targetOperation) {
  if (targetOperation === 'inner-product') return 'INNER_PRODUCT';
  if (targetOperation === 'matrix-vector') return 'MVM';
  if (targetOperation === 'matrix-matrix') return 'MVM';
  if (targetOperation === 'similarity-search') return 'INNER_PRODUCT';
  return 'CONTROL';
}

export function buildPhotonicOperationGraph(packet) {
  const operations = [];
  let order = 0;

  const inputId = 'op_input_load';
  operations.push(createOperation(
    inputId,
    'MEMORY_MOVE',
    PHOTONIC_EXECUTION_CLASSES.ELECTRONIC_REQUIRED,
    order += 1,
    { storageKind: packet.storageKind, dimension: packet.dimension }
  ));

  let previousId = inputId;

  if (packet.rotationKind !== 'none') {
    const id = 'op_rotation';
    operations.push(createOperation(
      id,
      'ROTATE',
      PHOTONIC_EXECUTION_CLASSES.HYBRID,
      order += 1,
      { rotationKind: packet.rotationKind },
      [previousId]
    ));
    previousId = id;
  }

  if (packet.quantizationKind !== 'none') {
    const id = 'op_quantize';
    operations.push(createOperation(
      id,
      'QUANTIZE',
      PHOTONIC_EXECUTION_CLASSES.ELECTRONIC_REQUIRED,
      order += 1,
      { quantizationKind: packet.quantizationKind, bitWidth: packet.bitWidth },
      [previousId]
    ));
    previousId = id;
  }

  if (packet.residualKind !== 'none') {
    const id = 'op_residual';
    operations.push(createOperation(
      id,
      'RESIDUAL',
      PHOTONIC_EXECUTION_CLASSES.HYBRID,
      order += 1,
      { residualKind: packet.residualKind },
      [previousId]
    ));
    previousId = id;
  }

  const computeId = 'op_target_compute';
  const computeKind = targetOperationKind(packet.targetOperation);
  operations.push(createOperation(
    computeId,
    computeKind,
    computeKind === 'CONTROL'
      ? PHOTONIC_EXECUTION_CLASSES.ELECTRONIC_REQUIRED
      : PHOTONIC_EXECUTION_CLASSES.PHOTONIC_FRIENDLY,
    order += 1,
    { targetOperation: packet.targetOperation },
    [previousId]
  ));

  const sortedOperations = operations.sort((left, right) => left.order - right.order);

  const linearPath = sortedOperations
    .filter((operation) => ['ROTATE', 'MVM', 'INNER_PRODUCT'].includes(operation.kind))
    .map((operation) => operation.id);

  const electronicBoundaries = sortedOperations
    .filter((operation) => operation.executionClass === PHOTONIC_EXECUTION_CLASSES.ELECTRONIC_REQUIRED)
    .map((operation) => operation.id);

  const graphBody = {
    packetId: packet.packetId,
    operations: sortedOperations,
    linearPath,
    electronicBoundaries,
  };

  return Object.freeze({
    graphId: `photonic_graph_${hashObject(graphBody)}`,
    operations: Object.freeze(sortedOperations),
    linearPath: Object.freeze(linearPath),
    electronicBoundaries: Object.freeze(electronicBoundaries),
    graphHash: hashObject(graphBody),
  });
}
