import { useState } from 'react';
import { MessageCircle, Heart, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ZapButton } from '@/components/ZapButton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import type { PodcastEpisode } from '@/types/podcast';
import { cn } from '@/lib/utils';

interface InteractionCounts {
  replies: number;
  likes: number;
  zaps: number;
  totalSats: number;
}

interface UserInteractions {
  hasLiked: boolean;
}

interface EpisodeActionsProps {
  episode: PodcastEpisode;
  className?: string;
}

// Create a NostrEvent-like object from PodcastEpisode
function createEventFromEpisode(episode: PodcastEpisode): NostrEvent {
  return {
    id: episode.eventId,
    kind: 30023, // NIP-23 long-form content
    pubkey: episode.authorPubkey,
    created_at: Math.floor(episode.createdAt.getTime() / 1000),
    tags: [
      ['d', episode.dTag],
      ['title', episode.title],
      ['t', 'podcast'],
    ],
    content: episode.content || episode.description || '',
    sig: '' // Not needed for actions
  } as NostrEvent;
}

export function EpisodeActions({ episode, className }: EpisodeActionsProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const { toast } = useToast();
  const { nostr } = useNostr();
  const queryClient = useQueryClient();

  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const event = createEventFromEpisode(episode);

  // Query for user's interactions with this episode
  const { data: userInteractions } = useQuery<UserInteractions>({
    queryKey: ['episode-user-interactions', episode.eventId, user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return { hasLiked: false };

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      // Query for user's likes of this episode
      const interactions = await nostr.query([{
        kinds: [7], // Likes
        authors: [user.pubkey],
        '#e': [episode.eventId],
        limit: 10
      }], { signal });

      const hasLiked = interactions.some(e => e.kind === 7);

      return { hasLiked };
    },
    enabled: !!user?.pubkey,
    staleTime: 30000, // 30 seconds
  });

  // Query for interaction counts
  const { data: interactionCounts } = useQuery<InteractionCounts>({
    queryKey: ['episode-interaction-counts', episode.eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      // Query for all interactions with this episode
      const interactions = await nostr.query([{
        kinds: [1, 7, 9735], // Replies, likes, zaps
        '#e': [episode.eventId],
        limit: 500
      }], { signal });

      const replies = interactions.filter(e => e.kind === 1).length;
      const likes = interactions.filter(e => e.kind === 7).length;

      // Count zaps and calculate total sats
      const zaps = interactions.filter(e => e.kind === 9735);
      const zapCount = zaps.length;
      const totalSats = zaps.reduce((total, zap) => {
        // Extract amount from bolt11 invoice or amount tag
        const amountTag = zap.tags.find(tag => tag[0] === 'amount')?.[1];
        const amount = amountTag ? parseInt(amountTag) / 1000 : 0; // Convert msats to sats
        return total + amount;
      }, 0);

      return { replies, likes, zaps: zapCount, totalSats };
    },
    staleTime: 60000, // 1 minute
  });

  const handleReply = async () => {
    if (!user || !replyContent.trim()) return;

    setIsSubmittingReply(true);
    try {
      // Create reply to episode (NIP-22 comment) - reference regular event
      const replyTags: string[][] = [
        ['e', episode.eventId], // Reference the episode event
        ['k', '54'], // Kind of the event being commented on (NIP-54)
        ['p', episode.authorPubkey] // Tag the episode author
      ];

      // Optimistically update interaction counts
      queryClient.setQueryData(['episode-interaction-counts', episode.eventId], (old: InteractionCounts | undefined) => {
        if (!old) return { replies: 1, likes: 0, zaps: 0, totalSats: 0 };
        return { ...old, replies: old.replies + 1 };
      });

      // Publish the comment
      await createEvent({
        kind: 1111, // NIP-22 comment
        content: replyContent,
        tags: replyTags
      });

      setReplyContent('');
      setReplyDialogOpen(false);

      // Delay invalidation to allow network propagation
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['episode-interaction-counts', episode.eventId] });
      }, 2000);

      toast({
        title: "Comment posted!",
        description: "Your comment has been published to the network.",
      });
    } catch {
      // Revert optimistic updates on error
      queryClient.setQueryData(['episode-interaction-counts', episode.eventId], (old: InteractionCounts | undefined) => {
        if (!old) return { replies: 0, likes: 0, zaps: 0, totalSats: 0 };
        return { ...old, replies: Math.max(0, old.replies - 1) };
      });

      toast({
        title: "Failed to post comment",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to like.",
        variant: "destructive",
      });
      return;
    }

    if (userInteractions?.hasLiked) {
      toast({
        title: "Already liked",
        description: "You have already liked this episode.",
      });
      return;
    }

    try {
      // Optimistically update user interactions
      queryClient.setQueryData(['episode-user-interactions', episode.eventId, user.pubkey], (_old: UserInteractions | undefined) => {
        return { hasLiked: true };
      });

      // Optimistically update interaction counts
      queryClient.setQueryData(['episode-interaction-counts', episode.eventId], (old: InteractionCounts | undefined) => {
        if (!old) return { replies: 0, likes: 1, zaps: 0, totalSats: 0 };
        return { ...old, likes: old.likes + 1 };
      });

      // Publish the like
      await createEvent({
        kind: 7,
        content: '+',
        tags: [
          ['e', episode.eventId],
          ['p', episode.authorPubkey],
          ['k', '30023'] // Kind of the event being liked
        ]
      });

      toast({
        title: "Liked!",
        description: "Your like has been published to the network.",
      });

      // Delay invalidation to allow network propagation
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['episode-user-interactions', episode.eventId, user.pubkey] });
        queryClient.invalidateQueries({ queryKey: ['episode-interaction-counts', episode.eventId] });
      }, 2000);
    } catch {
      // Revert optimistic updates on error
      queryClient.setQueryData(['episode-user-interactions', episode.eventId, user.pubkey], (_old: UserInteractions | undefined) => {
        return { hasLiked: false };
      });

      queryClient.setQueryData(['episode-interaction-counts', episode.eventId], (old: InteractionCounts | undefined) => {
        if (!old) return { replies: 0, likes: 0, zaps: 0, totalSats: 0 };
        return { ...old, likes: Math.max(0, old.likes - 1) };
      });

      toast({
        title: "Failed to like",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    try {
      const naddr = nip19.naddrEncode({
        identifier: episode.dTag,
        pubkey: episode.authorPubkey,
        kind: 30023,
      });
      const url = `${window.location.origin}/${naddr}`;

      await navigator.clipboard.writeText(url);

      toast({
        title: "Link copied!",
        description: "The episode link has been copied to your clipboard.",
      });
    } catch {
      toast({
        title: "Failed to copy link",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* Comment Button */}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-blue-500 h-8 px-2"
        onClick={() => setReplyDialogOpen(true)}
      >
        <MessageCircle className="w-4 h-4 mr-1" />
        <span className="text-xs">
          {interactionCounts?.replies || 0}
        </span>
      </Button>

      {/* Like Button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "text-muted-foreground hover:text-red-500 h-8 px-2",
          userInteractions?.hasLiked && "text-red-500"
        )}
        onClick={handleLike}
      >
        <Heart className={cn(
          "w-4 h-4 mr-1",
          userInteractions?.hasLiked && "fill-current"
        )} />
        <span className="text-xs">
          {interactionCounts?.likes || 0}
        </span>
      </Button>

      {/* Zap Button */}
      <ZapButton
        target={event}
        className="text-xs h-8 px-2"
        zapData={{
          count: interactionCounts?.zaps || 0,
          totalSats: interactionCounts?.totalSats || 0,
          isLoading: false
        }}
        onZapSuccess={(amount: number) => {
          // Optimistically update interaction counts when zap succeeds
          queryClient.setQueryData(['episode-interaction-counts', episode.eventId], (old: InteractionCounts | undefined) => {
            if (!old) return { replies: 0, likes: 0, zaps: 1, totalSats: amount };
            return { ...old, zaps: old.zaps + 1, totalSats: old.totalSats + amount };
          });
        }}
      />

      {/* Share Button */}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-blue-500 h-8 px-2"
        onClick={handleShare}
      >
        <Share className="w-4 h-4" />
      </Button>

      {/* Comment Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Comment on Episode</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg">
              <h4 className="font-semibold text-sm mb-1">{episode.title}</h4>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {episode.description}
              </p>
            </div>

            <Textarea
              placeholder="Write your comment..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="min-h-[100px]"
            />

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setReplyDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReply}
                disabled={!replyContent.trim() || isSubmittingReply}
              >
                {isSubmittingReply ? "Posting..." : "Comment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}