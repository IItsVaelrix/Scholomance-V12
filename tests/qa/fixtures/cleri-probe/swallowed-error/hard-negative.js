// SWALLOWED_ERROR — hard-negative fixtures

function riskyOperationWithRethrow() {
  try {
    dangerousCall();
  } catch (e) {
    reportToSentry(e);
    throw e;
  }
}

async function fetchWithRecovery() {
  try {
    return await fetch('/api/combat/resolve');
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
