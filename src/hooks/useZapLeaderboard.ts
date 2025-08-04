import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { ZapLeaderboardEntry } from '@/types/podcast';
import { getCreatorPubkeyHex } from '@/lib/podcastConfig';

/**
 * Hook to fetch zap leaderboard for the podcast
 */
export function useZapLeaderboard(limit: number = 10) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['zap-leaderboard', limit],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);
      
      // Query for zap events (kind 9735) that reference the podcast creator
      const zapEvents = await nostr.query([{
        kinds: [9735], // Zap events
        '#p': [getCreatorPubkeyHex()], // Zaps to the creator
        limit: 1000 // Get more zaps to aggregate
      }], { signal });

      // Aggregate zaps by sender
      const zapAggregation = new Map<string, {
        totalAmount: number;
        zapCount: number;
        lastZapDate: Date;
      }>();

      zapEvents.forEach(zapEvent => {
        const amountTag = zapEvent.tags.find(([name]) => name === 'amount');
        const amount = amountTag ? parseInt(amountTag[1]) : 0;
        
        const senderPubkey = zapEvent.pubkey;
        const zapDate = new Date(zapEvent.created_at * 1000);

        const existing = zapAggregation.get(senderPubkey);
        if (existing) {
          existing.totalAmount += amount;
          existing.zapCount += 1;
          if (zapDate > existing.lastZapDate) {
            existing.lastZapDate = zapDate;
          }
        } else {
          zapAggregation.set(senderPubkey, {
            totalAmount: amount,
            zapCount: 1,
            lastZapDate: zapDate
          });
        }
      });

      // Convert to leaderboard entries and sort by total amount
      const leaderboard: ZapLeaderboardEntry[] = Array.from(zapAggregation.entries())
        .map(([pubkey, stats]) => ({
          userPubkey: pubkey,
          ...stats
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, limit);

      return leaderboard;
    },
    staleTime: 300000, // 5 minutes
  });
}


/**
 * Hook to get recent zap activity
 */
export function useRecentZapActivity(limit: number = 20) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['recent-zap-activity', limit],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);
      
      // Get recent zap events
      const zapEvents = await nostr.query([{
        kinds: [9735],
        '#p': [getCreatorPubkeyHex()],
        limit: limit
      }], { signal });

      // Sort by creation time (most recent first)
      return zapEvents
        .sort((a, b) => b.created_at - a.created_at)
        .map(zapEvent => {
          const amountTag = zapEvent.tags.find(([name]) => name === 'amount');
          const amount = amountTag ? parseInt(amountTag[1]) : 0;
          
          // Try to find the episode being zapped
          const eventTag = zapEvent.tags.find(([name]) => name === 'e');
          const episodeId = eventTag?.[1];

          return {
            id: zapEvent.id,
            userPubkey: zapEvent.pubkey,
            amount,
            episodeId,
            timestamp: new Date(zapEvent.created_at * 1000),
            zapEvent
          };
        });
    },
    staleTime: 60000, // 1 minute
  });
}