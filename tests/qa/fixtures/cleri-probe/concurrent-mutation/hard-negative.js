// CONCURRENT_SHARED_STATE_MUTATION — hard-negative fixtures

// subtype: DIRECT_HARD_NEGATIVE
async function tallyCombatOutcomesImmutable(rolls) {
  const outcomes = await Promise.all(rolls.map(resolveAttack));
  return outcomes.reduce(
    (acc, hit) => {
      if (hit) acc.hits++;
      else acc.misses++;
      return acc;
    },
    { hits: 0, misses: 0 }
  );
}

// subtype: ADVERSARIAL_HARD_NEGATIVE
async function buildCacheInParallelImmutable(keys) {
  const entries = await Promise.all(
    keys.map(async key => [key, await expensiveCompute(key)])
  );
  return Object.fromEntries(entries);
}
