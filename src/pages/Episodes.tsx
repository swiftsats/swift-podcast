import { useSeoMeta } from '@unhead/react';
import { Navigation } from '@/components/Navigation';
import { EpisodeList } from '@/components/podcast/EpisodeList';
import { PODCAST_CONFIG } from '@/lib/podcastConfig';

const Episodes = () => {
  useSeoMeta({
    title: `Episodes - ${PODCAST_CONFIG.podcast.title}`,
    description: `Browse all episodes of ${PODCAST_CONFIG.podcast.title}`,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">All Episodes</h1>
            <p className="text-muted-foreground">
              Browse and listen to all episodes of {PODCAST_CONFIG.podcast.title}
            </p>
          </div>

          <EpisodeList showSearch showPlayer autoPlay />
        </div>
      </main>
    </div>
  );
};

export default Episodes;