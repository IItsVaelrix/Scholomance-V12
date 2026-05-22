/**
 * Single-gate SQLite write serialization queue.
 *
 * Every mutating statement is funnelled through one FIFO promise chain so that
 * parallel pressure from pipelines, collab sessions, and reapers can no longer
 * interleave transactions and trip SQLITE_BUSY ("database is locked").
 *
 * Transient locks (another process holding the file, WAL checkpoint contention)
 * are retried with jittered exponential backoff. Execution order is preserved:
 * a job never starts until the previous job has fully settled.
 */

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BASE_DELAY_MS = 25;

function isBusyError(err) {
  const code = err?.code || err?.cause?.code || '';
  if (code === 'SQLITE_BUSY' || code === 'SQLITE_LOCKED') return true;
  return /database is locked|database table is locked/i.test(err?.message || '');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates an isolated write queue. One queue should exist per database file —
 * SQLITE_BUSY is scoped to a single file, so coupling unrelated databases into
 * a shared queue would needlessly serialize them.
 *
 * @param {{ maxRetries?: number, baseDelayMs?: number }} [options]
 */
export function createWriteQueue(options = {}) {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;

  let tail = Promise.resolve();
  let depth = 0;
  let peakDepth = 0;
  let processed = 0;
  let retried = 0;

  async function runWithRetry(fn) {
    let attempt = 0;
    for (;;) {
      try {
        return await fn();
      } catch (err) {
        if (isBusyError(err) && attempt < maxRetries) {
          retried += 1;
          // IMMUNE_ALLOW: math-random
          const wait = baseDelayMs * 2 ** attempt + Math.floor(Math.random() * baseDelayMs); // EXEMPT
          attempt += 1;
          await delay(wait);
          continue;
        }
        throw err;
      }
    }
  }

  /**
   * Enqueue a write job. Resolves/rejects with the job's own result; a rejecting
   * job never breaks the chain for jobs queued behind it.
   * @template T
   * @param {() => (T | Promise<T>)} fn
   * @returns {Promise<T>}
   */
  function enqueue(fn) {
    depth += 1;
    if (depth > peakDepth) peakDepth = depth;

    const result = tail.then(() => runWithRetry(fn));

    tail = result.then(
      () => { depth -= 1; processed += 1; },
      () => { depth -= 1; processed += 1; },
    );

    return result;
  }

  return {
    enqueue,
    /** Resolves once every queued job has settled. */
    async drain() { await tail; },
    get depth() { return depth; },
    get peakDepth() { return peakDepth; },
    stats() {
      return { depth, peakDepth, processed, retried };
    },
  };
}
