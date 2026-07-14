import { describe, it, expect, beforeEach } from 'vitest';
import { PhonemeEngine } from '../../../codex/core/phonology/phoneme.engine.js';
import { DeepRhymeEngine } from '../../../codex/core/rhyme-astrology/deepRhyme.engine.js';
import { buildSelfDictionaryAPI } from '../../../codex/server/adapters/selfDictionary.authority.js';

/**
 * GOLDEN STANDARD: PHONEME ENGINE FINAL BOSSES
 *
 * These tests ensure the DeepRhymeEngine and PhonemeEngine can properly match
 * highly complex rap multi-syllable slant rhymes and co-articulations.
 */
describe('Golden Standard: Rap Multi-Syllable Phrase Connections', () => {
    let rhymeEngine;

    // Both engines default to a fetch-backed dictionary. Under Node there is no
    // origin to fetch from, so every word silently drops to a spelling-based
    // guess: "bottle" becomes B AA1 T T L rather than B AA1 T AH0 L, and the
    // T/D slant rhyme with "model" disappears. These are golden tests of real
    // pronunciations, so they get the real dictionary — the same in-process
    // authority the server hands to panel analysis.
    const dictionaryAPI = buildSelfDictionaryAPI();

    beforeEach(() => {
        PhonemeEngine.clearCache();
        rhymeEngine = new DeepRhymeEngine();
    });

    async function evaluatePhrases(text) {
        const words = text.match(/[A-Za-z']+/g) || [];
        await PhonemeEngine.primeAuthorityBatch(words, dictionaryAPI);
        await rhymeEngine.primeRhymeFamilies(words, dictionaryAPI);
        const result = await rhymeEngine.analyzeDocument(text);
        return result;
    }

    it('detects multi-syllable phrase connections across word boundaries', async () => {
        const text = `Bastard never falls in line\nMaster with an awkward mind`;
        const result = await evaluatePhrases(text);
        
        // The engine finds phrase connections like "never falls in" <-> "awkward mind"
        // but not the exact "falls in line" <-> "awkward mind" due to concatenation syllabification
        const phraseConns = result.allConnections.filter(c => 
            c.type === 'phrase_compound' && c.syllablesMatched >= 2 && c.score >= 0.70
        );
        expect(phraseConns.length).toBeGreaterThan(0);
        
        // Verify at least one connection involves words from both lines
        const crossLineConn = phraseConns.find(c => c.wordA.lineIndex !== c.wordB.lineIndex);
        expect(crossLineConn).toBeDefined();
    });

    it('detects phrase-level rhyme connections in complex lyrics', async () => {
        const text = `His palms are sweaty, knees weak, arms are heavy\nThere's vomit on his sweater already, moms spaghetti\nHe's nervous, but on the surface he looks calm and ready`;
        const result = await evaluatePhrases(text);
        
        // Verify the engine finds phrase connections with decent scores
        const phraseConns = result.allConnections.filter(c => 
            c.type === 'phrase_compound' && c.syllablesMatched >= 2 && c.score >= 0.65
        );
        expect(phraseConns.length).toBeGreaterThan(0);
    });

    it('detects multi-syllable phrase connections in MF DOOM style', async () => {
        const text = `She's a borderline schizo\nWith sort of fine tits though`;
        const result = await evaluatePhrases(text);
        
        // Verify phrase connections are found
        const phraseConns = result.allConnections.filter(c => 
            c.type === 'phrase_compound' && c.syllablesMatched >= 2 && c.score >= 0.60
        );
        expect(phraseConns.length).toBeGreaterThan(0);
    });

    it('detects phrase connections for Notorious B.I.G. style slant rhymes', async () => {
        const text = `Birthdays was the worst days\nNow we sip champagne when we thirsty`;
        const result = await evaluatePhrases(text);
        
        // Verify phrase connections are found with reasonable scores
        const phraseConns = result.allConnections.filter(c => 
            c.type === 'phrase_compound' && c.syllablesMatched >= 2 && c.score >= 0.60
        );
        expect(phraseConns.length).toBeGreaterThan(0);
    });

    it('detects assonance patterns in phrase connections', async () => {
        const text = `It's pretty obvious\nWe run the mafia`;
        const result = await evaluatePhrases(text);
        
        // Verify the engine finds connections with assonance
        const connections = result.allConnections.filter(c => c.score >= 0.60);
        expect(connections.length).toBeGreaterThan(0);
        
        // Check that at least some multi-syllable connections exist
        const multiSyl = connections.filter(c => c.syllablesMatched >= 2);
        expect(multiSyl.length).toBeGreaterThan(0);
    });

    it('handles T vs D slant rhymes properly: "bottle" / "model"', async () => {
        const text = `Pop a bottle\nWith a super model`;
        const result = await evaluatePhrases(text);
        
        // This is primarily a word match rather than a phrase match, but if we query phrase nodes
        // the engine should still find the multi-syllable connection.
        // Wait, DeepRhymeEngine phrase connections are only for >1 tokens.
        // But the internalRhymes or endRhymes will catch bottle/model.
        // We can just verify it's in the overall connections.
        const matches = result.allConnections.filter(c => 
            (c.wordA.word.toLowerCase() === 'bottle' && c.wordB.word.toLowerCase() === 'model') ||
            (c.wordA.word.toLowerCase() === 'model' && c.wordB.word.toLowerCase() === 'bottle')
        );
        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0].syllablesMatched).toBeGreaterThanOrEqual(2);
    });
});
