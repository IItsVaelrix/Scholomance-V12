import { pickRandomSonicStationTrack } from './codex/core/constants/data/sonicStationBuckets.js';

console.log("No filter:", pickRandomSonicStationTrack());
console.log("No filter 2:", pickRandomSonicStationTrack());
console.log("SONIC filter:", pickRandomSonicStationTrack({ schoolId: 'SONIC' }));
console.log("SONIC filter 2:", pickRandomSonicStationTrack({ schoolId: 'SONIC' }));
console.log("SONIC filter 3:", pickRandomSonicStationTrack({ schoolId: 'SONIC' }));
console.log("SONIC filter 4:", pickRandomSonicStationTrack({ schoolId: 'SONIC' }));
console.log("SONIC filter 5:", pickRandomSonicStationTrack({ schoolId: 'SONIC' }));
