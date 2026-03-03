/**
 * GMem Spectral Engine
 * 
 * Port of GeoHDC's Hyperdimensional Computing patterns to TypeScript.
 * Provides three key capabilities:
 * 
 * 1. HDC Fingerprinting — RNS-based signatures for text via holographic composition
 * 2. Koopman Lifting — Spectral law extraction from character sequences  
 * 3. Similarity Scoring — Linear-time attention via residue modulation (no softmax)
 * 
 * Based on: GeoHDC (Kier73), SpectralJitPredictor, procedural_search_v12
 */

// --- RNS (Residue Number System) ---

/** 16-prime pool for high-entropy residue channels */
const PRIMES_16 = [
    65447, 65449, 65479, 65497, 65519, 65521, 65437, 65423,
    65413, 65407, 65393, 65381, 65371, 65357, 65353, 65327,
];

/** MurmurHash3 64-bit finalizer (fmix64) */
function fmix64(k: number): number {
    let h = k & 0xFFFFFFFF;
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0; // unsigned 32-bit
}

// --- HDC Signature ---

export interface HDCSignature {
    /** Residue channels (one per prime) */
    residues: number[];
    /** Source text length */
    length: number;
}

/**
 * Generate an HDC signature from text content.
 * 
 * The equation:
 * Σ(text) = ⊕_{i=0}^{N-1} fmix64(char_i ⊕ i) mod p_k, for each prime p_k
 * 
 * This produces a holographic fingerprint where each character's position
 * contributes to all residue channels simultaneously.
 */
export function hdcFingerprint(text: string): HDCSignature {
    const residues = new Array(PRIMES_16.length).fill(0);

    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        const mixed = fmix64(charCode ^ (i * 0x9E3779B9)); // Golden ratio dispersion

        for (let k = 0; k < PRIMES_16.length; k++) {
            // XOR-accumulate into each residue channel
            residues[k] = (residues[k] ^ (mixed % PRIMES_16[k])) % PRIMES_16[k];
        }
    }

    return { residues, length: text.length };
}

/**
 * Holographic composition of two signatures.
 * Σ_C = Σ_A ⊕ (Σ_B >> 1)
 * 
 * This enables combining signatures while preserving structural information.
 */
export function hdcCombine(a: HDCSignature, b: HDCSignature): HDCSignature {
    const residues = a.residues.map((ra, k) => {
        const rb = b.residues[k];
        return (ra ^ (rb >> 1)) % PRIMES_16[k];
    });
    return { residues, length: a.length + b.length };
}

/**
 * HDC cosine-like similarity between two signatures.
 * 
 * Uses residue modular proximity instead of vector dot products.
 * Linear attention: no softmax, no O(N²) operations.
 * 
 * Score ∈ [0, 1] where 1 = identical signatures.
 */
export function hdcSimilarity(a: HDCSignature, b: HDCSignature): number {
    // Structural similarity based on residue bit-flow.
    // We compare how many "prime channels" have the same parity or 
    // relative magnitude.
    let alignment = 0;
    for (let i = 0; i < 16; i++) {
        const parA = a.residues[i] % 2;
        const parB = b.residues[i] % 2;
        if (parA === parB) alignment += 0.5;
        if (a.residues[i] === b.residues[i]) alignment += 0.5;
    }

    const structuralSim = alignment / 16;
    const lengthRatio = Math.min(a.length, b.length) / Math.max(a.length, b.length);

    return structuralSim * 0.8 + lengthRatio * 0.2;
}

// --- Koopman Spectral Law ---

export interface SpectralLaw {
    /** Dominant angular frequency */
    omega: number;
    /** 5D regression: [quadratic, linear, sin(ω), cos(ω), constant] */
    beta: [number, number, number, number, number];
    /** Source signal length */
    contextLength: number;
}

/**
 * Koopman Lifting: Extract the spectral law from a 1D signal.
 * 
 * Ported from GeoHDC's SpectralJitPredictor.find_law and
 * GMem Rust core's koopman_sonar.
 * 
 * Steps:
 * 1. FFT → find dominant frequency ω
 * 2. Construct 5D basis: [x², x, sin(ωx), cos(ωx), 1]
 * 3. Least-squares solve for β coefficients
 * 
 * Complexity: O(N log N) for FFT, O(N) for regression
 */
