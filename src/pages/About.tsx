import { useSeoMeta } from '@unhead/react';
import { Mail, Globe, Rss, Zap, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Layout } from '@/components/Layout';
import { ZapDialog } from '@/components/ZapDialog';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePodcastStats } from '@/hooks/usePodcastEpisodes';
import { usePodcastConfig } from '@/hooks/usePodcastConfig';
import { getCreatorPubkeyHex } from '@/lib/podcastConfig';

const About = () => {
  const { data: stats } = usePodcastStats();
  const { data: creator } = useAuthor(getCreatorPubkeyHex());
  const { user } = useCurrentUser();
  const podcastConfig = usePodcastConfig();

  useSeoMeta({
    title: `About - ${podcastConfig.podcast.title}`,
    description: podcastConfig.podcast.description,
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">About {podcastConfig.podcast.title}</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Podcast Description */}
              <Card>
                <CardHeader>
                  <CardTitle>About the Show</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {podcastConfig.podcast.image && (
                    <img
                      src={podcastConfig.podcast.image}
                      alt={podcastConfig.podcast.title}
                      className="w-full max-w-sm rounded-lg object-cover"
                    />
                  )}

                  <p className="text-muted-foreground leading-relaxed">
                    {podcastConfig.podcast.description}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Categories:</span>
                      <div className="flex flex-wrap gap-2">
                        {podcastConfig.podcast.categories.map((category) => (
                          <Badge key={category} variant="outline">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Language:</span>
                      <span className="text-muted-foreground">
                        {podcastConfig.podcast.language.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Content Rating:</span>
                      <Badge variant={podcastConfig.podcast.explicit ? "destructive" : "secondary"}>
                        {podcastConfig.podcast.explicit ? "Explicit" : "Clean"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                      {creator?.metadata?.website && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={creator.metadata.website} target="_blank" rel="noopener noreferrer">
                            <Globe className="w-4 h-4 mr-2" />
                            Website
                          </a>
                        </Button>
                      )}

                      {podcastConfig.podcast.email && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`mailto:${podcastConfig.podcast.email}`}>
                            <Mail className="w-4 h-4 mr-2" />
                            Contact
                          </a>
                        </Button>
                      )}

                      <Button variant="outline" size="sm" asChild>
                        <a href={`https://njump.me/${podcastConfig.creatorNpub}`} target="_blank" rel="noopener noreferrer">
                          <Hash className="w-4 h-4 mr-2" />
                          Nostr
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Statistics */}
              {stats && (
                <Card>
                  <CardHeader>
                    <CardTitle>Podcast Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">{stats.totalEpisodes}</div>
                        <div className="text-xs text-muted-foreground">Episodes</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{stats.totalZaps}</div>
                        <div className="text-xs text-muted-foreground">Zaps</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{stats.totalComments}</div>
                        <div className="text-xs text-muted-foreground">Comments</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{stats.totalReposts}</div>
                        <div className="text-xs text-muted-foreground">Reposts</div>
                      </div>
                    </div>

                    <Separator />

                    {stats.mostZappedEpisode && (
                      <div>
                        <h4 className="font-medium mb-2">Most Zapped Episode</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {stats.mostZappedEpisode.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {stats.mostZappedEpisode.zapCount} zaps
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Subscribe */}
              <Card>
                <CardHeader>
                  <CardTitle>Subscribe</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" asChild>
                    <a href="/rss.xml" target="_blank" rel="noopener noreferrer">
                      <Rss className="w-4 h-4 mr-2" />
                      RSS Feed
                    </a>
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Subscribe to the RSS feed in your favorite podcast app to get notified of new episodes.
                  </p>
                </CardContent>
              </Card>

              {/* Support */}
              <Card>
                <CardHeader>
                  <CardTitle>Support the Show</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Support this podcast by zapping episodes, sharing with friends, and engaging with the community.
                  </p>

                  {creator?.event && user && (creator.metadata?.lud16 || creator.metadata?.lud06) ? (
                    <ZapDialog target={creator.event}>
                      <Button variant="outline" className="w-full">
                        <Zap className="w-4 h-4 mr-2" />
                        Zap the Show
                      </Button>
                    </ZapDialog>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      <Zap className="w-4 h-4 mr-2" />
                      {!user ? "Login to Zap" : "Creator has no Lightning address"}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Copyright */}
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground text-center">
                    {podcastConfig.podcast.copyright}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default About;