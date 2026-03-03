/**
 * Example: Dream Consolidation
 * 
 * Demonstrates the Dreamer enhancement. The agent inducts memories,
 * then "sleeps" and runs a background consolidation cycle to discover
 * related semantic concepts. This builds an Anchor Graph for O(1) recall.
 */

import { GMemAgent } from '../agents/memory-agent.js';
import { Dreamer } from '../agents/dreamer.js';

console.log('=== GMem Agent SDK: Dream Consolidation ===\n');

// 1. Create Agent and memories
const agent = new GMemAgent({ seed: 777, name: 'dream-demo' });

const memories = [
    { key: 'memory:1', text: 'The Seattle Mariners won their baseball game last night in the 9th inning.' },
    { key: 'memory:2', text: 'I love eating clam chowder down at Pike Place Market.' },
    { key: 'memory:3', text: 'Ken Griffey Jr. is a legend of Seattle sports history.' },
    { key: 'memory:4', text: 'A strong storm is predicted to hit the Pacific Northwest tomorrow.' },
    { key: 'memory:5', text: 'The best seafood in the city is definitely Dungeness crab.' },
    { key: 'memory:6', text: 'Machine learning models require significant compute power.' },
];

console.log('Inducting memories into the manifold...\n');
for (const m of memories) {
    agent.remember(m.key, m.text);
    console.log(`  Inducted: [${m.key}] "${m.text.slice(0, 50)}..."`);
}

// 2. The Dream Cycle
console.log('\n--- Initiating Dream Cycle (Background Consolidation) ---\n');

const dreamer = new Dreamer(agent);
const threshold = 0.55; // High threshold for strong associations
const edgeCount = dreamer.consolidate(threshold);

console.log(`Dream cycle complete. Discovered ${edgeCount} strong semantic associations (threshold > ${threshold}).\n`);

// 3. Show Associations
console.log('Anchor Graph (Associative Memory):\n');
const keys = memories.map(m => m.key);

for (const key of keys) {
    const associations = dreamer.getAssociations(key);
    console.log(`[${key}] is associated with:`);
    if (associations.length === 0) {
        console.log('  (none)');
    } else {
        for (const assoc of associations) {
            console.log(`  → ${assoc.target} (score: ${assoc.weight.toFixed(3)})`);
        }
    }
    console.log('');
}

// O(1) Recall Demonstration
console.log('--- Zero-Search Recall Demonstration ---\n');
console.log('Querying associative links for "memory:1" (Baseball game)...');
const instantResults = dreamer.getAssociations('memory:1');
for (const assoc of instantResults) {
    const text = memories.find(m => m.key === assoc.target)?.text;
    console.log(`  O(1) Retrieved: [${assoc.target}] "${text}" (score: ${assoc.weight.toFixed(3)})`);
}

agent.close();
console.log('\n✅ Dream Consolidation demo complete.');
