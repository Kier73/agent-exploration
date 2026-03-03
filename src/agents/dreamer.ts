/**
 * Abstract enhancement: Dreamer
 * 
 * In cognitive architectures, "Dreaming" is the process of background
 * consolidation. The Dreamer periodically scans inducted memories, 
 * computes pairwise similarities, and builds an associative `AnchorGraph`.
 * 
 * This enables agents to do O(1) semantic leaps (e.g., retrieving related
 * memories instantly without rescoring the entire space).
 */

import { GMemAgent } from './memory-agent.js';
import { combinedSimilarity, type HDCSignature, type SpectralLaw } from '../core/gmem-spectral.js';

export interface AnchorGraphEdge {
    source: string;
    target: string;
    weight: number; // Similarity score [0, 1]
}

export class Dreamer {
    private agent: GMemAgent;
    private memoryGraph: Map<string, AnchorGraphEdge[]> = new Map();

    constructor(agent: GMemAgent) {
        this.agent = agent;
    }

    /**
     * Run a consolidation cycle ("dream").
     * Computes NxN similarities between all indexed entries in the agent.
     * 
     * @param threshold Minimum similarity to form an edge.
     */
    consolidate(threshold = 0.5): number {
        const keys = this.agent.search['getKeys'](); // Accessing internal keys
        const index = this.agent.search['index']; // Accessing internal fingerprint index

        this.memoryGraph.clear();
        let edgesFormed = 0;

        for (let i = 0; i < keys.length; i++) {
            const keyA = keys[i];
            const entryA = index.get(keyA);
            if (!entryA) continue;

            const edges: AnchorGraphEdge[] = [];

            for (let j = 0; j < keys.length; j++) {
                if (i === j) continue;

                const keyB = keys[j];
                const entryB = index.get(keyB);
                if (!entryB) continue;

                const score = combinedSimilarity(entryA.fingerprint, entryB.fingerprint);

                if (score >= threshold) {
                    edges.push({ source: keyA, target: keyB, weight: score });
                    edgesFormed++;
                }
            }

            // Sort edges by weight descending
            edges.sort((a, b) => b.weight - a.weight);
            this.memoryGraph.set(keyA, edges);
        }

        return edgesFormed / 2; // Undirected edges
    }

    /**
     * Retrieve related memories instantly via the consolidated graph.
     * Allows O(1) associative recall.
     */
    getAssociations(key: string, limit = 5): AnchorGraphEdge[] {
        return (this.memoryGraph.get(key) || []).slice(0, limit);
    }

    /**
     * Return the graph structure for visualization.
     */
    getGraph() {
        return this.memoryGraph;
    }
}
