import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('[Server] catalog persistence extension (migrations v19, v20)', () => {
  let userPersistence;
  let catalogPersistence;
  let dbPath;
  let testUser;
  let testArtist;
  let testRelease;
  let testTrack;

  beforeAll(async () => {
    dbPath = path.join(os.tmpdir(), `catalog_persistence_test_${Date.now()}.sqlite`);
    process.env.USER_DB_PATH = dbPath;
    delete process.env.TURSO_USER_DB_URL;

    // Load user persistence first so migrations apply to the temporary database.
    ({ userPersistence } = await import('../../codex/server/user.persistence.js'));
    ({ catalogPersistence } = await import('../../codex/server/catalog.persistence.js'));

    // Seed basic prerequisite records: user, artist, release, track
    testUser = await userPersistence.users.createUser(
      'artist_user', 'artist@example.com', 'hash', 'verify-tok'
    );
    testArtist = await catalogPersistence.artists.create({
      userId: testUser.id,
      handle: 'artist-handle',
      displayName: 'Test Artist',
      primarySchool: 'SONIC',
    });
    testRelease = await catalogPersistence.releases.create({
      artistId: testArtist.id,
      slug: 'test-release',
      title: 'Test Album',
    });
    testTrack = await catalogPersistence.tracks.create({
      releaseId: testRelease.id,
      position: 1,
      title: 'Test Song',
      school: 'SONIC',
    });
  });

  afterAll(() => {
    try { userPersistence?.close?.(); } catch { /* already closed */ }
    for (const suffix of ['', '-wal', '-shm']) {
      const f = `${dbPath}${suffix}`;
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  });

  describe('Commerce (Purchases & Payouts)', () => {
    it('creates, finds, and lists purchases', async () => {
      const purchase = await catalogPersistence.commerce.purchases.create({
        userId: testUser.id,
        email: 'buyer@example.com',
        releaseId: testRelease.id,
        amountCents: 999,
        currency: 'USD',
        provider: 'stripe',
        providerRef: 'pi_123',
        downloadToken: 'tok_abc',
      });

      expect(purchase).toBeTruthy();
      expect(purchase.status).toBe('pending');
      expect(purchase.amount_cents).toBe(999);
      expect(purchase.email).toBe('buyer@example.com');

      const found = await catalogPersistence.commerce.purchases.findById(purchase.id);
      expect(found).toBeTruthy();
      expect(found.provider_ref).toBe('pi_123');

      const updated = await catalogPersistence.commerce.purchases.updateStatus(purchase.id, 'paid');
      expect(updated.status).toBe('paid');

      const list = await catalogPersistence.commerce.purchases.listByUser(testUser.id);
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list[0].id).toBe(purchase.id);
    });

    it('creates, finds, and lists payouts', async () => {
      const payout = await catalogPersistence.commerce.payouts.create({
        artistId: testArtist.id,
        amountCents: 500,
        status: 'accrued',
      });

      expect(payout).toBeTruthy();
      expect(payout.amount_cents).toBe(500);
      expect(payout.status).toBe('accrued');

      const found = await catalogPersistence.commerce.payouts.findById(payout.id);
      expect(found).toBeTruthy();

      const updated = await catalogPersistence.commerce.payouts.updateStatus(payout.id, 'paid');
      expect(updated.status).toBe('paid');

      const list = await catalogPersistence.commerce.payouts.listByArtist(testArtist.id);
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list[0].id).toBe(payout.id);
    });
  });

  describe('Social (Follows & Comments)', () => {
    it('handles artist follows', async () => {
      const followerId = testUser.id;
      const artistId = testArtist.id;

      // Initially not following
      let isFollowing = await catalogPersistence.social.follows.isFollowing(Number(followerId), Number(artistId));
      expect(isFollowing).toBe(false);

      // Follow
      await catalogPersistence.social.follows.follow(Number(followerId), Number(artistId));
      isFollowing = await catalogPersistence.social.follows.isFollowing(Number(followerId), Number(artistId));
      expect(isFollowing).toBe(true);

      // Check lists
      const followers = await catalogPersistence.social.follows.listFollowers(Number(artistId));
      expect(followers.map(Number)).toContain(Number(followerId));

      const following = await catalogPersistence.social.follows.listFollowing(Number(followerId));
      expect(following.map(Number)).toContain(Number(artistId));

      // Unfollow
      await catalogPersistence.social.follows.unfollow(Number(followerId), Number(artistId));
      isFollowing = await catalogPersistence.social.follows.isFollowing(Number(followerId), Number(artistId));
      expect(isFollowing).toBe(false);
    });

    it('creates, lists, and deletes comments', async () => {
      const comment = await catalogPersistence.social.comments.create({
        trackId: testTrack.id,
        userId: testUser.id,
        atMs: 5000,
        body: 'Amazing drop here!',
      });

      expect(comment).toBeTruthy();
      expect(comment.body).toBe('Amazing drop here!');
      expect(comment.at_ms).toBe(5000);

      const list = await catalogPersistence.social.comments.listByTrack(testTrack.id);
      expect(list.length).toBe(1);
      expect(list[0].body).toBe('Amazing drop here!');

      await catalogPersistence.social.comments.delete(comment.id);
      const listAfter = await catalogPersistence.social.comments.listByTrack(testTrack.id);
      expect(listAfter.length).toBe(0);
    });
  });

  describe('Analytics (Plays)', () => {
    it('records and lists plays', async () => {
      const play = await catalogPersistence.analytics.plays.record({
        trackId: testTrack.id,
        userId: testUser.id,
        msPlayed: 120000,
        source: 'station',
      });

      expect(play).toBeTruthy();
      expect(play.ms_played).toBe(120000);
      expect(play.source).toBe('station');

      const list = await catalogPersistence.analytics.plays.listByTrack(testTrack.id);
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list[0].id).toBe(play.id);
    });
  });
});
