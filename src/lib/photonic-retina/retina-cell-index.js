/** Canonical row-major cell index. ALL perception masks use this ordering. */
export function cellIndex(row, col, cols) {
  return (row * cols) + col;
}

/** Total cells in a rows x cols lattice. */
export function cellCount(rows, cols) {
  return rows * cols;
}
