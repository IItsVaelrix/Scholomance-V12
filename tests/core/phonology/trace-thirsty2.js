import { PhonemeEngine } from '../../../codex/core/phonology/phoneme.engine.js';

console.log("worst days syllables:", PhonemeEngine.analyzeDeep('worst days').syllables);
console.log("thirsty syllables:", PhonemeEngine.analyzeDeep('thirsty').syllables);

const match = PhonemeEngine.scoreMultiSyllableMatch(PhonemeEngine.analyzeDeep('worst days'), PhonemeEngine.analyzeDeep('thirsty'));
console.log("match score:", match);
