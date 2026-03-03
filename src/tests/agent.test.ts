import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { GMemAgent } from '../agents/memory-agent.js';

test('GMemAgent Core Operations', async (t) => {
    await t.test('Induction and Literal Recall', async () => {
        const agent = new GMemAgent({ seed: 1337, name: 'test-agent' });

        agent.remember('test:key:1', 'The quick brown fox jumps over the lazy dog.');
        agent.remember('test:key:2', 'Pack my box with five dozen liquor jugs.');

        const results = agent.recall('brown fox', { mode: 'literal' });
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].key, 'test:key:1');
        assert.ok(results[0].score > 0.5); // High confidence literal

        agent.close();
    });

    await t.test('Spectral Recall', async () => {
        const agent = new GMemAgent({ seed: 9999, name: 'spectral-test' });

        agent.remember('doc:1', 'Seattle weather is generally rainy in November.');
        agent.remember('doc:2', 'I love eating authentic Japanese sushi.');

        // Testing semantic similarity - shouldn't rely on exact keyword match
        const results = agent.recall('forecast and rain', { mode: 'spectral' });

        assert.ok(results.length > 0);
        assert.strictEqual(results[0].key, 'doc:1', 'Spectral engine should rank weather doc highest');

        agent.close();
    });

    await t.test('Persistence and State Reconstruction', async () => {
        const stateDir = './.gmem-test-state';

        // Clean up from previous test runs if needed
        if (fs.existsSync(stateDir)) {
            fs.rmSync(stateDir, { recursive: true, force: true });
        }

        // 1. Create agent and write state
        const agent1 = new GMemAgent({ seed: 12345, name: 'persist-test', stateDir });
        agent1.remember('key:persist', 'This memory must survive.');

        // Give the OS/Rust a moment to flush the AOF
        await new Promise(resolve => setTimeout(resolve, 100));
        agent1.close();

        // 2. State should exist on disk
        const aofPath = agent1.persistence!.aofPath(agent1.name);
        const exists = fs.existsSync(aofPath);
        const stats = exists ? fs.statSync(aofPath) : null;

        // console.log(`[TEST] AOF Path: ${aofPath}, size: ${stats?.size}`);

        assert.ok(exists, `AOF file should be created at ${aofPath}`);
        assert.ok(stats && stats.size > 0, `AOF file should not be empty (size: ${stats?.size})`);

        // 3. Re-create agent, it should load the AOF automatically in Rust
        const agent2 = new GMemAgent({ seed: 12345, name: 'persist-test', stateDir });

        // Ensure AOF path is identical
        assert.strictEqual(agent2.persistence!.aofPath(agent2.name), aofPath);

        // Use a small delay for Rust to load the file on attach
        await new Promise(resolve => setTimeout(resolve, 50));

        // Manifold retrieve
        const reconstructed = agent2.ctx.retrieve('key:persist');

        assert.strictEqual(reconstructed, 'This memory must survive.', 'AOF Persistence should reload memory payload');

        agent2.close();
        fs.rmSync(stateDir, { recursive: true, force: true });
    });
});
