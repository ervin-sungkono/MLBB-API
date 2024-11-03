import { LRUCache } from "lru-cache";
import { MAX_REQUESTS_PER_INTERVAL, MAX_UNIQUE_USERS, INTERVAL } from "./const";

export const rateLimit = (options) => {
  const rateLimitCache = new LRUCache({
    max: options?.maxUniqueTokenPerInterval ?? MAX_UNIQUE_USERS,
    ttl: options?.interval ?? INTERVAL
  });

  return {
    check: (cacheToken) => {
      const currentTime = Date.now();
      const requestTimestamps = rateLimitCache.get(cacheToken) || [];
    
      // Filter out timestamps outside the 1-minute window
      const recentRequests = requestTimestamps.filter(
        (timestamp) => currentTime - timestamp < 60 * 1000
      );
    
      // Add the current request timestamp to the array
      recentRequests.push(currentTime);
    
      // Update the cache with the recent timestamps
      rateLimitCache.set(cacheToken, recentRequests);
    
      // Check if request exceeds limit
      const limited = recentRequests.length > MAX_REQUESTS_PER_INTERVAL
      // Calculate remaining requests
      const remaining = Math.max(MAX_REQUESTS_PER_INTERVAL - recentRequests.length, 0);
    
      return { limited, remaining };
    }
  } 
}