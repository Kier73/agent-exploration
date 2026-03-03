/**
 * @kier73/gmem-agent — Public API
 * 
 * Everything you need to add Generative Memory to any agent framework.
 */

// Core
export { GMemContext, type GMemContextOptions } from './core/gmem-context.js';
export { GMemSearch, type SearchResult, type SearchOptions } from './core/gmem-search.js';
export { GMemPersistence, type PersistenceOptions } from './core/gmem-persistence.js';

// Agents
export { GMemAgent, type GMemAgentOptions } from './agents/memory-agent.js';
