import { userPersistence } from '../codex/server/user.persistence.js';
import { catalogPersistence } from '../codex/server/catalog.persistence.js';
import { seedCatalog } from '../codex/server/catalog/catalog.seed.js';

async function main() {
  try {
    let systemUser = await userPersistence.users.findByUsername('system') || await userPersistence.users.findByUsername('test');
    if (!systemUser) {
      console.log("Creating system user...");
      systemUser = await userPersistence.users.createUser('system', 'system@scholomance.local', 'system-seeded-password-hash', null);
      await userPersistence.users.verifyUser(systemUser.id);
    }
    console.log(`Using user ${systemUser.username} (ID: ${systemUser.id})`);
    
    const result = await seedCatalog({
      api: catalogPersistence,
      systemUserId: systemUser.id,
    });
    console.log("Seeding result:", result);
  } catch (err) {
    console.error("Error seeding catalog:", err);
  } finally {
    await userPersistence.close();
  }
}

main();
