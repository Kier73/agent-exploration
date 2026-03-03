/**
 * Example: Session Memory
 * 
 * Demonstrates using GMemAgent for conversational session storage:
 * 1. Remember conversation turns
 * 2. Recall by topic
 * 3. Persist state across restarts
 */

import { GMemAgent } from '../agents/memory-agent.js';

console.log('=== GMem Agent SDK: Session Memory ===\n');

const agent = new GMemAgent({
    seed: 0xCAFE,
    name: 'assistant',
    stateDir: './.gmem-demo',
});

console.log('Agent Status:', agent.status());

// Simulate a conversation
const turns = [
    'User asked about the weather forecast for tomorrow in Seattle.',
    'Assistant provided the forecast: partly cloudy, high of 62°F.',
    'User then asked about restaurant recommendations near Pike Place Market.',
    'Assistant suggested three restaurants: The Walrus and the Carpenter, Beechers, and Piroshky Piroshky.',
    'User asked about the history of the Space Needle.',
    'Assistant explained it was built for the 1962 World Fair.',
    'User thanked the assistant and asked to remember their favorite restaurant is Beechers.',
    'User asked about flight prices from Seattle to Tokyo.',
    'Assistant found flights ranging from $450 to $1200 depending on dates.',
    'User discussed their travel plans for Golden Week in Japan.',
];

console.log(`\nInducting ${turns.length} conversation turns...\n`);
for (const turn of turns) {
    const key = agent.rememberTurn(turn);
    console.log(`  📝 ${key}: "${turn.slice(0, 60)}..."`);
}

console.log('\n--- Recall Tests ---\n');

// Test 1: Weather
const weatherResults = agent.recall('weather forecast');
console.log('🔍 Query: "weather forecast"');
for (const r of weatherResults) {
    console.log(`  → [${r.score.toFixed(2)}] ${r.key}: "${r.snippet.slice(0, 80)}..."`);
}

// Test 2: Restaurants  
console.log('\n🔍 Query: "restaurant recommendations"');
const foodResults = agent.recall('restaurant recommendations');
for (const r of foodResults) {
    console.log(`  → [${r.score.toFixed(2)}] ${r.key}: "${r.snippet.slice(0, 80)}..."`);
}

// Test 3: Travel
console.log('\n🔍 Query: "travel Japan"');
const travelResults = agent.recall('travel Japan');
for (const r of travelResults) {
    console.log(`  → [${r.score.toFixed(2)}] ${r.key}: "${r.snippet.slice(0, 80)}..."`);
}

console.log('\n--- Final Agent Status ---');
console.log(agent.status());

agent.close();
console.log('\n✅ Session memory demo complete.');
