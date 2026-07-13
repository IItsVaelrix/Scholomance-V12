// SWALLOWED_ERROR — verified positive fixtures

function riskyOperation() {
  try {
    dangerousCall();
  } catch (e) {
    // silently swallowed
  }
}

async function fetchWithLogOnly() {
  try {
    return await fetch('/api/combat/resolve');
  } catch (error) {
    console.log(error);
  }
}
