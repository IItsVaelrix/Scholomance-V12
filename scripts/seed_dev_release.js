import { userPersistence } from '../codex/server/user.persistence.js';
import { catalogPersistence } from '../codex/server/catalog.persistence.js';

async function main() {
  try {
    // 1. Find or create the test user
    let user = await userPersistence.users.findByUsername('test');
    if (!user) {
      console.log("Creating 'test' user...");
      user = await userPersistence.users.createUser('test', 'test@example.com', 'hashedpassword', null);
      await userPersistence.users.verifyUser(user.id);
    }
    console.log(`Using user 'test' (ID: ${user.id})`);

    // 2. Check if the artist already exists
    let artist = await catalogPersistence.artists.findByHandle('test-artist');
    if (!artist) {
      console.log("Creating artist profile 'test-artist'...");
      artist = await catalogPersistence.artists.create({
        userId: user.id,
        handle: 'test-artist',
        displayName: 'Test Artist',
        primarySchool: 'SONIC',
      });
    }
    console.log(`Using artist 'test-artist' (ID: ${artist.id})`);

    // 3. Check if a release already exists
    let release = await catalogPersistence.releases.findBySlug(artist.id, 'my-first-release');
    if (!release) {
      console.log("Creating release 'my-first-release'...");
      release = await catalogPersistence.releases.create({
        artistId: artist.id,
        slug: 'my-first-release',
        title: 'My First Release',
        visibility: 'public',
      });
    }
    console.log(`\nSUCCESS! Created/found release.`);
    console.log(`==========================================`);
    console.log(`Release ID to use: ${release.id}`);
    console.log(`==========================================`);
    console.log(`You can now type this Release ID into the Studio Upload form!`);
  } catch (err) {
    console.error("Error seeding development release:", err);
  } finally {
    await userPersistence.close();
  }
}

main();
