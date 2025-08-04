import express from 'express';
import { createServer as createViteServer } from 'vite';
import type { ViteDevServer } from 'vite';

const isProduction = process.env.NODE_ENV === 'production';

async function createServer() {
  const app = express();

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });
  app.use(vite.middlewares);

  // RSS feed endpoint
  app.get('/rss.xml', async (req, res) => {
    try {
      // Set proper content type and caching headers
      res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      res.setHeader('Last-Modified', new Date().toUTCString());

      if (isProduction) {
        // In production, try to serve the pre-built RSS file first
        const fs = await import('fs/promises');
        const path = await import('path');

        try {
          const rssPath = path.resolve('dist', 'rss.xml');
          const stats = await fs.stat(rssPath);
          const rssContent = await fs.readFile(rssPath, 'utf-8');

          // Set Last-Modified header from file stats
          res.setHeader('Last-Modified', stats.mtime.toUTCString());
          res.send(rssContent);
          return;
        } catch (error) {
          console.log('RSS file not found, generating on the fly:', (error as Error).message);
        }
      }

      // Generate RSS on the fly for development or as fallback
      console.log('Generating RSS feed on the fly...');

      // Dynamically import required modules
      const { generateRSSFeed } = await import('../src/lib/rssGenerator.ts');
      const { getCreatorPubkeyHex, PODCAST_KINDS } = await import('../src/lib/podcastConfig.ts');

      // For now, generate with empty episodes
      // In a real implementation, you would fetch from relays here
      const rssContent = generateRSSFeed([]);

      res.send(rssContent);

    } catch (error) {
      console.error('Error generating RSS feed:', error);

      // Return a minimal valid RSS feed even on error
      res.status(200).setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PODSTR Podcast</title>
    <description>A Nostr-powered podcast platform</description>
    <link>https://podstr.example</link>
    <atom:link href="https://podstr.example/rss.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>PODSTR - Nostr Podcast Platform</generator>
    <language>en-us</language>
    <ttl>60</ttl>
    <item>
      <title>Welcome to PODSTR</title>
      <description>This is a placeholder episode. Please check back later for actual podcast content.</description>
      <link>https://podstr.example</link>
      <guid isPermaLink="false">welcome-placeholder</guid>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
  </channel>
</rss>`);
    }
  });

  // RSS feed health check endpoint
  app.get('/rss-health', async (req, res) => {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      let rssFileExists = false;
      let rssStats: any = null;

      if (isProduction) {
        try {
          const rssPath = path.resolve('dist', 'rss.xml');
          rssStats = await fs.stat(rssPath);
          rssFileExists = true;
        } catch {
          rssFileExists = false;
        }
      }

      res.json({
        status: 'ok',
        endpoint: '/rss.xml',
        timestamp: new Date().toISOString(),
        environment: isProduction ? 'production' : 'development',
        rssFileExists,
        rssStats: rssStats ? {
          size: rssStats.size,
          lastModified: rssStats.mtime.toISOString(),
        } : null,
        accessible: true,
        headers: {
          'Content-Type': 'application/rss+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Serve static files from dist in production
  if (isProduction) {
    const expressStatic = await import('express').then(m => m.default);
    app.use(expressStatic.static('dist'));
  }

  // Serve index.html for all other routes
  app.use('*', async (req, res) => {
    try {
      const url = req.originalUrl;
      let template;
      if (isProduction) {
        template = await import('fs').then(fs => fs.readFileSync('dist/index.html', 'utf-8'));
      } else {
        template = await import('fs').then(fs => fs.readFileSync('index.html', 'utf-8'));
      }

      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      console.error(e);
      res.status(500).end(e.message);
    }
  });

  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`📡 RSS feed available at http://localhost:${port}/rss.xml`);
    console.log(`🏥 Health check at http://localhost:${port}/rss-health`);
    console.log(`🌐 Environment: ${isProduction ? 'production' : 'development'}`);
  });
}

createServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});