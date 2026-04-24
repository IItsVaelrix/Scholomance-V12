import { motion } from 'framer-motion';
import { VOWEL_FAMILY_TO_SCHOOL } from '../../data/schools.js';

const ARPABET_VOWELS = new Set([
  'AA', 'AE', 'AH', 'AO', 'AW', 'AX', 'AY',
  'EH', 'ER', 'EY', 'IH', 'IY', 'OH', 'OW',
  'OY', 'UH', 'UW', 'UR',
]);

const IPA_VOWELS = /[aeiouɑæʌəɚɝɜɛɪʊɔɒɐøœy]/i;

const ZODIAC_GLYPHS = Object.freeze({
  aries: '♈',
  taurus: '♉',
  gemini: '♊',
  cancer: '♋',
  leo: '♌',
  virgo: '♍',
  libra: '♎',
  scorpio: '♏',
  sagittarius: '♐',
  capricorn: '♑',
  aquarius: '♒',
  pisces: '♓',
});

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function titleCase(value) {
  return String(value || '').trim().replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scoreToBucket(score, index = 0, total = 1) {
  const numeric = Number(score);
  const normalized = Number.isFinite(numeric)
    ? clamp(numeric, 0, 1)
    : clamp(1 - (index / Math.max(total, 1)), 0.2, 0.95);

  if (normalized >= 0.82) return '5';
  if (normalized >= 0.64) return '4';
  if (normalized >= 0.46) return '3';
  if (normalized >= 0.28) return '2';
  return '1';
}

function normalizePhonemeToken(token) {
  return String(token || '').replace(/[0-9ˈˌ]/g, '').trim();
}

function splitPhonemes(ipa, fallbackWord) {
  const source = String(ipa || '')
    .replace(/[()[\]{}]/g, '')
    .replace(/\//g, '')
    .replace(/[ˈˌ]/g, '')
    .trim();

  if (source.includes(' ') || source.includes('.') || source.includes('·')) {
    return source.split(/[\s.·-]+/).map(normalizePhonemeToken).filter(Boolean);
  }

  const compact = source || String(fallbackWord || '').trim();
  return Array.from(compact).map(normalizePhonemeToken).filter(Boolean).slice(0, 18);
}

function isVowelPhoneme(phoneme) {
  const normalized = normalizePhonemeToken(phoneme).toUpperCase();
  return ARPABET_VOWELS.has(normalized) || IPA_VOWELS.test(phoneme);
}

function classTone(partOfSpeech) {
  const value = String(partOfSpeech || '').toLowerCase();
  if (value.includes('verb')) return 'verb';
  if (value.includes('adj')) return 'adjective';
  if (value.includes('adv')) return 'adverb';
  if (value.includes('noun')) return 'noun';
  return 'lexeme';
}

function waveformPath(tone) {
  switch (tone) {
    case 'rhyme':
      return 'M2 9 C6 2 10 2 14 9 S22 16 26 9';
    case 'slant':
      return 'M2 10 C7 5 9 14 14 8 S21 4 26 11';
    case 'assonance':
      return 'M2 9 Q6 3 10 9 T18 9 T26 9';
    case 'antonym':
      return 'M2 4 L8 14 L14 4 L20 14 L26 4';
    default:
      return 'M2 10 C7 7 9 7 14 10 S21 13 26 10';
  }
}

function zodiacGlyph(sign) {
  const normalized = String(sign || '').trim().toLowerCase();
  return ZODIAC_GLYPHS[normalized] || '✦';
}

export function PhonemeStrip({ ipa, fallbackWord }) {
  const phonemes = splitPhonemes(ipa, fallbackWord);

  if (phonemes.length === 0) {
    return <span className="oracle-phoneme-empty">phonemes unresolved</span>;
  }

  return (
    <div className="oracle-phoneme-row" aria-label="Phoneme sequence">
      {phonemes.map((phoneme, index) => {
        const kind = isVowelPhoneme(phoneme) ? 'vowel' : 'consonant';

        return (
          <span
            key={`${phoneme}-${index}`}
            className="oracle-phoneme-chip"
            data-kind={kind}
            aria-label={`${kind} phoneme ${phoneme}`}
          >
            {phoneme}
          </span>
        );
      })}
    </div>
  );
}

export function CapabilityTruth({ word, partOfSpeech, ipa, echoKey, schoolTheme }) {
  const displayWord = String(word || 'awaiting query').trim();
  const resolvedEchoKey = String(echoKey || 'pending').trim();

  return (
    <div className="oracle-capability-sigil">
      <div className="oracle-glyph-column">
        <span className="oracle-glyph-school" aria-hidden="true">{schoolTheme.glyph}</span>
        <span className="oracle-glyph-word">{displayWord.toUpperCase()}</span>
        <span className="oracle-glyph-underline" aria-hidden="true" />
      </div>

      <div className="oracle-capability-metadata">
        <div className="oracle-capability-row">
          <span className="oracle-summary-key">class</span>
          <span className="oracle-class-label" data-class-tone={classTone(partOfSpeech)}>
            {partOfSpeech || 'lexeme'}
          </span>
        </div>
        <div className="oracle-capability-row">
          <span className="oracle-summary-key">ipa</span>
          <PhonemeStrip ipa={ipa} fallbackWord={displayWord} />
        </div>
        <div className="oracle-capability-row">
          <span className="oracle-summary-key">echo key</span>
          <span className="oracle-rune-badge" aria-label={`Echo key ${resolvedEchoKey}`}>
            {resolvedEchoKey}
          </span>
        </div>
      </div>
    </div>
  );
}

export function DefinitionArchive({ definitions, etymology, itemMotionProps = {} }) {
  const rows = safeArray(definitions);

  return (
    <div className="oracle-definition-stack">
      {rows.map((definition, index) => {
        const branch = index === rows.length - 1 ? '└─' : '├─';
        const rank = index === 0 ? 'primary' : 'secondary';

        return (
          <motion.div
            key={`${definition}-${index}`}
            className="oracle-definition-row"
            data-weight={rank}
            title={etymology ? `Etymology trace: ${etymology}` : undefined}
            aria-label={`${rank} definition ${index + 1}: ${definition}`}
            {...itemMotionProps}
          >
            <span className="oracle-definition-weight" aria-hidden="true" />
            <span className="oracle-definition-branch" aria-hidden="true">{branch}</span>
            <span className="oracle-definition-text">{definition}</span>
          </motion.div>
        );
      })}
      {etymology && (
        <div className="oracle-etymology-trace">
          <span className="oracle-summary-key">etymology</span>
          <span>{etymology}</span>
        </div>
      )}
    </div>
  );
}

export function ResonanceMap({ scrollContext, onJumpToLine, itemMotionProps = {} }) {
  const occurrences = safeArray(scrollContext?.occurrences);
  const vowelFamily = scrollContext?.core?.vowelFamily || scrollContext?.core?.terminalVowelFamily || 'unknown';
  const schoolId = VOWEL_FAMILY_TO_SCHOOL[vowelFamily] || 'VOID';
  const maxLine = Math.max(
    1,
    ...occurrences.map((occurrence) => Number(occurrence?.line) || 1)
  );

  return (
    <div className="oracle-measured-reality">
      <div className="oracle-context-codex">
        <div className="oracle-school-badge" data-vowel-school={schoolId}>
          <span className="oracle-school-badge-glyph" aria-hidden="true">
            {scrollContext?.core?.schoolGlyph || '✦'}
          </span>
          <span>
            <span className="oracle-summary-key">school</span>
            <strong>{scrollContext?.core?.schoolName || 'unbound'}</strong>
          </span>
        </div>
        <div className="oracle-context-stat">
          <span className="oracle-summary-key">vowel family</span>
          <strong>{vowelFamily}</strong>
        </div>
        <div className="oracle-context-stat">
          <span className="oracle-summary-key">syllables</span>
          <strong>{scrollContext?.core?.syllableCount || '--'}</strong>
        </div>
        <div className="oracle-context-stat">
          <span className="oracle-summary-key">occurrences</span>
          <strong>{scrollContext?.totalOccurrences || occurrences.length || 0}</strong>
        </div>
      </div>

      {occurrences.length > 0 && (
        <div className="oracle-resonance-map" aria-label={`${occurrences.length} scroll occurrence markers`}>
          <svg viewBox="0 0 100 18" preserveAspectRatio="none" aria-hidden="true">
            <line className="oracle-resonance-map-line" x1="2" x2="98" y1="9" y2="9" />
            {occurrences.map((occurrence, index) => {
              const line = Number(occurrence?.line) || index + 1;
              const x = maxLine > 1 ? 4 + ((line - 1) / (maxLine - 1)) * 92 : 50;

              return (
                <circle
                  key={`${line}-${occurrence?.charStart ?? index}`}
                  className="oracle-resonance-marker"
                  cx={clamp(x, 4, 96)}
                  cy="9"
                  r={index === 0 ? 2.9 : 2.25}
                />
              );
            })}
          </svg>
        </div>
      )}

      {occurrences.length > 0 && (
        <div className="oracle-position-list">
          {occurrences.map((occurrence, index) => (
            <motion.button
              key={`${occurrence?.line}-${occurrence?.charStart}-${index}`}
              type="button"
              className="oracle-position-card"
              onClick={() => onJumpToLine?.(occurrence?.line)}
              aria-label={`Jump to ${occurrence?.word || 'word'} on line ${occurrence?.line || 'unknown'}`}
              {...itemMotionProps}
            >
              <span className="oracle-position-line">L{occurrence?.line || '--'}</span>
              <span className="oracle-position-word">{occurrence?.word || 'unmarked'}</span>
              <span className="oracle-position-char">char {occurrence?.charStart ?? '--'}</span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

export function WaveformIndicator({ tone }) {
  return (
    <svg className="oracle-waveform" viewBox="0 0 28 18" aria-hidden="true" focusable="false">
      <path d={waveformPath(tone)} />
    </svg>
  );
}

export function ChannelConstellation({ groups, onTokenSelect, itemMotionProps = {} }) {
  return (
    <div className="oracle-constellation-stack">
      {safeArray(groups).map((group) => (
        <motion.div
          key={group.id}
          className="oracle-constellation-channel"
          data-tone={group.tone}
          {...itemMotionProps}
        >
          <div className="oracle-constellation-head">
            <WaveformIndicator tone={group.tone} />
            <span className="oracle-channel-label">{group.label}</span>
          </div>
          {group.empty ? (
            <span className="oracle-channel-null">no echoes in archive</span>
          ) : (
            <div className="oracle-constellation-field">
              {safeArray(group.words).map((word, index) => (
                <button
                  key={`${group.id}-${word}`}
                  type="button"
                  className="oracle-constellation-token"
                  data-tone={group.tone}
                  data-strength={scoreToBucket(null, index, group.words.length)}
                  onClick={() => onTokenSelect?.(word)}
                  aria-label={`Resolve ${word} from ${group.label}`}
                >
                  {titleCase(word)}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function StarField({ clusters }) {
  const count = clamp(safeArray(clusters).length || 0, 0, 12);

  return (
    <div className="oracle-star-field" aria-label={`${count} astrology clusters`}>
      {Array.from({ length: Math.max(count, 1) }).map((_, index) => (
        <span
          key={`star-${index}`}
          className="oracle-star"
          data-star-size={scoreToBucket(null, index, Math.max(count, 1))}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function ScoreArc({ score }) {
  const normalized = clamp(Number(score) || 0, 0, 1);
  const dash = Math.round(normalized * 100);

  return (
    <svg className="oracle-score-arc" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
      <circle className="oracle-score-arc-track" cx="18" cy="18" r="14" pathLength="100" />
      <circle className="oracle-score-arc-value" cx="18" cy="18" r="14" pathLength="100" strokeDasharray={`${dash} 100`} />
    </svg>
  );
}

export function AstrologyTrace({ astrology, onTokenSelect, itemMotionProps = {} }) {
  const matches = safeArray(astrology?.topMatches);
  const clusters = safeArray(astrology?.clusters);
  const sign = String(astrology?.sign || 'unmarked').trim();

  return (
    <div className="oracle-astrology-trace">
      <div className="oracle-zodiac-sigil">
        <span className="oracle-zodiac-glyph" aria-hidden="true">{zodiacGlyph(sign)}</span>
        <span className="oracle-summary-key">sign</span>
        <strong>{sign || 'unmarked'}</strong>
      </div>
      <div className="oracle-cluster-field">
        <span className="oracle-summary-key">cluster count</span>
        <StarField clusters={clusters} />
      </div>

      {matches.length > 0 && (
        <div className="oracle-radar-list" aria-label="Top astrology matches">
          {matches.map((match, index) => {
            const token = String(match?.token || '').trim();
            if (!token) return null;
            const score = clamp(Number(match?.overallScore) || 0, 0, 1);

            return (
              <motion.button
                key={`${token}-${index}`}
                type="button"
                className="oracle-radar-token"
                data-strength={scoreToBucket(score)}
                onClick={() => onTokenSelect?.(token)}
                aria-label={`${token}, astrology match ${Math.round(score * 100)} percent`}
                {...itemMotionProps}
              >
                <ScoreArc score={score} />
                <span>{titleCase(token)}</span>
                <span className="oracle-radar-score">{Math.round(score * 100)}%</span>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FrequencySpectrum({ links, onJumpToLine, itemMotionProps = {} }) {
  const rows = safeArray(links);

  return (
    <div className="oracle-frequency-spectrum" aria-label="Live resonance frequency spectrum">
      {rows.map((link, index) => {
        const score = clamp(Number(link?.score) || 0, 0, 1);
        const line = link?.line;
        const label = `${link?.word || 'word'} ${link?.type || 'near'} resonance ${Math.round(score * 100)} percent`;

        return (
          <motion.button
            key={`${link?.word}-${line}-${index}`}
            type="button"
            className="oracle-frequency-bar"
            data-tone={link?.type || 'near'}
            data-strength={scoreToBucket(score)}
            onClick={() => onJumpToLine?.(line)}
            title={label}
            aria-label={`Jump to ${label} on line ${line || 'unknown'}`}
            {...itemMotionProps}
          >
            <span className="oracle-frequency-fill" aria-hidden="true" />
            <span className="oracle-frequency-token">{titleCase(link?.word)}</span>
            <span className="oracle-frequency-meta">{link?.type || 'near'} · L{line || '--'}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

export function SemanticKinConstellation({ semanticKin, onTokenSelect, itemMotionProps = {} }) {
  const rows = safeArray(semanticKin);

  return (
    <div className="oracle-kin-field">
      {rows.map((kin, index) => {
        const score = clamp(Number(kin?.score) || 0, 0, 1);
        const word = String(kin?.word || '').trim();
        if (!word) return null;

        return (
          <motion.button
            key={`kin-${word}-${index}`}
            type="button"
            className="oracle-kin-token"
            data-school={kin?.school || ''}
            data-strength={scoreToBucket(score)}
            onClick={() => onTokenSelect?.(word)}
            aria-label={`${word}, phonemic similarity ${Math.round(score * 100)} percent`}
            {...itemMotionProps}
          >
            <span>{titleCase(word)}</span>
            {score > 0 && <span className="oracle-token-score">{Math.round(score * 100)}%</span>}
          </motion.button>
        );
      })}
    </div>
  );
}
