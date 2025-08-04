import { promises as fs } from 'fs';
import path from 'path';
import { generateRSSFeed } from '../src/lib/rssGenerator.js';
import { PODCAST_CONFIG } from '../src/lib/podcastConfig.js';

// For production build, we'll create an empty RSS feed
// TODO: Fetch episodes from relays or database for production deployment
const mockEpisodes = [];

async function buildRSS() {
  try {
    console.log('🏗️  Building RSS feed for production...');

    // Generate RSS feed
    const rssContent = generateRSSFeed(mockEpisodes, PODCAST_CONFIG);

    // Ensure dist directory exists
    const distDir = path.resolve('dist');
    await fs.mkdir(distDir, { recursive: true });

    // Write RSS file
    const rssPath = path.join(distDir, 'rss.xml');
    await fs.writeFile(rssPath, rssContent, 'utf-8');

    console.log(`✅ RSS feed generated successfully at: ${rssPath}`);
    console.log(`📊 Feed size: ${(rssContent.length / 1024).toFixed(2)} KB`);

    // Write a health check file
    const healthPath = path.join(distDir, 'rss-health.json');
    const healthData = {
      status: 'ok',
      endpoint: '/rss.xml',
      generatedAt: new Date().toISOString(),
      episodeCount: mockEpisodes.length,
      feedSize: rssContent.length,
      environment: 'production',
      accessible: true
    };
    await fs.writeFile(healthPath, JSON.stringify(healthData, null, 2));

    console.log(`✅ Health check file generated at: ${healthPath}`);

    // Write a .nojekyll file for GitHub Pages compatibility
    const nojekyllPath = path.join(distDir, '.nojekyll');
    await fs.writeFile(nojekyllPath, '');
    console.log(`✅ .nojekyll file generated for GitHub Pages compatibility`);

    console.log('\n🎉 RSS feed build completed successfully!');
    console.log('📡 Feed will be available at: /rss.xml');
    console.log('🏥 Health check available at: /rss-health');

  } catch (error) {
    console.error('❌ Error generating RSS feed:', error);
    process.exit(1);
  }
}

// Run the build
buildRSS();