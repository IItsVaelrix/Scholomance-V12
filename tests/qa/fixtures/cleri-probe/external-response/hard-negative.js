// UNSAFE_EXTERNAL_RESPONSE_ACCESS — hard-negative fixtures

// subtype: DIRECT_HARD_NEGATIVE
async function fetchUserProfileSafe(userId) {
  const response = await fetch('/api/user/' + userId);
  if (!response.ok) return null;
  const data = await response.json();
  return data?.profile?.name ?? null;
}

// subtype: ADVERSARIAL_HARD_NEGATIVE
async function loadConfigSafe() {
  const res = await axios.get('/api/config');
  return res.data?.settings?.theme ?? 'default';
}
