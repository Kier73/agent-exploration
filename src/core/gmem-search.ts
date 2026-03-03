/**
 * GMem Semantic Search Engine
 * 
 * Provides high-level search over inducted content using:
 * 1. Literal Recall — direct character-level retrieval from hashed addresses
 * 2. HDC Fingerprinting — 16-prime RNS residue signatures
 * 3. Koopman Spectral — β-vector cosine similarity for topic matching
 * 4. Hybrid — blended literal + spectral scoring
 */

import { GMemContext } from './gmem-context.js';
import {
    spectralFingerprint,
    combinedSimilarity,
    type HDCSignature,
    type SpectralLaw,
} from './gmem-spectral.js';

export interface SearchResult {
    /** The key that matched */
    key: string;
    /** Relevance score [0, 1] */
    score: number;
    /** Retrieved content snippet */
    snippet: string;
    /** Search method used */
    method: 'literal' | 'spectral' | 'hybrid';
}

export interface SearchOptions {
    /** Maximum results to return. Default: 10 */
    maxResults?: number;
    /** Minimum score threshold. Default: 0.1 */
    minScore?: number;
    /** Maximum snippet length. Default: 500 */
    maxSnippetLength?: number;
    /** Search mode. Default: 'hybrid' */
    mode?: 'literal' | 'spectral' | 'hybrid';
}

interface IndexedEntry {
    key: string;
    fingerprint: { hdc: HDCSignature; law: SpectralLaw };
}

export class GMemSearch {
    private ctx: GMemContext;
    private keys: Set<string> = new Set();
    private index: Map<string, IndexedEntry> = new Map();

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
     * Uses hybrid HDC+Koopman spectral similarity + literal matching.
     */
    search(query: string, options: SearchOptions = {}): SearchResult[] {
        const {
            maxResults = 10,
            minScore = 0.1,
            maxSnippetLength = 500,
            mode = 'hybrid',
        } = options;

        const results: SearchResult[] = [];
        const queryLower = query.toLowerCase();
        const queryFingerprint = spectralFingerprint(query);

        for (const key of this.keys) {
            const content = this.ctx.retrieve(key, maxSnippetLength);
            if (!content) continue;

            const contentLower = content.toLowerCase();
            let score = 0;
            let method: SearchResult['method'] = 'literal';

            if (mode === 'literal' || mode === 'hybrid') {
                // Literal scoring
                if (contentLower.includes(queryLower)) {
                    const matchRatio = queryLower.length / contentLower.length;
                    score = 0.7 + (matchRatio * 0.3);
                } else {
                    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
                    const contentWords = new Set(contentLower.split(/\s+/));
                    if (queryWords.length > 0) {
                        const matches = queryWords.filter(w => contentWords.has(w)).length;
                        score = (matches / queryWords.length) * 0.7;
                    }
                }
            }

            if (mode === 'spectral' || mode === 'hybrid') {
                // Spectral scoring via HDC + Koopman
                let entry = this.index.get(key);
                if (!entry) {
                    const fp = spectralFingerprint(content);
                    entry = { key, fingerprint: fp };
                    this.index.set(key, entry);
                }

                const spectralScore = combinedSimilarity(queryFingerprint, entry.fingerprint);
                method = mode === 'spectral' ? 'spectral' : 'hybrid';

                if (mode === 'hybrid') {
                    // Blend: max(literal, spectral * 0.8)
                    score = Math.max(score, spectralScore * 0.8);
                } else {
                    score = spectralScore;
                }
            }

            if (score >= minScore) {
                results.push({
                    key,
                    score,
                    snippet: content.slice(0, maxSnippetLength),
                    method,
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
        // Pre-compute spectral fingerprint
        const fp = spectralFingerprint(content);
        this.index.set(key, { key, fingerprint: fp });
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
