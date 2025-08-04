import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Clock, Calendar, ArrowLeft, Headphones } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteContent } from '@/components/NoteContent';
import { AudioPlayer } from './AudioPlayer';
import { EpisodeActions } from './EpisodeActions';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { Navigation } from '@/components/Navigation';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { PodcastEpisode } from '@/types/podcast';
import type { NostrEvent } from '@nostrify/nostrify';

interface EpisodePageProps {
  eventId?: string; // For note1/nevent1
}

export function EpisodePage({ eventId }: EpisodePageProps) {
  const { nostr } = useNostr();
  const navigate = useNavigate();
  const [showPlayer, setShowPlayer] = useState(false);
  const [showComments, setShowComments] = useState(true);

  // Query for the episode event
  const { data: episodeEvent, isLoading } = useQuery<NostrEvent | null>({
    queryKey: ['episode', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      if (!eventId) {
        return null;
      }

      const events = await nostr.query([{
        ids: [eventId],
        limit: 1
      }], { signal });

      return events[0] || null;
    },
    staleTime: 60000, // 1 minute
    enabled: !!eventId
  });

  // Convert NostrEvent to PodcastEpisode format (NIP-54)
  const episode: PodcastEpisode | null = episodeEvent ? (() => {
    const tags = new Map(episodeEvent.tags.map(([key, ...values]) => [key, values]));

    const title = tags.get('title')?.[0] || 'Untitled Episode';
    const description = tags.get('description')?.[0] || '';
    const imageUrl = tags.get('image')?.[0] || '';

    // Extract audio URL and type from audio tag (NIP-54 format)
    const audioTag = tags.get('audio');
    const audioUrl = audioTag?.[0] || '';
    const audioType = audioTag?.[1] || 'audio/mpeg';

    // Extract all 't' tags for topics
    const topicTags = episodeEvent.tags
      .filter(([name]) => name === 't')
      .map(([, value]) => value);

    return {
      id: episodeEvent.id,
      eventId: episodeEvent.id,
      title,
      description,
      content: episodeEvent.content,
      authorPubkey: episodeEvent.pubkey,
      audioUrl,
      audioType,
      imageUrl,
      publishDate: new Date(episodeEvent.created_at * 1000),
      createdAt: new Date(episodeEvent.created_at * 1000),
      episodeNumber: undefined, // Can be extended later if needed
      seasonNumber: undefined, // Can be extended later if needed
      duration: undefined, // Can be extended later if needed
      explicit: false, // Can be extended later if needed
      tags: topicTags,
      zapCount: 0,
      commentCount: 0,
      repostCount: 0
    };
  })() : null;

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Card>
              <CardHeader>
                <div className="flex items-start space-x-4">
                  <Skeleton className="w-32 h-32 rounded-lg" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <Skeleton className="h-8 w-3/4" />
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Card>
              <CardContent className="py-12 text-center">
                <h2 className="text-xl font-semibold mb-2">Episode Not Found</h2>
                <p className="text-muted-foreground mb-4">
                  This episode doesn't exist or hasn't been published yet.
                </p>
                <Button asChild>
                  <Link to="/episodes">Browse All Episodes</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Episodes
          </Button>

          {/* Episode Header */}
          <Card>
            <CardHeader>
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                {episode.imageUrl && (
                  <img
                    src={episode.imageUrl}
                    alt={episode.title}
                    className="w-32 h-32 lg:w-48 lg:h-48 rounded-lg object-cover flex-shrink-0 shadow-lg"
                  />
                )}

                <div className="flex-1 min-w-0 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {episode.episodeNumber && (
                      <Badge variant="secondary">
                        Episode {episode.episodeNumber}
                      </Badge>
                    )}
                    {episode.seasonNumber && (
                      <Badge variant="outline">
                        Season {episode.seasonNumber}
                      </Badge>
                    )}
                    {episode.explicit && (
                      <Badge variant="destructive">Explicit</Badge>
                    )}
                  </div>

                  <CardTitle className="text-2xl lg:text-3xl">
                    {episode.title}
                  </CardTitle>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDistanceToNow(episode.publishDate, { addSuffix: true })}</span>
                    </div>

                    {episode.duration && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDuration(episode.duration)}</span>
                      </div>
                    )}
                  </div>

                  {episode.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {episode.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Episode Description */}
              {episode.description && (
                <div>
                  <p className="text-muted-foreground leading-relaxed">
                    {episode.description}
                  </p>
                </div>
              )}

              {/* Episode Content */}
              {episode.content && (
                <div className="prose prose-sm max-w-none">
                  <NoteContent
                    event={episodeEvent!}
                    className="text-sm"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4 border-t">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setShowPlayer(true)}
                    disabled={!episode.audioUrl}
                    className="flex items-center gap-2"
                  >
                    <Headphones className="w-4 h-4" />
                    Listen Now
                  </Button>

                  {!episode.audioUrl && (
                    <p className="text-sm text-muted-foreground">
                      Audio not available
                    </p>
                  )}
                </div>

                {/* Social Actions */}
                <EpisodeActions 
                  episode={episode} 
                  showComments={showComments}
                  onToggleComments={() => setShowComments(!showComments)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Audio Player */}
          {showPlayer && episode.audioUrl && (
            <AudioPlayer episode={episode} autoPlay={true} />
          )}

          {/* Comments Section */}
          {showComments && (
            <Card>
              <CardContent className="pt-6">
                {episodeEvent ? (
                  <CommentsSection
                    root={episodeEvent}
                    title="Episode Discussion"
                    emptyStateMessage="No comments yet"
                    emptyStateSubtitle="Be the first to share your thoughts about this episode!"
                    limit={100}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Unable to load comments for this episode.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}