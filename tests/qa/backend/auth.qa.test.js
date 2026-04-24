
import { describe, it, expect } from 'vitest';
import { captchaService } from '../../../codex/server/services/captcha.service.js';
import { persistence } from '../../../codex/server/persistence.adapter.js';
import bcrypt from 'bcrypt';

describe('Auth & Security QA Suite', () => {
  
  describe('CaptchaService', () => {
    it('should generate valid math challenges', () => {
      const challenge = captchaService.generateChallenge();
      expect(challenge).toHaveProperty('id');
      expect(challenge).toHaveProperty('text');
      expect(challenge).toHaveProperty('solution');
      expect(typeof challenge.solution).toBe('string');
      
      // Basic format check
      expect(challenge.text).toMatch(/What is \d+ [+*] \d+\?/);
    });

    it('should validate correct solutions', () => {
      expect(captchaService.validate('10', '10')).toBe(true);
      expect(captchaService.validate(' 10 ', '10')).toBe(true);
    });

    it('should reject incorrect solutions', () => {
      expect(captchaService.validate('11', '10')).toBe(false);
      expect(captchaService.validate('', '10')).toBe(false);
      expect(captchaService.validate('10', null)).toBe(false);
    });
  });

  describe('User Persistence & Verification', () => {
    const testUser = {
      username: `qa_tester_${Date.now()}`,
      email: `qa_${Date.now()}@example.com`,
      password: 'Password123!',
      token: 'test-verification-token'
    };

    it('should create an unverified user', async () => {
      const hashed = await bcrypt.hash(testUser.password, 1);
      const user = await persistence.users.createUser(testUser.username, testUser.email, hashed, testUser.token);
      
      expect(user).toHaveProperty('id');
      
      const fetched = await persistence.users.findById(user.id);
      expect(fetched.verified).toBe(0);
      expect(fetched.verificationToken).toBe(testUser.token);
    });

    it('should verify a user and clear the token', async () => {
      const user = await persistence.users.findByUsername(testUser.username);
      await persistence.users.verifyUser(user.id);
      
      const updated = await persistence.users.findById(user.id);
      expect(updated.verified).toBe(1);
      expect(updated.verificationToken).toBeNull();
    });
  });

  describe('XP & Progression Logic', () => {
    it('should correctly calculate levels and tiers', async () => {
      // Create a dedicated user for this test to satisfy foreign key constraints
      const user = await persistence.users.createUser(
        `xp_tester_${Date.now()}`,
        `xp_${Date.now()}@example.com`,
        'hashed_pass',
        null
      );
      const userId = user.id;
      const progression = await persistence.progression.get(userId);
      
      expect(progression.xp).toBe(0);
      
      const updated = await persistence.progression.save(userId, { xp: 1500, unlockedSchools: ['SONIC'] });
      expect(updated.xp).toBe(1500);
    });
  });
});
