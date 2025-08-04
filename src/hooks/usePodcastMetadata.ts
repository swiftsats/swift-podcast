import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { PODCAST_CONFIG, PODCAST_KINDS, getCreatorPubkeyHex } from '@/lib/podcastConfig';

interface PodcastMetadata {
  title: string;
  description: string;
  author: string;
  email: string;
  image: string;
  language: string;
  categories: string[];
  explicit: boolean;
  website: string;
  copyright: string;
  funding: string[];
  locked: boolean;
  value: {
    amount: number;
    currency: string;
  };
  type: 'episodic' | 'serial';
  complete: boolean;
  updated_at: number;
}

export function usePodcastMetadata() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['podcast-metadata'],
    queryFn: async (): Promise<PodcastMetadata> => {
      try {
        // Query for podcast metadata events
        const events = await nostr.query([
          {
            kinds: [PODCAST_KINDS.PODCAST_METADATA], // Addressable podcast metadata event
            authors: [getCreatorPubkeyHex()],
            '#d': ['podcast-metadata']
          }
        ]);

        if (events.length > 0) {
          // Get the most recent event
          const latestEvent = events.reduce((latest, current) =>
            current.created_at > latest.created_at ? current : latest
          );

          const metadata = JSON.parse(latestEvent.content);
          return {
            ...metadata,
            updated_at: latestEvent.created_at
          };
        }
      } catch (error) {
        console.warn('Failed to fetch podcast metadata from Nostr, using fallback:', error);
      }

      // Fallback to hardcoded config
      return {
        title: PODCAST_CONFIG.podcast.title,
        description: PODCAST_CONFIG.podcast.description,
        author: PODCAST_CONFIG.podcast.author,
        email: PODCAST_CONFIG.podcast.email,
        image: PODCAST_CONFIG.podcast.image,
        language: PODCAST_CONFIG.podcast.language,
        categories: PODCAST_CONFIG.podcast.categories,
        explicit: PODCAST_CONFIG.podcast.explicit,
        website: PODCAST_CONFIG.podcast.website,
        copyright: PODCAST_CONFIG.podcast.copyright,
        funding: [],
        locked: false,
        value: {
          amount: 0,
          currency: 'USD'
        },
        type: 'episodic',
        complete: false,
        updated_at: 0
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}