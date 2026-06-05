/**
 * Catalog seed — turns the legacy frozen station buckets into real catalog rows.
 *
 * `sonicStationBuckets.js` was the hardcoded source of truth (five schools →
 * arrays of Suno URLs). Per PDR-2026-06-05-SONIC-EXCHANGE-NATIVE-LISTENING it is
 * demoted to a *seed*: we import it once as a system "Scholomance Station"
 * artist with one release per school, so the catalog is non-empty on day one
 * and no feature has to re-read the buckets directly.
 *
 * `buildSeedPlan` is pure (no DB) and unit-testable; `seedCatalog` writes it.
 */

import { getSonicStationBuckets } from '../../core/constants/data/sonicStationBuckets.js';

const STATION_HANDLE = 'scholomance-station';

/** Derive a readable track title from a URL, mirroring ScholomanceStation.tsx. */
export function trackLabelFromUrl(url, index) {
  const fallback = `Resonance Path ${String(index + 1).padStart(2, '0')}`;
  try {
    const parsed = new URL(url);
    const rawName = parsed.pathname.split('/').filter(Boolean).pop() || parsed.hostname;
    const cleaned = decodeURIComponent(rawName)
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim();
    return cleaned || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Build the seed plan from the buckets. Returns a plain object describing the
 * artist, one release per school, and its tracks — no side effects.
 */
export function buildSeedPlan(buckets = getSonicStationBuckets()) {
  const artist = {
    handle: STATION_HANDLE,
    displayName: 'Scholomance Station',
    bio: 'The house resonance broadcast — five schools, one signal.',
    primarySchool: 'SONIC',
  };

  const releases = Object.entries(buckets).map(([schoolId, urls]) => ({
    slug: schoolId.toLowerCase(),
    title: `${schoolId} Broadcast`,
    kind: urls.length > 1 ? 'album' : 'single',
    priceMode: 'free',
    priceMinCents: 0,
    visibility: 'public',
    school: schoolId,
    tracks: (urls || []).map((url, index) => ({
      position: index + 1,
      title: trackLabelFromUrl(url, index),
      school: schoolId,
      streamUrl: url,
    })),
  }));

  return { artist, releases };
}

/**
 * Idempotently write the seed plan. No-op if the station artist already exists.
 *
 * @param {object} args
 * @param {import('../catalog.persistence.js').catalogPersistence} args.api
 * @param {number} args.systemUserId  - user the station artist is owned by
 * @param {object} [args.buckets]
 */
export async function seedCatalog({ api, systemUserId, buckets } = {}) {
  if (!api) throw new Error('seedCatalog requires a catalog persistence api');
  if (!Number.isFinite(Number(systemUserId))) {
    throw new Error('seedCatalog requires a systemUserId');
  }

  const existing = await api.artists.findByHandle(STATION_HANDLE);
  if (existing) {
    return { created: false, artistId: existing.id };
  }

  const plan = buildSeedPlan(buckets);
  const artist = await api.artists.create({
    userId: systemUserId,
    handle: plan.artist.handle,
    displayName: plan.artist.displayName,
    bio: plan.artist.bio,
    primarySchool: plan.artist.primarySchool,
  });

  let releaseCount = 0;
  let trackCount = 0;
  for (const rel of plan.releases) {
    const release = await api.releases.create({
      artistId: artist.id,
      slug: rel.slug,
      title: rel.title,
      kind: rel.kind,
      priceMode: rel.priceMode,
      priceMinCents: rel.priceMinCents,
      visibility: 'draft',
    });
    releaseCount += 1;

    for (const t of rel.tracks) {
      await api.tracks.create({
        releaseId: release.id,
        position: t.position,
        title: t.title,
        school: t.school,
        streamUrl: t.streamUrl,
      });
      trackCount += 1;
    }

    if (rel.visibility === 'public') {
      await api.releases.publish(release.id);
    }
  }

  return { created: true, artistId: artist.id, releaseCount, trackCount };
}
