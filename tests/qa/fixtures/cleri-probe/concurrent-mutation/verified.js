// CONCURRENT_SHARED_STATE_MUTATION — verified positive fixtures

async function tallyCombatOutcomes(rolls) {
  const results = { hits: 0, misses: 0 };
  await Promise.all(rolls.map(async roll => {
    const hit = await resolveAttack(roll);
    if (hit) results.hits++;
    else results.misses++;
  }));
  return results;
}

async function buildCacheInParallel(keys) {
  const cache = {};
  await Promise.all(keys.map(async key => {
    cache[key] = await expensiveCompute(key);
  }));
  return cache;
}
