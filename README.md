# @kier73/gmem-agent

**Generative Memory Agent SDK** — $O(1)$ synthetic memory for any AI agent framework.

> _"The manifold remembers everything. The RAM stores nothing."_

## What is Generative Memory?

Traditional agent memory stores every piece of context physically (RAM, SQLite, vector DBs). Generative Memory replaces this with a **mathematical manifold** — a $2^{64}$ coordinate address space where every value is *synthesized deterministically* from a seed.

When you write a value, it's stored as a sparse overlay. When you read, the system resolves:

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

// Recall by topic
const results = agent.recall('weather');
console.log(results);
// → [{ key: 'session-1', score: 0.85, snippet: '...', method: 'literal' }]

agent.close();
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
├──────────────┴───────────────────────┤
│           GMemContext                │  ← Core FFI Bridge
│  fetch() / write() / induct()       │
│  retrieve() / hilbertEncode()       │
├──────────────────────────────────────┤
│      gmem_rs (Rust Native DLL)      │  ← Mathematical Engine
│  vRNS Synthesis │ Overlay │ ZMask   │
│  Koopman Sonar  │ Anchor  │ AOF     │
└──────────────────────────────────────┘
```

## Rust Core Modules

| Module | Capability | Complexity |
|---|---|---|
| `context.rs` | Core fetch/write manifold | $O(1)$ |
| `vrns/scalar_synth.rs` | 16-prime vRNS synthesis | $O(1)$ |
| `physical/overlay.rs` | Sparse physical memory | $O(1)$ amortized |
| `physical/zmask.rs` | Hierarchical dirty bitfield | $O(1)$ |
| `math/holographic.rs` | Implicit Linear Layer (zero-allocation weights) | $O(n \times m)$ |
| `math/koopman.rs` | Spectral Sonar (FFT + SVD) | $O(n \log n)$ |
| `math/gielis.rs` | GPU Lattice Lock (CUDA) | $O(1)$ parallel |
| `topology/anchor.rs` | SVD Semantic Compiler | $O(s^3)$ setup |
| `topology/monotonic.rs` | Interpolation Search | $O(\log \log n)$ |
| `topology/morph.rs` | Real-time affine transforms | $O(1)$ |
| `topology/mirror.rs` | Shadow Context (zero-copy) | $O(1)$ |
| `driver/persistence.rs` | Append-Only File log | $O(1)$ per write |

## Examples

```bash
# Basic induction & retrieval
npm run dev

# Session memory with search
npm run demo:session
```

## Requirements

- **Node.js** ≥ 18
- **Rust toolchain** (to build `gmem_rs` from source)
- Or set `GMEM_DLL_PATH` to a pre-built binary

## License

MIT
