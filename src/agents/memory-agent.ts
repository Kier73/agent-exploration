/**
 * GMemAgent — High-Level Agent with Generative Memory
 * 
 * Drop-in agent class that provides session memory, search, and persistence
 * backed by the GMem mathematical manifold.
 * 
 * Usage:
 *   const agent = new GMemAgent({ seed: 42, stateDir: './.gmem' });
 *   agent.remember('session-1', 'User asked about the weather');
 *   const results = agent.recall('weather');
 */

import { GMemContext, type GMemContextOptions } from '../core/gmem-context.js';
import { GMemSearch, type SearchResult, type SearchOptions } from '../core/gmem-search.js';
import { GMemPersistence, type PersistenceOptions } from '../core/gmem-persistence.js';

export interface GMemAgentOptions {
    /** Manifold seed. Default: 1337 */
    seed?: number | bigint;
    /** Directory for persistent state. If omitted, memory is ephemeral. */
    stateDir?: string;
    /** Agent name for persistence isolation. Default: 'default' */
    name?: string;
}

export class GMemAgent {
    readonly ctx: GMemContext;
    readonly search: GMemSearch;
    readonly persistence?: GMemPersistence;
    readonly name: string;

    private _sessionCount = 0;

    constructor(options: GMemAgentOptions = {}) {
        this.name = options.name ?? 'default';

        const ctxOptions: GMemContextOptions = {
            seed: options.seed ?? 1337,
        };

        this.ctx = new GMemContext(ctxOptions);
        this.search = new GMemSearch(this.ctx);

        if (options.stateDir) {
            this.persistence = new GMemPersistence({
                stateDir: options.stateDir,
            });
            this.persistence.attach(this.ctx, this.name);
        }
    }

    /**
     * Remember content under a key.
     * Equivalent to induction + registration in one call.
     */
    remember(key: string, content: string): void {
        this.search.induct(key, content);
    }

    /**
     * Remember a session turn with automatic key generation.
     */
    rememberTurn(content: string): string {
        const key = `${this.name}:turn:${this._sessionCount++}`;
        this.remember(key, content);
        return key;
    }

    /**
     * Recall content matching a query.
     */
    recall(query: string, options?: SearchOptions): SearchResult[] {
        return this.search.search(query, options);
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
    status(): {
        name: string;
        seed: string;
        overlayEntries: number;
        registeredKeys: number;
        sessionTurns: number;
        persisted: boolean;
    } {
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
