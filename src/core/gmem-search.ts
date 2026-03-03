/**
 * GMem Semantic Search Engine
 * 
 * Provides high-level search over inducted content using
 * manifold-native techniques:
 * 
 * 1. Literal Recall — direct character-level retrieval from hashed addresses
 * 2. Frequency Fingerprinting — Koopman Spectral Sonar (Phase A, requires FFI)
 * 3. Structural Navigation — Anchor Navigator SVD (Phase B, requires FFI)
 * 
 * Currently implements (1) with a framework for (2) and (3).
 */

import { GMemContext } from './gmem-context.js';

export interface SearchResult {
    /** The key that matched */
    key: string;
    /** Relevance score [0, 1] */
    score: number;
    /** Retrieved content snippet */
    snippet: string;
    /** Search method used */
    method: 'literal' | 'koopman' | 'anchor';
}

export interface SearchOptions {
    /** Maximum results to return. Default: 10 */
    maxResults?: number;
    /** Minimum score threshold. Default: 0.1 */
    minScore?: number;
    /** Maximum snippet length. Default: 500 */
    maxSnippetLength?: number;
}

export class GMemSearch {
    private ctx: GMemContext;
    private keys: Set<string> = new Set();

    constructor(ctx: GMemContext) {
        this.ctx = ctx;
    }

    /** Register a key that has been inducted into the manifold. */
    registerKey(key: string): void {
        this.keys.add(key);
    }

    /** Register multiple keys. */
    registerKeys(keys: Iterable<string>): void {
        for (const key of keys) {
            this.keys.add(key);
        }
    }

    /** Get all registered keys. */
    getKeys(): string[] {
        return [...this.keys];
    }

    /**
     * Search the manifold for content matching the query.
     * Uses literal substring matching on recalled content.
     */
    search(query: string, options: SearchOptions = {}): SearchResult[] {
        const {
            maxResults = 10,
            minScore = 0.1,
            maxSnippetLength = 500,
        } = options;

        const results: SearchResult[] = [];
        const queryLower = query.toLowerCase();

        for (const key of this.keys) {
            const content = this.ctx.retrieve(key, maxSnippetLength);
            if (!content) continue;

            const contentLower = content.toLowerCase();

            // Score based on query match quality
            let score = 0;

            if (contentLower.includes(queryLower)) {
                // Direct substring match — high confidence
                const matchRatio = queryLower.length / contentLower.length;
                score = 0.7 + (matchRatio * 0.3); // [0.7, 1.0]
            } else {
                // Word-level overlap scoring
                const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
                const contentWords = new Set(contentLower.split(/\s+/));

                if (queryWords.length > 0) {
                    const matches = queryWords.filter(w => contentWords.has(w)).length;
                    score = (matches / queryWords.length) * 0.7; // [0, 0.7]
                }
            }

            if (score >= minScore) {
                results.push({
                    key,
                    score,
                    snippet: content.slice(0, maxSnippetLength),
                    method: 'literal',
                });
            }
        }

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
    }

    /**
     * Induct content and register the key in one call.
     */
    induct(key: string, content: string): void {
        this.ctx.induct(key, content);
        this.registerKey(key);
    }

    /**
     * Batch induction for multiple key-content pairs.
     */
    inductBatch(entries: Array<{ key: string; content: string }>): void {
        for (const entry of entries) {
            this.induct(entry.key, entry.content);
        }
    }
}
