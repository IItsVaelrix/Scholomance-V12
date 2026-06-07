import { userPersistence } from './user.persistence.js';

export async function getEqPresets(userId) {
  const { db } = userPersistence;
  const result = await db.execute(
    'SELECT * FROM eq_presets WHERE user_id = ? ORDER BY updated_at DESC',
    [userId]
  );
  return result.rows || [];
}

export async function getEqPreset(id, userId) {
  const { db } = userPersistence;
  const result = await db.execute(
    'SELECT * FROM eq_presets WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result.rows[0] || null;
}

export async function saveEqPreset(userId, preset) {
  const { db } = userPersistence;
  const now = new Date().toISOString();
  
  await db.execute(`
    INSERT INTO eq_presets (
      id, user_id, name, school, bytecode, checksum, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?
    ) ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      school = excluded.school,
      bytecode = excluded.bytecode,
      checksum = excluded.checksum,
      updated_at = excluded.updated_at
  `, [
    preset.id,
    userId,
    preset.name,
    preset.school || null,
    preset.bytecode,
    preset.checksum,
    now,
    now
  ]);
  
  return await getEqPreset(preset.id, userId);
}

export async function deleteEqPreset(id, userId) {
  const { db } = userPersistence;
  const result = await db.execute(
    'DELETE FROM eq_presets WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result.rowsAffected > 0;
}
