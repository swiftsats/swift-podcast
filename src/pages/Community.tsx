import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { MessageCircle, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigation } from '@/components/Navigation';
import { ZapLeaderboard } from '@/components/podcast/ZapLeaderboard';
import { RecentActivity } from '@/components/podcast/RecentActivity';
import { EpisodeDiscussions } from '@/components/podcast/EpisodeDiscussions';
import { PODCAST_CONFIG } from '@/lib/podcastConfig';

const Community = () => {
  useSeoMeta({
    title: `Community - ${PODCAST_CONFIG.podcast.title}`,
    description: `Join the community discussion for ${PODCAST_CONFIG.podcast.title}`,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Community</h1>
            <p className="text-muted-foreground">
              Engage with the {PODCAST_CONFIG.podcast.title} community
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              <Tabs defaultValue="activity" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="activity" className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Recent Activity</span>
                  </TabsTrigger>
                  <TabsTrigger value="discussions" className="flex items-center space-x-2">
                    <MessageCircle className="w-4 h-4" />
                    <span>Discussions</span>
                  </TabsTrigger>
                  <TabsTrigger value="supporters" className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>Top Supporters</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="activity" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Community Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RecentActivity limit={20} showTitle={false} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="discussions" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Episode Discussions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EpisodeDiscussions limit={15} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="supporters" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Supporters</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ZapLeaderboard limit={20} showTitle={false} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Community Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Community Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">🚧</div>
                    <div className="text-sm text-muted-foreground mt-2">
                      Community metrics will appear here as engagement grows
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* How to Engage */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How to Engage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start space-x-3">
                      <MessageCircle className="w-4 h-4 mt-1 text-blue-500" />
                      <div>
                        <p className="font-medium">Comment on Episodes</p>
                        <p className="text-muted-foreground">Share your thoughts on individual episodes</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <TrendingUp className="w-4 h-4 mt-1 text-green-500" />
                      <div>
                        <p className="font-medium">Zap Episodes</p>
                        <p className="text-muted-foreground">Support the creator with Lightning tips</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Users className="w-4 h-4 mt-1 text-purple-500" />
                      <div>
                        <p className="font-medium">Join the Leaderboard</p>
                        <p className="text-muted-foreground">Become a top supporter</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Nostr Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Powered by Nostr</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <p className="text-muted-foreground">
                      This community runs on the Nostr protocol, ensuring:
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Censorship resistance</li>
                      <li>• User ownership of data</li>
                      <li>• Cross-platform compatibility</li>
                      <li>• Lightning-native payments</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Community;