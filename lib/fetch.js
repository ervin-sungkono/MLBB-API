import NodeFetchCache, { MemoryCache } from "node-fetch-cache";

export const fetch = NodeFetchCache.create({
    cache: new MemoryCache({ ttl: 24 * 60 * 60 * 1000 }), // Cache responses for a day
    shouldCacheResponse: (response) => response.ok
})