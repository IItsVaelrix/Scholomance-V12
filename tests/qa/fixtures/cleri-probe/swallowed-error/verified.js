// SWALLOWED_ERROR — verified positive fixtures

// subtype: CLEAR_POSITIVE
function riskyOperation() {
  try {
    dangerousCall();
  } catch (e) {
    // silently swallowed
  }
}

// subtype: REAL_WORLD_POSITIVE
async function fetchWithLogOnly() {
  try {
    return await fetch('/api/combat/resolve');
  } catch (error) {
    console.log(error);
  }
}
