import { useEffect, useState } from 'react';
import { useRSSFeedGenerator } from '@/hooks/useRSSFeedGenerator';
import { generateRSSFeed } from '@/lib/rssGenerator';

const RSSFeed = () => {
  const [rssContent, setRssContent] = useState<string | null>(null);
  const { data: rssData, isLoading } = useRSSFeedGenerator();

  useEffect(() => {
    // Try to get RSS content from localStorage first (for fast loading)
    const storedContent = localStorage.getItem('podcast-rss-content');
    const storedTime = localStorage.getItem('podcast-rss-updated');

    if (storedContent && storedTime) {
      const storedAge = Date.now() - parseInt(storedTime);
      // Use cached content if it's less than 5 minutes old
      if (storedAge < 5 * 60 * 1000) {
        setRssContent(storedContent);
      }
    }

    // If we have RSS data from the hook, use it
    if (rssData && !isLoading) {
      console.log('RSS feed generated with episodes:', rssData.episodes.length);
      // The RSS content is already generated and stored by the hook
      // Just get the fresh content from localStorage
      const freshContent = localStorage.getItem('podcast-rss-content');
      if (freshContent) {
        setRssContent(freshContent);
      }
    } else if (!isLoading) {
      console.log('No RSS data available, generating empty feed');
      // Generate RSS with empty episodes array
      const emptyXml = generateRSSFeed([]);
      setRssContent(emptyXml);
    }
  }, [rssData, isLoading]);

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