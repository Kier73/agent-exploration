/**
 * GMem Persistence Manager
 * 
 * Handles Append-Only File (AOF) lifecycle and snapshot management.
 * The AOF records every write(addr, value) tuple as a 16-byte record,
 * enabling perfect state reconstruction from the manifold seed + AOF.
 */

import fs from 'node:fs';
import path from 'node:path';
import { GMemContext } from './gmem-context.js';

export interface PersistenceOptions {
    /** Directory to store AOF and snapshots */
    stateDir: string;
    /** Prefix for AOF filenames. Default: 'gmem' */
    prefix?: string;
}

export class GMemPersistence {
    private readonly stateDir: string;
    private readonly prefix: string;

    constructor(options: PersistenceOptions) {
        this.stateDir = options.stateDir;
        this.prefix = options.prefix ?? 'gmem';

        if (!fs.existsSync(this.stateDir)) {
            fs.mkdirSync(this.stateDir, { recursive: true });
        }
    }

    /** Get the AOF path for a given context name. */
    aofPath(name: string): string {
        return path.join(this.stateDir, `${this.prefix}_${name}.aof`);
    }

    /** Attach persistence to a GMemContext. */
    attach(ctx: GMemContext, name: string): boolean {
        return ctx.attach(this.aofPath(name));
    }

    /** List all persisted context names. */
    list(): string[] {
        const suffix = '.aof';
        const prefix = `${this.prefix}_`;
        return fs.readdirSync(this.stateDir)
            .filter(f => f.startsWith(prefix) && f.endsWith(suffix))
            .map(f => f.slice(prefix.length, -suffix.length));
    }

    /** Get the size in bytes of a persisted AOF. */
    size(name: string): number {
        const p = this.aofPath(name);
        if (!fs.existsSync(p)) return 0;
        return fs.statSync(p).size;
    }

    /** 
     * Calculate the number of write records in an AOF.
     * Each record is 16 bytes (8 bytes addr + 8 bytes value).
     */
    recordCount(name: string): number {
        return Math.floor(this.size(name) / 16);
    }
}
