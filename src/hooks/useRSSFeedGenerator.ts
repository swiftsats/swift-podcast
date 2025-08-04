import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { getCreatorPubkeyHex } from '@/lib/podcastConfig';
import { genRSSFeed } from '@/lib/rssGenerator';
import type { PodcastEpisode } from '@/types/podcast';

/**
 * Hook to fetch podcast episodes and generate RSS feed
 */
export function useRSSFeedGenerator() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['rss-feed-generator'],
    queryFn: async () => {
      try {
        // Fetch podcast episodes (kind 30001 for podcast episodes)
        const events = await nostr.query([
          {
            kinds: [30001], // Podcast episodes
            authors: [getCreatorPubkeyHex()],
            limit: 100,
          }
        ]);

        // Convert Nostr events to podcast episodes
        const episodes: PodcastEpisode[] = events.map(event => {
          const content = JSON.parse(event.content);
          const dTag = event.tags.find(([name]) => name === 'd')?.[1] || '';
          return {
            id: event.id,
            eventId: event.id,
            authorPubkey: event.pubkey,
            createdAt: new Date(event.created_at * 1000),
            title: content.title || 'Untitled Episode',
            description: content.description,
            content: content.content,
            audioUrl: content.audioUrl || '',
            audioType: content.audioType || 'audio/mpeg',
            imageUrl: content.imageUrl,
            duration: content.duration,
            episodeNumber: content.episodeNumber,
            seasonNumber: content.seasonNumber,
            publishDate: new Date(event.created_at * 1000),
            explicit: content.explicit || false,
            tags: content.tags || [],
            transcript: content.transcript,
            chapters: content.chapters,
            guests: content.guests,
            externalRefs: content.externalRefs,
            dTag,
            zapCount: 0,
            commentCount: 0,
          };
        });

        // Generate RSS feed with the current configuration and episodes
        await genRSSFeed(episodes);

        return {
          episodes,
          rssGenerated: true,
          lastGenerated: new Date(),
        };
      } catch (error) {
        console.error('Failed to generate RSS feed:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}