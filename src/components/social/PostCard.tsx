import { formatDistanceToNow } from 'date-fns';
import { Repeat, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExpandableContent } from './ExpandableContent';
import { RepostCard } from './RepostCard';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { cn } from '@/lib/utils';
import type { NostrEvent } from '@nostrify/nostrify';

interface PostCardProps {
  event: NostrEvent;
  isCompact?: boolean;
  className?: string;
}

export function PostCard({ event, isCompact = false, className }: PostCardProps) {
  const { data: author } = useAuthor(event.pubkey);

  // Handle reposts with a specialized component
  if (event.kind === 6 || event.kind === 16) {
    return <RepostCard event={event} className={className} />;
  }

  const metadata = author?.metadata;
  const displayName = metadata?.name || metadata?.display_name || genUserName(event.pubkey);
  const postDate = new Date(event.created_at * 1000);

  const getPostTypeInfo = () => {
    switch (event.kind) {
      case 1:
        return { icon: null, label: null, bgColor: '' };
      case 6:
        return {
          icon: <Repeat className="w-4 h-4" />,
          label: 'reposted',
          bgColor: 'bg-green-50 dark:bg-green-950'
        };
      case 7:
        return {
          icon: <Heart className="w-4 h-4" />,
          label: 'liked',
          bgColor: 'bg-red-50 dark:bg-red-950'
        };
      default:
        return { icon: null, label: null, bgColor: '' };
    }
  };

  const { icon, label, bgColor } = getPostTypeInfo();

  return (
    <Card className={cn(className, bgColor)}>
      <CardContent className="p-6">
        <div className="flex items-start space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={metadata?.picture} alt={displayName} />
            <AvatarFallback>
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <p className="font-semibold">{displayName}</p>
              {icon && (
                <>
                  {icon}
                  <span className="text-sm text-muted-foreground">{label}</span>
                </>
              )}
              <span className="text-sm text-muted-foreground">•</span>
              <time className="text-sm text-muted-foreground">
                {formatDistanceToNow(postDate, { addSuffix: true })}
              </time>
            </div>

            {/* Use ExpandableContent for the post content */}
            <ExpandableContent
              event={event}
              isCompact={isCompact}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}