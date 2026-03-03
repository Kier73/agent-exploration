/**
 * OpenClaw Adapter
 * 
 * Drop-in integration layer for OpenClaw AI assistant.
 * Maps OpenClaw's memory architecture to the GMem Agent SDK.
 * 
 * Usage in OpenClaw's MemoryIndexManager:
 *   import { OpenClawAdapter } from '@kier73/gmem-agent/adapters/openclaw';
 *   const adapter = new OpenClawAdapter({ seed: 42, agentId: 'agent-abc' });
 *   adapter.inductSession(sessionKey, content);
 *   const results = adapter.searchSessions(query);
 */

import { GMemAgent } from '../agents/memory-agent.js';
import { spectralFingerprint, combinedSimilarity } from '../core/gmem-spectral.js';
import type { SearchResult } from '../core/gmem-search.js';

export interface OpenClawAdapterOptions {
    /** Manifold seed */
    seed?: number | bigint;
    /** Agent ID for namespace isolation */
    agentId: string;
    /** State directory for persistence */
    stateDir?: string;
}

export interface OpenClawSearchResult {
    source: 'sessions';
    path: string;
    startLine: number;
    endLine: number;
    score: number;
    snippet: string;
}

export class OpenClawAdapter {
    private agent: GMemAgent;
    private agentId: string;

    constructor(options: OpenClawAdapterOptions) {
        this.agentId = options.agentId;
        this.agent = new GMemAgent({
            seed: options.seed ?? 1337,
            name: `openclaw-${options.agentId}`,
            stateDir: options.stateDir,
        });
    }

    /**
     * Induct a session transcript into the manifold.
     * Call this from OpenClaw's indexFile override.
     */
    inductSession(sessionKey: string, content: string): void {
        const key = `sessions/${sessionKey}`;
        this.agent.remember(key, content);
    }

    /**
     * Search sessions using HDC+Koopman spectral similarity.
     * Returns results compatible with OpenClaw's MemorySearchResult.
     */
    searchSessions(query: string, limit = 10): OpenClawSearchResult[] {
        const results = this.agent.recall(query, {
            maxResults: limit,
            mode: 'hybrid',
            minScore: 0.3,
        });

        return results.map(r => ({
            source: 'sessions' as const,
            path: r.key,
            startLine: 1,
            endLine: Infinity,
            score: r.score,
            snippet: `[Generative Recall | score=${r.score.toFixed(3)}]: ${r.snippet}`,
        }));
    }

    /**
     * Get adapter status.
     */
    status() {
        return {
            agentId: this.agentId,
            ...this.agent.status(),
        };
    }

    /** Cleanup. */
    close(): void {
        this.agent.close();
    }
}
