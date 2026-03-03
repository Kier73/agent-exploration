import test from 'node:test';
import assert from 'node:assert';
import {
    hdcFingerprint,
    hdcCombine,
    hdcSimilarity,
    koopmanLift,
    textToSignal,
    spectralSimilarity,
    combinedSimilarity,
    spectralFingerprint
} from '../core/gmem-spectral.js';

test('HDC Fingerprinting (GeoHDC Port)', async (t) => {
    await t.test('Identical strings produce identical residue fingerprints', () => {
        const fp1 = hdcFingerprint('hello world');
        const fp2 = hdcFingerprint('hello world');
        assert.deepStrictEqual(fp1.residues, fp2.residues);
        assert.strictEqual(fp1.length, fp2.length);
    });

    await t.test('Different strings produce distinct fingerprints', () => {
        const fp1 = hdcFingerprint('hello world');
        const fp2 = hdcFingerprint('hello earth');
        assert.notDeepStrictEqual(fp1.residues, fp2.residues);
    });

    await t.test('HDC Similarity scoring', () => {
        // Use longer strings with significant structural difference
        // HDC residues aggregate character XOR position, so small changes
        // in long strings lead to high similarity, while short strings are noisy.
        const base = "This is a long test string designed to verify HDC similarity metrics.";
        const sim = "This is a long test string designed to verify HDC similarity values.";
        const diff = "Something completely unrelated to the testing of HDC structures.";

        const fpBase = hdcFingerprint(base);
        const fpSim = hdcFingerprint(sim);
        const fpDiff = hdcFingerprint(diff);

        const s1 = hdcSimilarity(fpBase, fpSim);
        const s2 = hdcSimilarity(fpBase, fpDiff);

        assert.ok(s1 > s2, `Structural similarity (${s1.toFixed(3)}) should be higher than random (${s2.toFixed(3)})`);
        assert.strictEqual(hdcSimilarity(fpBase, fpBase), 1.0);
    });

    await t.test('HDC Holographic Composition', () => {
        const fpA = hdcFingerprint('Alpha');
        const fpB = hdcFingerprint('Beta');
        const combined = hdcCombine(fpA, fpB);
        assert.strictEqual(combined.length, fpA.length + fpB.length);
        assert.strictEqual(combined.residues.length, 16);
    });
});

test('Koopman Spectral Lifting', async (t) => {
    await t.test('Extracts spectral law from text signal', () => {
        const text = 'Generative Memory mapping to mathematical manifold.';
        const signal = textToSignal(text);
        const law = koopmanLift(signal);

        assert.ok(typeof law.omega === 'number', 'Omega should be a number');
        assert.strictEqual(law.beta.length, 5, 'Beta regression should be 5D');
    });

    await t.test('Spectral similarity aligns with signal frequency', () => {
        // High frequency oscillations
        const a = koopmanLift([1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]);
        const b = koopmanLift([1, 0.1, 0.9, 0, 1, 0.2, 0.8, 0, 1, 0, 1, 0.1, 0.9, 0, 1, 0]);
        // Low frequency
        const c = koopmanLift([1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0]);

        const simAB = spectralSimilarity(a, b);
        const simAC = spectralSimilarity(a, c);

        assert.ok(simAB > simAC, `Frequency similarity (${simAB.toFixed(3)}) should be higher than frequency difference (${simAC.toFixed(3)})`);
    });
});
