import { useSeoMeta } from '@unhead/react';
import { MessageSquare, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigation } from '@/components/Navigation';
import { PostCard } from '@/components/social/PostCard';
import { ConversationThread } from '@/components/social/ConversationThread';
import { InfiniteScroll } from '@/components/ui/InfiniteScroll';
import { useCreatorPosts, useCreatorRepliesTab } from '@/hooks/useCreatorPosts';
import { useAuthor } from '@/hooks/useAuthor';
import { getCreatorPubkeyHex, PODCAST_CONFIG } from '@/lib/podcastConfig';
import { genUserName } from '@/lib/genUserName';

const SocialFeed = () => {
  const {
    data: postsData,
    fetchNextPage: fetchNextPosts,
    hasNextPage: hasNextPosts,
    isFetching: isFetchingPosts,
    isLoading: postsLoading,
    error: postsError,
  } = useCreatorPosts(20);

  const {
    data: repliesData,
    fetchNextPage: fetchNextReplies,
    hasNextPage: hasNextReplies,
    isFetching: isFetchingReplies,
    isLoading: repliesLoading,
  } = useCreatorRepliesTab(20);

  const { data: creator } = useAuthor(getCreatorPubkeyHex());

  // Flatten infinite query data for rendering
  const notesColumnData = postsData?.pages.flat() || [];
  const repliesColumnData = repliesData?.pages.flat() || [];

  const creatorName = creator?.metadata?.name ||
                     creator?.metadata?.display_name ||
                     genUserName(getCreatorPubkeyHex());

  useSeoMeta({
    title: `${creatorName}'s Social Feed - ${PODCAST_CONFIG.podcast.title}`,
    description: `Follow ${creatorName}'s social updates and posts`,
  });

  const PostSkeleton = () => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start space-x-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center space-x-4 pt-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ message, subtitle }: { message: string; subtitle: string }) => (
    <div className="col-span-full">
      <Card className="border-dashed">
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-muted-foreground">{message}</p>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const ErrorState = () => (
    <div className="col-span-full">
      <Card className="border-dashed border-red-200">
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <p className="text-muted-foreground">
              Failed to load social feed. Please try refreshing the page.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{creatorName}'s Social Feed</h1>
            <p className="text-muted-foreground">
              Follow the latest updates and thoughts from the podcast creator
            </p>
          </div>

          <Tabs defaultValue="notes" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="notes" className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>Notes</span>
              </TabsTrigger>
              <TabsTrigger value="replies" className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Replies</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="space-y-4">
              {postsError && <ErrorState />}

              {postsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <PostSkeleton key={i} />
                  ))}
                </div>
              ) : notesColumnData.length > 0 ? (
                <InfiniteScroll
                  hasMore={!!hasNextPosts}
                  isLoading={isFetchingPosts}
                  onLoadMore={fetchNextPosts}
                >
                  {notesColumnData.map((event) => (
                    <PostCard key={event.id} event={event} />
                  ))}
                </InfiniteScroll>
              ) : (
                <EmptyState
                  message="No notes found"
                  subtitle="The creator hasn't posted anything yet, or posts may be on a different relay."
                />
              )}
            </TabsContent>

            <TabsContent value="replies" className="space-y-4">
              {repliesLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <PostSkeleton key={i} />
                  ))}
                </div>
              ) : repliesColumnData.length > 0 ? (
                <InfiniteScroll
                  hasMore={!!hasNextReplies}
                  isLoading={isFetchingReplies}
                  onLoadMore={fetchNextReplies}
                >
                  {repliesColumnData.map((event) => (
                    <ConversationThread key={event.id} event={event} />
                  ))}
                </InfiniteScroll>
              ) : (
                <EmptyState
                  message="No replies found"
                  subtitle="The creator hasn't replied to anyone yet, or replies may be on a different relay."
                />
              )}
            </TabsContent>
          </Tabs>


          {/* Creator Info Card */}
          <Card className="mt-8">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                {creator?.metadata?.picture && (
                  <img
                    src={creator.metadata.picture}
                    alt={creatorName}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{creatorName}</h3>
                  {creator?.metadata?.about && (
                    <p className="text-muted-foreground mt-1">
                      {creator.metadata.about}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 mt-3 text-sm text-muted-foreground">
                    <span>Podcast Creator</span>
                    {creator?.metadata?.nip05 && (
                      <span>✓ {creator.metadata.nip05}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SocialFeed;