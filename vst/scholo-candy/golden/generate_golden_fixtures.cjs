const fs = require('fs');

// Reference: W3C Web Audio API (Audio EQ Cookbook)
function computeCoefficients(type, Fs, f0, Q, gain) {
    const w0 = 2 * Math.PI * f0 / Fs;
    const alpha = Math.sin(w0) / (2 * Q);
    const A = Math.pow(10, gain / 40);

    let b0, b1, b2, a0, a1, a2;

    switch (type) {
        case 'bell': // peaking
            b0 = 1 + alpha * A;
            b1 = -2 * Math.cos(w0);
            b2 = 1 - alpha * A;
            a0 = 1 + alpha / A;
            a1 = -2 * Math.cos(w0);
            a2 = 1 - alpha / A;
            break;
        case 'lowPass':
            b0 = (1 - Math.cos(w0)) / 2;
            b1 = 1 - Math.cos(w0);
            b2 = (1 - Math.cos(w0)) / 2;
            a0 = 1 + alpha;
            a1 = -2 * Math.cos(w0);
            a2 = 1 - alpha;
            break;
        case 'highPass':
            b0 = (1 + Math.cos(w0)) / 2;
            b1 = -(1 + Math.cos(w0));
            b2 = (1 + Math.cos(w0)) / 2;
            a0 = 1 + alpha;
            a1 = -2 * Math.cos(w0);
            a2 = 1 - alpha;
            break;
        // other types can be added
        default:
            throw new Error('Unsupported filter type: ' + type);
    }

    // Normalize by a0
    return {
        b0: b0 / a0,
        b1: b1 / a0,
        b2: b2 / a0,
        a1: a1 / a0,
        a2: a2 / a0
    };
}

function computeFrequencyResponse(coeffs, freqs, Fs) {
    const { b0, b1, b2, a1, a2 } = coeffs;
    const response = [];

    for (const f of freqs) {
        const w = 2 * Math.PI * f / Fs;
        
        // Numerator: b0 + b1 * e^{-jw} + b2 * e^{-j2w}
        const numRe = b0 + b1 * Math.cos(w) + b2 * Math.cos(2 * w);
        const numIm = -(b1 * Math.sin(w) + b2 * Math.sin(2 * w));
        
        // Denominator: 1 + a1 * e^{-jw} + a2 * e^{-j2w}
        const denRe = 1 + a1 * Math.cos(w) + a2 * Math.cos(2 * w);
        const denIm = -(a1 * Math.sin(w) + a2 * Math.sin(2 * w));
        
        const numMagSq = numRe * numRe + numIm * numIm;
        const denMagSq = denRe * denRe + denIm * denIm;
        
        const mag = Math.sqrt(numMagSq / denMagSq);
        response.push(mag);
    }
    
    return response;
}

const Fs = 48000;
const freqs = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

const cases = [
    { type: 'bell', f0: 1000, Q: 1.0, gain: 6.0 },
    { type: 'bell', f0: 1000, Q: 1.0, gain: -6.0 },
    { type: 'bell', f0: 100, Q: 4.0, gain: 12.0 },
    { type: 'bell', f0: 10000, Q: 0.5, gain: -12.0 },
    { type: 'lowPass', f0: 1000, Q: 0.707, gain: 0 },
    { type: 'highPass', f0: 100, Q: 0.707, gain: 0 },
];

const fixtures = [];

for (const c of cases) {
    const coeffs = computeCoefficients(c.type, Fs, c.f0, c.Q, c.gain);
    const mags = computeFrequencyResponse(coeffs, freqs, Fs);
    fixtures.push({
        params: c,
        sampleRate: Fs,
        frequencies: freqs,
        coefficients: coeffs,
        magnitudeResponseLinear: mags
    });
}

fs.writeFileSync('web_eq_snapshots.json', JSON.stringify(fixtures, null, 2));
console.log('Generated web_eq_snapshots.json');
