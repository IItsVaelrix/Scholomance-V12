// UNSAFE_EXTERNAL_RESPONSE_ACCESS — verified positive fixtures

// subtype: CLEAR_POSITIVE
async function fetchUserProfile(userId) {
  const response = await fetch('/api/user/' + userId);
  const data = await response.json();
  return data.profile.name;
}

// subtype: REAL_WORLD_POSITIVE
async function loadConfig() {
  const res = await axios.get('/api/config');
  return res.data.settings.theme;
}
