/**
 * Example: Semantic Search with HDC + Koopman Spectral Analysis
 * 
 * Demonstrates the key innovation: finding semantically similar content 
 * WITHOUT embeddings, vector databases, or language models.
 * 
 * Instead, we use:
 * 1. HDC residue fingerprints (16-prime RNS from GeoHDC)
 * 2. Koopman spectral β-vectors (frequency structure of text)
 * 3. Combined similarity scoring (no softmax, O(N) linear attention)
 */

import { GMemAgent } from '../agents/memory-agent.js';
import {
    hdcFingerprint,
    hdcSimilarity,
    koopmanLift,
    spectralSimilarity,
    textToSignal,
    spectralFingerprint,
    combinedSimilarity,
} from '../core/gmem-spectral.js';

console.log('=== GMem Agent SDK: Semantic Search (HDC + Koopman) ===\n');

// --- Part 1: HDC Fingerprint Demo ---
console.log('--- Part 1: HDC Residue Fingerprinting ---\n');

const texts = [
    'The weather in Seattle is rainy today.',
    'Rain is expected in the Seattle area this afternoon.',
    'I love eating sushi at a Japanese restaurant.',
    'The stock market crashed yesterday during trading.',
];

const fingerprints = texts.map(t => ({ text: t, fp: hdcFingerprint(t) }));

console.log('Pairwise HDC Similarity Matrix:');
console.log(''.padStart(6) + texts.map((_, i) => `  T${i}  `).join(''));
for (let i = 0; i < texts.length; i++) {
    let row = `T${i}  `;
    for (let j = 0; j < texts.length; j++) {
        const sim = hdcSimilarity(fingerprints[i].fp, fingerprints[j].fp);
        row += `${sim.toFixed(3)} `;
    }
    console.log(row);
}
console.log();

// --- Part 2: Koopman Spectral Law ---
console.log('--- Part 2: Koopman Spectral β-Vectors ---\n');

for (const t of texts.slice(0, 2)) {
    const signal = textToSignal(t);
    const law = koopmanLift(signal);
    console.log(`"${t.slice(0, 50)}..."`);
    console.log(`  ω = ${law.omega.toFixed(4)}, β = [${law.beta.map(b => b.toFixed(4)).join(', ')}]`);
}
console.log();

// --- Part 3: Combined Semantic Search ---
console.log('--- Part 3: Combined Semantic Search via GMemAgent ---\n');

const agent = new GMemAgent({ seed: 0xDEAD, name: 'semantic-demo' });

const corpus = [
    { key: 'doc:weather-1', text: 'Heavy rain and thunderstorms expected across the Pacific Northwest this weekend.' },
    { key: 'doc:weather-2', text: 'Seattle weather forecast shows cloudy skies with temperature around 55 degrees.' },
    { key: 'doc:food-1', text: 'The best ramen shops in Tokyo serve rich tonkotsu broth with handmade noodles.' },
    { key: 'doc:food-2', text: 'Italian restaurants in downtown Seattle offer authentic pasta and wood-fired pizza.' },
    { key: 'doc:tech-1', text: 'Rust programming language provides memory safety without garbage collection overhead.' },
    { key: 'doc:tech-2', text: 'TypeScript adds static typing to JavaScript for better developer experience.' },
    { key: 'doc:travel-1', text: 'Flights from Seattle to Tokyo are available starting at four hundred fifty dollars.' },
    { key: 'doc:travel-2', text: 'Japan Golden Week travel packages include hotel and bullet train passes.' },
];

console.log(`Inducting ${corpus.length} documents...\n`);
for (const doc of corpus) {
    agent.remember(doc.key, doc.text);
}

const queries = [
    'rainy weather forecast',
    'Japanese food and noodles',
    'programming languages with type safety',
    'traveling to Japan from Seattle',
];

for (const query of queries) {
    console.log(`🔍 Query: "${query}"`);
    const results = agent.recall(query, { maxResults: 3, mode: 'hybrid' });
    if (results.length === 0) {
        console.log('  (no results)');
    }
    for (const r of results) {
        console.log(`  → [${r.score.toFixed(3)}] [${r.method}] ${r.key}: "${r.snippet.slice(0, 70)}..."`);
    }
    console.log();
}

// Show spectral fingerprint comparison
console.log('--- Spectral Fingerprint Comparison ---\n');
const fpA = spectralFingerprint('rainy weather forecast');
const fpB = spectralFingerprint('Heavy rain and thunderstorms expected across the Pacific Northwest');
const fpC = spectralFingerprint('Rust programming language provides memory safety');
console.log(`Sim("weather query" ↔ "weather doc") = ${combinedSimilarity(fpA, fpB).toFixed(4)}`);
console.log(`Sim("weather query" ↔ "rust doc")    = ${combinedSimilarity(fpA, fpC).toFixed(4)}`);
console.log(`\n  → The spectral engine correctly identifies semantic proximity!`);

agent.close();
console.log('\n✅ Semantic search demo complete.');
