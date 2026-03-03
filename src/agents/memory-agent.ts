/**
 * GMemAgent — High-Level Agent with Generative Memory
 * 
 * Drop-in agent class that provides session memory, search, and persistence
 * backed by the GMem mathematical manifold.
 */

import { GMemContext, type GMemContextOptions } from '../core/gmem-context.js';
import { GMemSearch, type SearchResult, type SearchOptions } from '../core/gmem-search.js';
import { GMemPersistence, type PersistenceOptions } from '../core/gmem-persistence.js';
import { Dreamer } from './dreamer.js';

export interface GMemAgentOptions {
    /** Base seed. Default: random */
    seed?: number | bigint;
    /** Agent name for persistence. Default: 'assistant' */
    name?: string;
    /** Persistence options. If omitted, memory is ephemeral. */
    stateDir?: string;
}

export class GMemAgent {
    public readonly ctx: GMemContext;
    public readonly search: GMemSearch;
    public readonly persistence?: GMemPersistence;
    public readonly dreamer: Dreamer;
    public readonly name: string;

    private _sessionCount = 0;

    constructor(options: GMemAgentOptions = {}) {
        this.name = options.name ?? 'default';

        const ctxOptions: GMemContextOptions = {
            seed: options.seed ?? 1337,
        };

        this.ctx = new GMemContext(ctxOptions);
        this.search = new GMemSearch(this.ctx);
        this.dreamer = new Dreamer(this);

        if (options.stateDir) {
            this.persistence = new GMemPersistence({
                stateDir: options.stateDir,
            });
            this.persistence.attach(this.ctx, this.name);

            // Reconstruct state from AOF
            const replayed = this.persistence.replay(this.ctx, this.name);
            if (replayed > 0) {
                // console.log(`[GMem SDK] Replayed ${replayed} records from AOF.`);
            }
        }
    }

    /**
     * Store content in the manifold with the given key.
     */
    remember(key: string, content: string): void {
        this.search.induct(key, content);
    }

    /**
     * Store a conversation turn using an automatic key.
     */
    rememberTurn(content: string): string {
        const key = `${this.name}:turn:${this._sessionCount++}`;
        this.remember(key, content);
        return key;
    }

    /**
     * Recall memories matching the query.
     * Uses hybrid search + graph associations if available.
     */
    recall(query: string, options: SearchOptions = {}): SearchResult[] {
        // 1. Perform standard hybrid search (spectral + literal)
        const primaryResults = this.search.search(query, options);

        // 2. If we have a top match and a Dreamer graph, expand query via associations
        if (primaryResults.length > 0 && primaryResults[0].score > 0.7) {
            const topKey = primaryResults[0].key;
            const associations = this.dreamer.getAssociations(topKey, 2);

            for (const assoc of associations) {
                // Only add if not already in results
                if (!primaryResults.some(r => r.key === assoc.target)) {
                    const content = this.ctx.retrieve(assoc.target, options.maxSnippetLength ?? 500);
                    primaryResults.push({
                        key: assoc.target,
                        score: assoc.weight * 0.9, // Penalty for associative jump
                        snippet: content,
                        method: 'hybrid'
                    });
                }
            }
        }

        return primaryResults.sort((a, b) => b.score - a.score);
    }

    /**
     * Run a consolidation cycle to build associative links between memories.
     */
    dream(threshold = 0.55): number {
        return this.dreamer.consolidate(threshold);
    }

    /**
     * Direct manifold fetch at a specific address.
     */
    fetch(addr: bigint | number): number {
        return this.ctx.fetch(addr);
    }

    /**
     * Direct manifold write at a specific address.
     */
    write(addr: bigint | number, value: number): void {
        this.ctx.write(addr, value);
    }

    /**
     * Get agent status.
     */
    status() {
        return {
            name: this.name,
            seed: this.ctx.seed.toString(),
            overlayEntries: this.ctx.overlayCount,
            registeredKeys: this.search.getKeys().length,
            sessionTurns: this._sessionCount,
            persisted: !!this.persistence,
        };
    }

    /** 
     * Cleanup. Must be called to free Rust resources.
     */
    close(): void {
        this.ctx.free();
    }
}
