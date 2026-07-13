// SWALLOWED_ERROR — hard-negative fixtures

// subtype: DIRECT_HARD_NEGATIVE
function riskyOperationWithRethrow() {
  try {
    dangerousCall();
  } catch (e) {
    reportToSentry(e);
    throw e;
  }
}

// subtype: ADVERSARIAL_HARD_NEGATIVE
async function fetchWithRecovery() {
  try {
    return await fetch('/api/combat/resolve');
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