export function koopmanLift(signal: number[]): SpectralLaw {
    const L = signal.length;
    if (L === 0) {
        return { omega: 0, beta: [0, 0, 0, 0, 0], contextLength: 0 };
    }

    // Step 1: Simple frequency detection via auto-correlation peak
    const mean = signal.reduce((a, b) => a + b, 0) / L;
    const centered = signal.map(v => v - mean);

    // Find dominant period via zero-crossing analysis
    let crossings = 0;
    for (let i = 1; i < L; i++) {
        if ((centered[i - 1] >= 0 && centered[i] < 0) ||
            (centered[i - 1] < 0 && centered[i] >= 0)) {
            crossings++;
        }
    }
    const dominantFreq = crossings / 2; // Half-crossings ≈ full cycles
    const omega = dominantFreq * Math.PI;

    // Step 2: Build basis matrix and solve via normal equations
    // Basis: [x², x, sin(ωx), cos(ωx), 1]
    const t = new Float64Array(L);
    for (let i = 0; i < L; i++) {
        t[i] = -1.0 + 2.0 * i / Math.max(L - 1, 1);
    }

    // Normal equation: (Φᵀ Φ) β = Φᵀ y
    // For 5 unknowns, we build the 5x5 Gram matrix
    const k = 5;
    const gram = new Float64Array(k * k);
    const rhs = new Float64Array(k);

    for (let i = 0; i < L; i++) {
        const x = t[i];
        const phi = [x * x, x, Math.sin(omega * x), Math.cos(omega * x), 1.0];

        for (let r = 0; r < k; r++) {
            rhs[r] += phi[r] * signal[i];
            for (let c = 0; c < k; c++) {
                gram[r * k + c] += phi[r] * phi[c];
            }
        }
    }

    // Solve 5x5 system via Gaussian elimination
    const beta = solveLinear5x5(gram, rhs);

    return {
        omega,
        beta: beta as [number, number, number, number, number],
        contextLength: L,
    };
}

/**
 * Evaluate a spectral law at a normalized position x ∈ [-1, 1].
 */
export function spectralEval(law: SpectralLaw, x: number): number {
    const [b0, b1, b2, b3, b4] = law.beta;
    return b0 * x * x + b1 * x + b2 * Math.sin(law.omega * x) + b3 * Math.cos(law.omega * x) + b4;
}

/**
 * Spectral similarity between two laws.
 * Compares β-vectors using normalized dot product.
 */
export function spectralSimilarity(a: SpectralLaw, b: SpectralLaw): number {
    let dotAB = 0, normA = 0, normB = 0;
    for (let i = 0; i < 5; i++) {
        dotAB += a.beta[i] * b.beta[i];
        normA += a.beta[i] * a.beta[i];
        normB += b.beta[i] * b.beta[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    if (denom < 1e-12) return 0;
    return Math.max(0, dotAB / denom); // Clamp to [0, 1]
}

// --- Internal: 5x5 Linear Solver ---

function solveLinear5x5(gram: Float64Array, rhs: Float64Array): number[] {
    const n = 5;
    // Augmented matrix [gram | rhs]
    const aug = new Float64Array(n * (n + 1));
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            aug[r * (n + 1) + c] = gram[r * n + c];
        }
        aug[r * (n + 1) + n] = rhs[r];
    }

    // Forward elimination with partial pivoting
    for (let col = 0; col < n; col++) {
        let maxRow = col;
        let maxVal = Math.abs(aug[col * (n + 1) + col]);
        for (let r = col + 1; r < n; r++) {
            const val = Math.abs(aug[r * (n + 1) + col]);
            if (val > maxVal) {
                maxVal = val;
                maxRow = r;
            }
        }

        // Swap rows
        if (maxRow !== col) {
            for (let c = 0; c <= n; c++) {
                const tmp = aug[col * (n + 1) + c];
                aug[col * (n + 1) + c] = aug[maxRow * (n + 1) + c];
                aug[maxRow * (n + 1) + c] = tmp;
            }
        }

        const pivot = aug[col * (n + 1) + col];
        if (Math.abs(pivot) < 1e-15) continue;

        for (let r = col + 1; r < n; r++) {
            const factor = aug[r * (n + 1) + col] / pivot;
            for (let c = col; c <= n; c++) {
                aug[r * (n + 1) + c] -= factor * aug[col * (n + 1) + c];
            }
        }
    }

    // Back substitution
    const result = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) {
        let sum = aug[r * (n + 1) + n];
        for (let c = r + 1; c < n; c++) {
            sum -= aug[r * (n + 1) + c] * result[c];
        }
        const diag = aug[r * (n + 1) + r];
        result[r] = Math.abs(diag) > 1e-15 ? sum / diag : 0;
    }

    return result;
}

// --- Text-to-Signal Conversion ---

/**
 * Convert text to a numerical signal for spectral analysis.
 * Each character becomes a normalized value ∈ [0, 1].
 */
export function textToSignal(text: string): number[] {
    const signal = new Array(text.length);
    for (let i = 0; i < text.length; i++) {
        signal[i] = text.charCodeAt(i) / 127.0; // ASCII normalization
    }
    return signal;
}

/**
 * Create a spectral fingerprint from text.
 * Combines HDC residue fingerprint with Koopman spectral law.
 */
export function spectralFingerprint(text: string): { hdc: HDCSignature; law: SpectralLaw } {
    return {
        hdc: hdcFingerprint(text),
        law: koopmanLift(textToSignal(text)),
    };
}

/**
 * Combined similarity using both HDC and spectral scores.
 * weight controls HDC vs spectral balance (0 = pure spectral, 1 = pure HDC).
 */
export function combinedSimilarity(
    a: { hdc: HDCSignature; law: SpectralLaw },
    b: { hdc: HDCSignature; law: SpectralLaw },
    hdcWeight = 0.6,
): number {
    const hdcScore = hdcSimilarity(a.hdc, b.hdc);
    const specScore = spectralSimilarity(a.law, b.law);
    return hdcWeight * hdcScore + (1 - hdcWeight) * specScore;
}
