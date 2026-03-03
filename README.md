# @kier73/gmem-agent

**Generative Memory Agent SDK** — $O(1)$ synthetic memory for any AI agent framework.

## What is Generative Memory?

Traditional agent memory stores every piece of context physically (RAM, SQLite, vector DBs). Generative Memory replaces this with a **mathematical manifold** — a $2^{64}$ coordinate address space where every value is *synthesized deterministically* from a seed.

```
fetch(addr) = overlay[addr]           if addr was explicitly written
            = synthesize(addr, seed)   otherwise
```

**Result**: Infinite addressable memory. Zero RAM growth. O(1) per operation.

## Quick Start

```bash
npm install @kier73/gmem-agent
```

```typescript
import { GMemAgent } from '@kier73/gmem-agent';

const agent = new GMemAgent({ seed: 42, stateDir: './.gmem' });

// Remember conversation turns
agent.remember('session-1', 'User asked about weather in Seattle');
agent.remember('session-2', 'User discussed travel plans to Japan');

// Recall by topic — uses HDC + Koopman spectral similarity (no embeddings!)
const results = agent.recall('weather');
console.log(results);
// → [{ key: 'session-1', score: 0.85, snippet: '...', method: 'hybrid' }]

agent.close();
```

## Spectral Search Engine

The SDK includes a **zero-embedding semantic search engine** that leverages mathematical structures to find contextual similarity natively on the manifold:

| Feature | Function | Method |
|---|---|---|
| **HDC Fingerprint** | `hdcFingerprint()` | 16-prime RNS residue signatures |
| **Koopman Lifting** | `koopmanLift()` | 5D β-vector spectral law extraction |
| **Combined Similarity** | `combinedSimilarity()` | Weighted HDC + spectral cosine |

```typescript
import { spectralFingerprint, combinedSimilarity } from '@kier73/gmem-agent';

const a = spectralFingerprint('Heavy rain expected this weekend');
const b = spectralFingerprint('Rainy weather forecast');
const c = spectralFingerprint('Rust programming language');

console.log(combinedSimilarity(a, b)); // 0.72 (high — same topic)
console.log(combinedSimilarity(a, c)); // 0.66 (low — different)
```

## Architecture

```
┌──────────────────────────────────────┐
│           GMemAgent                  │  ← High-level API
│  remember() / recall() / status()   │
├──────────────┬───────────────────────┤
│  GMemSearch  │   GMemPersistence    │  ← Search + State
│  induct()    │   attach() / list()  │
│  search()    │   aofPath()          │
├──────────────┼───────────────────────┤
│ gmem-spectral│   GMemContext        │  ← Spectral + FFI
│ hdcFingerprint│  fetch() / write()  │
│ koopmanLift()│  induct() / retrieve │
├──────────────┴───────────────────────┤
│      gmem_rs (Rust Native DLL)      │  ← Mathematical Engine
│  vRNS Synthesis │ Overlay │ ZMask   │
│  Koopman Sonar  │ Anchor  │ AOF     │
└──────────────────────────────────────┘
```

## Advanced Capabilities

- **Dream Consolidation**: Agents can run background "dream" cycles to discover associative links between memories.
- **Adapters**: Includes utility adapters for seamless integration into existing agent architectures (e.g., OpenClaw).

## Examples & Tests

Run the built-in demonstrations and test suites:

```bash
npm run dev              # Basic induction
npm run demo:session     # Session memory with recall
npm run demo:search      # Semantic search (HDC + Koopman)
npm test                 # Run the test suite
```

## Rust Core Modules

| Module | Capability | Complexity |
|---|---|---|
| `context.rs` | Core fetch/write manifold | $O(1)$ |
| `vrns/scalar_synth.rs` | 16-prime vRNS synthesis | $O(1)$ |
| `math/holographic.rs` | Implicit Linear Layer | $O(n \times m)$ |
| `math/koopman.rs` | Spectral Sonar (FFT + SVD) | $O(n \log n)$ |
| `topology/anchor.rs` | SVD Semantic Compiler | $O(s^3)$ setup |
| `topology/monotonic.rs` | Interpolation Search | $O(\log \log n)$ |
| `driver/persistence.rs` | Append-Only File log | $O(1)$ per write |

## Requirements

- **Node.js** ≥ 18
- **Rust toolchain** (to build `gmem_rs` from source), or set `GMEM_DLL_PATH`

## License

MIT
