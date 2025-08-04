import { useEffect, useState } from 'react';
import { usePodcastEpisodes } from '@/hooks/usePodcastEpisodes';
import { generateRSSFeed } from '@/lib/rssGenerator';

const RSSFeed = () => {
  const [rssContent, setRssContent] = useState<string | null>(null);
  const { data: episodes, isLoading } = usePodcastEpisodes({ limit: 100 });

  useEffect(() => {
    // Try to get RSS content from localStorage first
    const storedContent = localStorage.getItem('podcast-rss-content');

    if (storedContent) {
      setRssContent(storedContent);
    }

    // If we have episodes, generate fresh RSS content
    if (episodes && !isLoading) {
      console.log('Found episodes for RSS:', episodes.length);
      const freshXml = generateRSSFeed(episodes);
      setRssContent(freshXml);

      // Store the fresh content
      localStorage.setItem('podcast-rss-content', freshXml);
      localStorage.setItem('podcast-rss-updated', Date.now().toString());
    } else if (!isLoading) {
      console.log('No episodes found for RSS generation');
      // Generate RSS with empty episodes array
      const emptyXml = generateRSSFeed([]);
      setRssContent(emptyXml);
    }
  }, [episodes, isLoading]);

  useEffect(() => {
    if (rssContent) {
      // Set the content type for proper XML rendering
      const head = document.querySelector('head');
      if (head) {
        // Remove any existing content-type meta tag
        const existingMeta = head.querySelector('meta[http-equiv="content-type"]');
        if (existingMeta) {
          existingMeta.remove();
        }
        
        // Add XML content type
        const metaTag = document.createElement('meta');
        metaTag.setAttribute('http-equiv', 'content-type');
        metaTag.setAttribute('content', 'application/rss+xml; charset=utf-8');
        head.appendChild(metaTag);
      }
    }
  }, [rssContent]);

  if (isLoading) {
    return (
      <div style={{
        fontFamily: 'monospace',
        padding: '20px',
        whiteSpace: 'pre-wrap'
      }}>
        Loading RSS feed...
      </div>
    );
  }

  if (!rssContent) {
    return (
      <div style={{
        fontFamily: 'monospace',
        padding: '20px',
        whiteSpace: 'pre-wrap'
      }}>
        Error loading RSS feed content.
      </div>
    );
  }

  // Return raw XML content
  return (
    <pre style={{
      fontFamily: 'monospace',
      fontSize: '12px',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      margin: 0,
      padding: '10px',
      backgroundColor: '#f5f5f5',
      border: '1px solid #ddd'
    }}>
      {rssContent}
    </pre>
  );
};

export default RSSFeed;