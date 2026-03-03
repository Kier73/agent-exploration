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
     * Replay the AOF file into the context to reconstruct state.
     * Each record is 16 bytes: 8 bytes for addr (uint64), 8 bytes for value (f64).
     */
    replay(ctx: GMemContext, name: string): number {
        const p = this.aofPath(name);
        if (!fs.existsSync(p)) return 0;

        const buffer = fs.readFileSync(p);
        let count = 0;
        for (let i = 0; i < buffer.length; i += 16) {
            if (i + 16 > buffer.length) break;
            const addr = buffer.readBigUInt64LE(i);
            const value = buffer.readDoubleLE(i + 8);
            ctx.write(addr, value);
            count++;
        }
        return count;
    }
}
