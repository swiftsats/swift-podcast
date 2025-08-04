import { formatDistanceToNow } from 'date-fns';
import { Clock, Calendar, Zap, MessageCircle, Share } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NoteContent } from '@/components/NoteContent';
import { ZapButton } from '@/components/ZapButton';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import type { PodcastEpisode } from '@/types/podcast';
import type { NostrEvent } from '@nostrify/nostrify';

interface EpisodeCardProps {
  episode: PodcastEpisode;
  showPlayer?: boolean;
  showComments?: boolean;
  onPlayEpisode?: (episode: PodcastEpisode) => void;
  className?: string;
}

export function EpisodeCard({ 
  episode, 
  showPlayer: _showPlayer = false, 
  showComments = false,
  onPlayEpisode,
  className 
}: EpisodeCardProps) {
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

  // Create a mock NostrEvent for the CommentsSection
  const episodeEvent: NostrEvent = {
    id: episode.eventId,
    pubkey: episode.authorPubkey,
    created_at: Math.floor(episode.createdAt.getTime() / 1000),
    kind: 30023, // NIP-23 long-form content
    tags: [],
    content: episode.content || '',
    sig: ''
  };

  // Generate note1 for episode link (NIP-54 uses regular events)
  const episodeNote = nip19.noteEncode(episode.eventId);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start space-x-4">
          {episode.imageUrl && (
            <img
              src={episode.imageUrl}
              alt={episode.title}
              className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
            />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {episode.episodeNumber && (
                  <Badge variant="secondary">
                    Episode {episode.episodeNumber}
                  </Badge>
                )}
                {episode.explicit && (
                  <Badge variant="destructive">Explicit</Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-1">
                {episode.zapCount && episode.zapCount > 0 && (
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Zap className="w-3 h-3" />
                    <span>{episode.zapCount}</span>
                  </div>
                )}
                {episode.commentCount && episode.commentCount > 0 && (
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <MessageCircle className="w-3 h-3" />
                    <span>{episode.commentCount}</span>
                  </div>
                )}
              </div>
            </div>
            
            <Link 
              to={`/${episodeNote}`}
              className="block group"
            >
              <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors cursor-pointer">
                {episode.title}
              </h3>
            </Link>
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDistanceToNow(episode.publishDate, { addSuffix: true })}</span>
              </div>
              
              {episode.duration && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(episode.duration)}</span>
                </div>
              )}
            </div>
            
            {episode.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {episode.tags.slice(0, 5).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
                {episode.tags.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{episode.tags.length - 5} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {episode.description && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground line-clamp-3">
              {episode.description}
            </p>
          </div>
        )}

        {episode.content && (
          <div className="mb-4 prose prose-sm max-w-none">
            <NoteContent 
              event={episodeEvent} 
              className="text-sm"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => onPlayEpisode?.(episode)}
              className="flex-shrink-0"
            >
              Play Episode
            </Button>
            
            <ZapButton
              target={episodeEvent}
              className="text-xs"
            />
          </div>

          <Button variant="ghost" size="sm">
            <Share className="w-4 h-4" />
          </Button>
        </div>

        {showComments && (
          <div className="mt-6 pt-6 border-t">
            <CommentsSection
              root={episodeEvent}
              title="Episode Discussion"
              emptyStateMessage="No comments yet"
              emptyStateSubtitle="Be the first to share your thoughts about this episode!"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}