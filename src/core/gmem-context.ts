/**
 * @kier73/gmem-agent — Generative Memory Agent SDK
 * 
 * Core GMemContext: the reusable bridge to the Rust mathematical engine.
 * 
 * The Fundamental Invariant:
 *   fetch(addr) = overlay[addr]           if addr ∈ overlay
 *               = synthesize(addr, seed)   otherwise
 * 
 * O(1) complexity for all operations.
 */

import koffi from 'koffi';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- DLL Resolution ---
// Search order: 1) GMEM_DLL_PATH env var, 2) Adjacent bindings/ dir, 3) Relative to Generative-Memory repo
function resolveDllPath(): string {
    if (process.env.GMEM_DLL_PATH) {
        return process.env.GMEM_DLL_PATH;
    }

    const candidates = [
        path.resolve(__dirname, '../../bindings/gmem_rs.dll'),
        path.resolve(__dirname, '../../bindings/libgmem_rs.so'),
        path.resolve(__dirname, '../../bindings/libgmem_rs.dylib'),
        path.resolve(__dirname, '../../../Generative-Memory/core-rust/target/release/gmem_rs.dll'),
        path.resolve(__dirname, '../../../Generative-Memory/core-rust/target/release/libgmem_rs.so'),
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    throw new Error(
        `GMem Rust library not found. Set GMEM_DLL_PATH or place the binary in bindings/.\n` +
        `Searched: ${candidates.join(', ')}`
    );
}

// --- FFI Binding Layer ---
let lib: any = null;
let fns: Record<string, any> = {};

function ensureBridge() {
    if (lib) return;

    const dllPath = resolveDllPath();
    lib = koffi.load(dllPath);

    // Core lifecycle
    fns.gmem_context_new = lib.func('gmem_context_new', 'void *', ['uint64']);
    fns.gmem_context_free = lib.func('gmem_context_free', 'void', ['void *']);

    // Memory operations
    fns.gmem_fetch = lib.func('gmem_fetch', 'double', ['void *', 'uint64']);
    fns.gmem_write = lib.func('gmem_write', 'void', ['void *', 'uint64', 'double']);
    fns.gmem_overlay_count = lib.func('gmem_overlay_count', 'size_t', ['void *']);

    // Persistence
    fns.gmem_persistence_attach = lib.func('gmem_persistence_attach', 'int', ['void *', 'string']);

    // Tensor fill
    fns.gmem_fill_tensor = lib.func('gmem_fill_tensor', 'void', ['void *', 'void *', 'size_t', 'uint64']);

    // Hilbert curve
    fns.gmem_hilbert_encode = lib.func('gmem_hilbert_encode', 'uint64', ['uint64', 'uint64', 'uint32']);

    // Koopman Spectral Sonar
    fns.gmem_koopman_sonar = lib.func('gmem_koopman_sonar', 'double', ['void *', 'size_t', 'void *']);

    // Anchor Navigator
    fns.gmem_anchor_new = lib.func('gmem_anchor_new', 'void *', ['void *', 'size_t', 'size_t', 'void *', 'size_t', 'size_t', 'size_t']);
    fns.gmem_anchor_navigate = lib.func('gmem_anchor_navigate', 'double', ['void *', 'size_t', 'size_t']);
    fns.gmem_anchor_free = lib.func('gmem_anchor_free', 'void', ['void *']);

    console.log(`[GMem SDK] Rust bridge loaded from: ${dllPath}`);
}

// --- GMemContext Class ---

export interface GMemContextOptions {
    /** Base seed defining the structural manifold. Default: 1337 */
    seed?: number | bigint;
    /** Path to attach an Append-Only File for persistence */
    aofPath?: string;
}

export class GMemContext {
    private ptr: any;
    private _seed: bigint;
    private _freed = false;

    constructor(options: GMemContextOptions = {}) {
        ensureBridge();
        this._seed = BigInt(options.seed ?? 1337);
        this.ptr = fns.gmem_context_new(this._seed);

        if (!this.ptr) {
            throw new Error('Failed to create GMem context in Rust.');
        }

        if (options.aofPath) {
            this.attach(options.aofPath);
        }
    }

    /** The base seed of this manifold. */
    get seed(): bigint {
        return this._seed;
    }

    /** Number of explicit physical overlay entries. */
    get overlayCount(): number {
        return fns.gmem_overlay_count(this.ptr);
    }

    /**
     * Fetch a value from the synthetic address space.
     * O(1) — resolves overlay → synthesis boundary instantly.
     */
    fetch(addr: bigint | number): number {
        return fns.gmem_fetch(this.ptr, BigInt(addr));
    }

    /**
     * Write an explicit value, overriding the synthetic baseline.
     * O(1) — marks the ZMask dirty and logs to AOF if attached.
     */
    write(addr: bigint | number, value: number): void {
        fns.gmem_write(this.ptr, BigInt(addr), value);
    }

    /**
     * Attach an Append-Only File for state persistence.
     * Returns true on success.
     */
    attach(filePath: string): boolean {
        // Ensure parent directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return !!fns.gmem_persistence_attach(this.ptr, filePath);
    }

    /**
     * Induct text content into the manifold at a hashed address.
     * Maps each character to a sequential address starting from hash(key).
     */
    induct(key: string, content: string): void {
        const baseAddr = GMemContext.hashKey(key);
        // Use stride of 1024 to isolate each key's region in the manifold
        for (let i = 0; i < content.length; i++) {
            this.write(baseAddr + BigInt(i) * 1024n, content.charCodeAt(i));
        }
        // Null terminator
        this.write(baseAddr + BigInt(content.length) * 1024n, 0);
    }

    /**
     * Retrieve text from the manifold at a hashed address.
     * Reads sequential characters until null terminator or maxLength.
     */
    retrieve(key: string, maxLength = 4096): string {
        const baseAddr = GMemContext.hashKey(key);
        let result = '';
        for (let i = 0; i < maxLength; i++) {
            const charCode = this.fetch(baseAddr + BigInt(i) * 1024n);
            if (charCode === 0) break;
            result += String.fromCharCode(Math.round(charCode));
        }
        return result;
    }

    /**
     * Encode 2D coordinates into a 1D Hilbert curve index.
     * Preserves spatial locality for multi-dimensional data.
     */
    hilbertEncode(i: bigint | number, j: bigint | number, order = 16): bigint {
        return fns.gmem_hilbert_encode(BigInt(i), BigInt(j), order);
    }

    /**
     * Fill a Float64Array directly from the manifold at C speed.
     * Bypasses JS loop overhead for bulk reads.
     */
    fillArray(startAddr: bigint | number, count: number): Float64Array {
        const buf = new Float64Array(count);
        fns.gmem_fill_tensor(this.ptr, buf, count, BigInt(startAddr));
        return buf;
    }

    /** Free the Rust context. Must be called to avoid memory leaks. */
    free(): void {
        if (!this._freed && this.ptr) {
            fns.gmem_context_free(this.ptr);
            this.ptr = null;
            this._freed = true;
        }
    }

    /** DJB2-style hash mapping a string key to a 64-bit manifold address. */
    static hashKey(key: string): bigint {
        // FNV-1a 64-bit hash — excellent avalanche for similar keys
        let h = 0xcbf29ce484222325n; // FNV offset basis
        const prime = 0x100000001b3n;  // FNV prime
        for (let i = 0; i < key.length; i++) {
            h ^= BigInt(key.charCodeAt(i));
            h = (h * prime) & 0xFFFFFFFFFFFFFFFFn;
        }
        return h;
    }
}
