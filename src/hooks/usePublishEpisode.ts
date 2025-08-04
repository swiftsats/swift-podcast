import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
import type { EpisodeFormData } from '@/types/podcast';
import { PODCAST_KINDS, isPodcastCreator } from '@/lib/podcastConfig';

/**
 * Hook for publishing podcast episodes (creator only)
 */
export function usePublishEpisode() {
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const { mutateAsync: uploadFile } = useUploadFile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (episodeData: EpisodeFormData): Promise<string> => {
      // Verify user is logged in and is the creator
      if (!user) {
        throw new Error('You must be logged in to publish episodes');
      }

      if (!isPodcastCreator(user.pubkey)) {
        throw new Error('Only the podcast creator can publish episodes');
      }

      // Upload audio file if provided
      let audioUrl = episodeData.audioUrl;
      let audioType = episodeData.audioType;

      if (episodeData.audioFile) {
        try {
          const audioTags = await uploadFile(episodeData.audioFile);
          audioUrl = audioTags[0][1]; // First tag contains the URL
          audioType = episodeData.audioFile.type;
        } catch (error) {
          throw new Error(`Failed to upload audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (!audioUrl) {
        throw new Error('Audio URL or file is required');
      }

      // If we have a URL but no type, try to infer from file extension
      if (audioUrl && !audioType) {
        try {
          const url = new URL(audioUrl);
          const pathname = url.pathname.toLowerCase();
          if (pathname.endsWith('.mp3')) {
            audioType = 'audio/mpeg';
          } else if (pathname.endsWith('.wav')) {
            audioType = 'audio/wav';
          } else if (pathname.endsWith('.m4a')) {
            audioType = 'audio/mp4';
          } else if (pathname.endsWith('.ogg')) {
            audioType = 'audio/ogg';
          } else {
            audioType = 'audio/mpeg'; // Default fallback
          }
        } catch {
          audioType = 'audio/mpeg';
        }
      }

      // Upload image file if provided
      let imageUrl = episodeData.imageUrl;
      if (episodeData.imageFile) {
        try {
          const imageTags = await uploadFile(episodeData.imageFile);
          imageUrl = imageTags[0][1]; // First tag contains the URL
        } catch (error) {
          throw new Error(`Failed to upload image file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Build tags for NIP-54 podcast episode
      const tags: Array<[string, ...string[]]> = [
        ['title', episodeData.title], // NIP-54: episode title
        ['audio', audioUrl, audioType || 'audio/mpeg'], // NIP-54: audio URL with media type
        ['alt', `Podcast episode: ${episodeData.title}`] // NIP-31 alt tag
      ];

      // Add optional tags per NIP-54
      if (episodeData.description) {
        tags.push(['description', episodeData.description]);
      }

      if (imageUrl) {
        tags.push(['image', imageUrl]);
      }

      // Add topic tags
      episodeData.tags.forEach(tag => {
        if (tag.trim()) {
          tags.push(['t', tag.trim().toLowerCase()]);
        }
      });

      // Create and publish the event
      const event = await createEvent({
        kind: PODCAST_KINDS.EPISODE,
        content: episodeData.content || '',
        tags
      });

      // Invalidate related queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ['podcast-episodes'] });
      await queryClient.invalidateQueries({ queryKey: ['podcast-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['rss-feed-generator'] });

      return event.id;
    },

    onError: (error) => {
      console.error('Failed to publish episode:', error);
    }
  });
}

/**
 * Hook for updating/editing existing episodes
 */
export function useUpdateEpisode() {
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const { mutateAsync: uploadFile } = useUploadFile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      episodeId,
      episodeData
    }: {
      episodeId: string;
      episodeData: EpisodeFormData;
    }): Promise<string> => {
      // Verify user is logged in and is the creator
      if (!user) {
        throw new Error('You must be logged in to update episodes');
      }

      if (!isPodcastCreator(user.pubkey)) {
        throw new Error('Only the podcast creator can update episodes');
      }

      // Upload new files if provided
      let audioUrl = episodeData.audioUrl;
      let audioType = episodeData.audioType;

      if (episodeData.audioFile) {
        try {
          const audioTags = await uploadFile(episodeData.audioFile);
          audioUrl = audioTags[0][1];
          audioType = episodeData.audioFile.type;
        } catch (error) {
          throw new Error(`Failed to upload audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (!audioUrl) {
        throw new Error('Audio URL or file is required');
      }

      // If we have a URL but no type, try to infer from file extension
      if (audioUrl && !audioType) {
        try {
          const url = new URL(audioUrl);
          const pathname = url.pathname.toLowerCase();
          if (pathname.endsWith('.mp3')) {
            audioType = 'audio/mpeg';
          } else if (pathname.endsWith('.wav')) {
            audioType = 'audio/wav';
          } else if (pathname.endsWith('.m4a')) {
            audioType = 'audio/mp4';
          } else if (pathname.endsWith('.ogg')) {
            audioType = 'audio/ogg';
          } else {
            audioType = 'audio/mpeg'; // Default fallback
          }
        } catch {
          audioType = 'audio/mpeg';
        }
      }

      let imageUrl = episodeData.imageUrl;
      if (episodeData.imageFile) {
        try {
          const imageTags = await uploadFile(episodeData.imageFile);
          imageUrl = imageTags[0][1];
        } catch (error) {
          throw new Error(`Failed to upload image file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Build tags for updated NIP-54 podcast episode
      const tags: Array<[string, ...string[]]> = [
        ['title', episodeData.title], // NIP-54: episode title
        ['audio', audioUrl, audioType || 'audio/mpeg'], // NIP-54: audio URL with media type
        ['alt', `Updated podcast episode: ${episodeData.title}`], // NIP-31 alt tag
        ['edit', episodeId] // Reference to the original event being edited
      ];

      // Add optional tags per NIP-54
      if (episodeData.description) {
        tags.push(['description', episodeData.description]);
      }

      if (imageUrl) {
        tags.push(['image', imageUrl]);
      }

      // Add topic tags
      episodeData.tags.forEach(tag => {
        if (tag.trim()) {
          tags.push(['t', tag.trim().toLowerCase()]);
        }
      });

      // Create the updated event
      const event = await createEvent({
        kind: PODCAST_KINDS.EPISODE,
        content: episodeData.content || '',
        tags
      });

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['podcast-episodes'] });
      await queryClient.invalidateQueries({ queryKey: ['podcast-episode', episodeId] });
      await queryClient.invalidateQueries({ queryKey: ['podcast-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['rss-feed-generator'] });

      return event.id;
    },
    onSuccess: (data) => {
      console.log('Episode update successful:', data);
    },
    onError: (error) => {
      console.error('Episode update failed:', error);
    },
    onSettled: (data, error) => {
      console.log('Episode update settled:', { data, error });
    }
  });
}

/**
 * Hook for deleting episodes (creates deletion event)
 */
export function useDeleteEpisode() {
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (episodeId: string): Promise<string> => {
      if (!user) {
        throw new Error('You must be logged in to delete episodes');
      }

      if (!isPodcastCreator(user.pubkey)) {
        throw new Error('Only the podcast creator can delete episodes');
      }

      // Create a deletion event (NIP-09)
      const event = await createEvent({
        kind: 5, // Deletion event
        content: 'Deleted podcast episode',
        tags: [
          ['e', episodeId]
        ]
      });

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['podcast-episodes'] });
      await queryClient.invalidateQueries({ queryKey: ['podcast-episode', episodeId] });
      await queryClient.invalidateQueries({ queryKey: ['podcast-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['rss-feed-generator'] });

      return event.id;
    }
  });
}