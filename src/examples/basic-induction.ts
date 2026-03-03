/**
 * Example: Basic Induction & Retrieval
 * 
 * Demonstrates the simplest GMem workflow:
 * 1. Create a context
 * 2. Induct text
 * 3. Retrieve it back from the manifold
 */

import { GMemContext } from '../core/gmem-context.js';

console.log('=== GMem Agent SDK: Basic Induction ===\n');

const ctx = new GMemContext({ seed: 42 });
console.log(`Context created with seed: ${ctx.seed}`);

// Induct some content
const key = 'hello_world';
const content = 'Generative Memory maps infinite state into O(1) mathematical synthesis.';

console.log(`\nInducting: "${content}"`);
ctx.induct(key, content);
console.log(`Overlay entries after induction: ${ctx.overlayCount}`);

// Retrieve it
console.log('\nRetrieving from manifold...');
const recalled = ctx.retrieve(key);
console.log(`Retrieved: "${recalled}"`);

// Verify
if (recalled === content) {
    console.log('\n✅ VERIFICATION SUCCESSFUL — Perfect round-trip through the manifold!');
} else {
    console.error('\n❌ VERIFICATION FAILED');
    process.exit(1);
}

// Show synthetic baseline (addresses without explicit writes)
console.log('\n--- Synthetic Baseline (unwritten addresses) ---');
for (let i = 0n; i < 5n; i++) {
    const val = ctx.fetch(i);
    console.log(`  fetch(${i}) = ${val.toFixed(16)} (purely mathematical)`);
}

ctx.free();
console.log('\n🧹 Context freed. Done.');
