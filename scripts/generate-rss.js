#!/usr/bin/env node

/**
 * Server-side RSS generation script for PODSTR
 * Pulls data from Nostr relays and generates static RSS XML file
 * Run this script periodically via cron to update the RSS feed
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NPool, NRelay1 } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PODCAST_CONFIG = {
  creatorNpub: "npub1km5prrxcgt5fwgjzjpltyswsuu7u7jcj2cx9hk2rwvxyk00v2jqsgv0a3h",
  podcast: {
    title: "PODSTR Podcast",
    description: "A Nostr-powered podcast exploring decentralized conversations",
    author: "PODSTR Creator",
    email: "creator@podstr.example",
    image: "https://example.com/podcast-artwork.jpg",
    language: "en-us",
    categories: ["Technology", "Social Networking", "Society & Culture"],
    explicit: false,
    website: "https://podstr.example",
    copyright: "© 2025 PODSTR Creator",
    funding: [],
    locked: false,
    value: { amount: 0, currency: "USD" },
    type: "episodic",
    complete: false,
    guid: "npub1km5prrxcgt5fwgjzjpltyswsuu7u7jcj2cx9hk2rwvxyk00v2jqsgv0a3h",
    medium: "podcast",
    publisher: "PODSTR Creator",
    person: [{ name: "PODSTR Creator", role: "host", group: "cast" }],
    license: { identifier: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" }
  }
};

const PODCAST_KINDS = { EPISODE: 54 };
const BASE_URL = process.env.BASE_URL || 'https://podstr.example';

// Default relay URLs - can be overridden via environment variable
const DEFAULT_RELAYS = [
  'wss://relay.nostr.band',
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net'
];

const RELAY_URLS = process.env.NOSTR_RELAYS ? 
  process.env.NOSTR_RELAYS.split(',').map(url => url.trim()) : 
  DEFAULT_RELAYS;

/**
 * Get creator's pubkey in hex format
 */
function getCreatorPubkeyHex() {
  try {
    const { type, data } = nip19.decode(PODCAST_CONFIG.creatorNpub);
    if (type === 'npub') {
      return data;
    }
    throw new Error('Invalid npub format');
  } catch (error) {
    console.error('Failed to decode creator npub:', error);
    return PODCAST_CONFIG.creatorNpub;
  }
}

/**
 * Validates if a Nostr event is a valid podcast episode (NIP-54)
 */
function validatePodcastEpisode(event) {
  if (event.kind !== PODCAST_KINDS.EPISODE) return false;

  // Check for required title tag (NIP-54)
  const title = event.tags.find(([name]) => name === 'title')?.[1];
  if (!title) return false;

  // Check for required audio tag (NIP-54)
  const audio = event.tags.find(([name]) => name === 'audio')?.[1];
  if (!audio) return false;

  // Verify it's from the podcast creator
  if (event.pubkey !== getCreatorPubkeyHex()) return false;

  return true;
}

/**
 * Converts a validated Nostr event to a PodcastEpisode object
 */
function eventToPodcastEpisode(event) {
  const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));

  const title = tags.get('title')?.[0] || 'Untitled Episode';
  const description = tags.get('description')?.[0];
  const imageUrl = tags.get('image')?.[0];

  // Extract audio URL and type from audio tag (NIP-54 format)
  const audioTag = tags.get('audio');
  const audioUrl = audioTag?.[0] || '';
  const audioType = audioTag?.[1] || 'audio/mpeg';

  // Extract all 't' tags for topics
  const topicTags = event.tags
    .filter(([name]) => name === 't')
    .map(([, value]) => value);

  return {
    id: event.id,
    title,
    description,
    content: event.content || undefined,
    audioUrl,
    audioType,
    imageUrl,
    duration: undefined,
    episodeNumber: undefined,
    seasonNumber: undefined,
    publishDate: new Date(event.created_at * 1000),
    explicit: false,
    tags: topicTags,
    externalRefs: [],
    eventId: event.id,
    authorPubkey: event.pubkey,
    createdAt: new Date(event.created_at * 1000),
  };
}

/**
 * Checks if an event is an edit of another event
 */
function isEditEvent(event) {
  return event.tags.some(([name]) => name === 'edit');
}

/**
 * Gets the original event ID from an edit event
 */
function getOriginalEventId(event) {
  return event.tags.find(([name]) => name === 'edit')?.[1];
}

/**
 * Encode event ID as nevent for better discoverability
 */
function encodeEventIdAsNevent(eventId, authorPubkey) {
  try {
    return nip19.neventEncode({
      id: eventId,
      author: authorPubkey,
      relays: RELAY_URLS.slice(0, 2) // Include first 2 relays as hints
    });
  } catch (error) {
    console.warn('Failed to encode nevent:', error);
    return eventId;
  }
}

/**
 * Escapes XML special characters
 */
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Converts a PodcastEpisode to an RSS item
 */
function episodeToRSSItem(episode) {
  return {
    title: episode.title,
    description: episode.description || '',
    link: `${BASE_URL}/${encodeEventIdAsNevent(episode.eventId, episode.authorPubkey)}`,
    guid: episode.id,
    pubDate: episode.publishDate.toUTCString(),
    author: `${PODCAST_CONFIG.podcast.email} (${PODCAST_CONFIG.podcast.author})`,
    category: episode.tags,
    enclosure: {
      url: episode.audioUrl,
      length: 0, // Would need to fetch file size
      type: episode.audioType || 'audio/mpeg'
    },
    duration: episode.duration,
    episodeNumber: episode.episodeNumber,
    seasonNumber: episode.seasonNumber,
    explicit: episode.explicit,
    image: episode.imageUrl,
  };
}

/**
 * Formats duration from seconds to HH:MM:SS
 */
function formatDuration(seconds) {
  if (!seconds) return undefined;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generates RSS XML for podcast episodes
 */
function generateRSSFeed(episodes) {
  const rssItems = episodes
    .sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime())
    .map(episode => episodeToRSSItem(episode));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:podcast="https://podcastindex.org/namespace/1.0"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(PODCAST_CONFIG.podcast.title)}</title>
    <description>${escapeXml(PODCAST_CONFIG.podcast.description)}</description>
    <link>${escapeXml(PODCAST_CONFIG.podcast.website || BASE_URL)}</link>
    <language>${escapeXml(PODCAST_CONFIG.podcast.language)}</language>
    <copyright>${escapeXml(PODCAST_CONFIG.podcast.copyright)}</copyright>
    <managingEditor>${escapeXml(PODCAST_CONFIG.podcast.email)} (${escapeXml(PODCAST_CONFIG.podcast.author)})</managingEditor>
    <webMaster>${escapeXml(PODCAST_CONFIG.podcast.email)} (${escapeXml(PODCAST_CONFIG.podcast.author)})</webMaster>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>60</ttl>

    <!-- iTunes/Apple Podcasts tags -->
    <itunes:title>${escapeXml(PODCAST_CONFIG.podcast.title)}</itunes:title>
    <itunes:summary>${escapeXml(PODCAST_CONFIG.podcast.description)}</itunes:summary>
    <itunes:author>${escapeXml(PODCAST_CONFIG.podcast.author)}</itunes:author>
    <itunes:owner>
      <itunes:name>${escapeXml(PODCAST_CONFIG.podcast.author)}</itunes:name>
      <itunes:email>${escapeXml(PODCAST_CONFIG.podcast.email)}</itunes:email>
    </itunes:owner>
    ${PODCAST_CONFIG.podcast.image ? `<itunes:image href="${escapeXml(PODCAST_CONFIG.podcast.image)}" />` : ''}
    ${PODCAST_CONFIG.podcast.categories.map(cat => `<itunes:category text="${escapeXml(cat)}" />`).join('\n    ')}
    <itunes:explicit>${PODCAST_CONFIG.podcast.explicit ? 'true' : 'false'}</itunes:explicit>
    <itunes:type>${PODCAST_CONFIG.podcast.type || 'episodic'}</itunes:type>

    <!-- Podcasting 2.0 tags -->
    <podcast:guid>${escapeXml(PODCAST_CONFIG.podcast.guid || PODCAST_CONFIG.creatorNpub)}</podcast:guid>
    <podcast:locked>${PODCAST_CONFIG.podcast.locked ? 'yes' : 'no'}</podcast:locked>
    ${PODCAST_CONFIG.podcast.medium ? `<podcast:medium>${escapeXml(PODCAST_CONFIG.podcast.medium)}</podcast:medium>` : ''}
    ${PODCAST_CONFIG.podcast.publisher ? `<podcast:publisher>${escapeXml(PODCAST_CONFIG.podcast.publisher)}</podcast:publisher>` : ''}
    ${PODCAST_CONFIG.podcast.license ? 
      `<podcast:license ${PODCAST_CONFIG.podcast.license.url ? `url="${escapeXml(PODCAST_CONFIG.podcast.license.url)}"` : ''}>${escapeXml(PODCAST_CONFIG.podcast.license.identifier)}</podcast:license>` : ''
    }
    ${PODCAST_CONFIG.podcast.person && PODCAST_CONFIG.podcast.person.length > 0 ?
      PODCAST_CONFIG.podcast.person.map(person =>
        `<podcast:person role="${escapeXml(person.role)}" ${person.group ? `group="${escapeXml(person.group)}"` : ''} ${person.img ? `img="${escapeXml(person.img)}"` : ''} ${person.href ? `href="${escapeXml(person.href)}"` : ''}>${escapeXml(person.name)}</podcast:person>`
      ).join('\n    ') : ''
    }
    ${PODCAST_CONFIG.podcast.funding && PODCAST_CONFIG.podcast.funding.length > 0 ?
      PODCAST_CONFIG.podcast.funding.map(funding =>
        `<podcast:funding url="${escapeXml(funding)}">Support this podcast</podcast:funding>`
      ).join('\n    ') :
      `<podcast:funding url="${escapeXml(BASE_URL)}">Support this podcast via Lightning</podcast:funding>`
    }

    <!-- Generator -->
    <generator>PODSTR - Nostr Podcast Platform</generator>

    ${rssItems.map(item => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <description>${escapeXml(item.description)}</description>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>
      <pubDate>${item.pubDate}</pubDate>
      <author>${escapeXml(item.author || PODCAST_CONFIG.podcast.email)}</author>
      ${item.category?.map(cat => `<category>${escapeXml(cat)}</category>`).join('\n      ') || ''}

      <!-- Enclosure (required for podcasts) -->
      <enclosure url="${escapeXml(item.enclosure.url)}"
                 length="${item.enclosure.length}"
                 type="${escapeXml(item.enclosure.type)}" />

      <!-- iTunes tags -->
      <itunes:title>${escapeXml(item.title)}</itunes:title>
      <itunes:summary>${escapeXml(item.description)}</itunes:summary>
      <itunes:author>${escapeXml(PODCAST_CONFIG.podcast.author)}</itunes:author>
      ${item.duration ? `<itunes:duration>${formatDuration(item.duration)}</itunes:duration>` : ''}
      ${item.episodeNumber ? `<itunes:episode>${item.episodeNumber}</itunes:episode>` : ''}
      ${item.seasonNumber ? `<itunes:season>${item.seasonNumber}</itunes:season>` : ''}
      <itunes:explicit>${item.explicit ? 'true' : 'false'}</itunes:explicit>
      ${item.image ? `<itunes:image href="${escapeXml(item.image)}" />` : ''}

      <!-- Podcasting 2.0 tags -->
      <podcast:guid>${escapeXml(item.guid)}</podcast:guid>
    </item>`).join('')}
  </channel>
</rss>`;

  return xml;
}

/**
 * Fetch podcast episodes from Nostr relays
 */
async function fetchPodcastEpisodes() {
  console.log('🔍 Connecting to Nostr relays...');
  console.log('📡 Relays:', RELAY_URLS);

  const creatorPubkey = getCreatorPubkeyHex();
  console.log('👤 Creator pubkey:', creatorPubkey);

  let pool = null;
  let events = [];

  try {
    // Create pool instance with relay configuration
    pool = new NPool({
      open(url) {
        return new NRelay1(url);
      },
      reqRouter(filters) {
        // Distribute requests to all relays
        const relayMap = new Map();
        for (const relayUrl of RELAY_URLS) {
          relayMap.set(relayUrl, filters);
        }
        return relayMap;
      },
      eventRouter() {
        // For publishing (not used in this script)
        return RELAY_URLS;
      },
    });
    
    console.log(`📡 Pool configured with ${RELAY_URLS.length} relays`);
    
    // Query for podcast episodes
    console.log('🔍 Querying for podcast episodes...');
    const filters = [{
      kinds: [PODCAST_KINDS.EPISODE],
      authors: [creatorPubkey],
      limit: 100,
    }];

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const relayEvents = await pool.query(filters, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      console.log(`✅ Found ${relayEvents.length} events`);
      events = relayEvents;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.warn('⚠️  Query timed out after 15 seconds');
      } else {
        throw error;
      }
    }

    // Filter and validate events
    const validEvents = events.filter(validatePodcastEpisode);
    console.log(`✅ Valid podcast episodes found: ${validEvents.length}`);

    if (validEvents.length === 0) {
      console.log('ℹ️  No valid podcast episodes found. Generating empty feed.');
      return [];
    }

    // Deduplicate episodes by title - keep only the latest version of each title
    const episodesByTitle = new Map();
    const originalEvents = new Set(); // Track original events that have been edited

    // First pass: identify edited events and their originals
    validEvents.forEach(event => {
      if (isEditEvent(event)) {
        const originalId = getOriginalEventId(event);
        if (originalId) {
          originalEvents.add(originalId);
        }
      }
    });

    // Second pass: select the best version for each title
    validEvents.forEach(event => {
      const title = event.tags.find(([name]) => name === 'title')?.[1] || '';
      if (!title) return;

      // Skip if this is an original event that has been edited
      if (originalEvents.has(event.id)) return;

      const existing = episodesByTitle.get(title);
      if (!existing || event.created_at > existing.created_at) {
        episodesByTitle.set(title, event);
      }
    });

    // Convert to podcast episodes
    const episodes = Array.from(episodesByTitle.values()).map(eventToPodcastEpisode);
    console.log(`📻 Final episodes after deduplication: ${episodes.length}`);

    // Sort by publish date (newest first for RSS)
    episodes.sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime());

    return episodes;

  } catch (error) {
    console.error('❌ Failed to fetch podcast episodes:', error);
    console.log('ℹ️  Continuing with empty episode list...');
    return [];
  } finally {
    // Clean up pool connection
    if (pool) {
      try {
        await pool.close();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Main function to generate RSS feed
 */
async function generateRSS() {
  try {
    console.log('🚀 Starting RSS generation...');
    console.log('🌐 Base URL:', BASE_URL);
    
    // Fetch episodes from Nostr relays
    const episodes = await fetchPodcastEpisodes();

    // Generate RSS feed
    console.log('🏗️  Generating RSS XML...');
    const rssContent = generateRSSFeed(episodes);

    // Ensure dist directory exists
    const distDir = path.resolve(path.join(__dirname, '..', 'dist'));
    await fs.mkdir(distDir, { recursive: true });

    // Write RSS file
    const rssPath = path.join(distDir, 'rss.xml');
    await fs.writeFile(rssPath, rssContent, 'utf-8');

    console.log(`✅ RSS feed generated successfully at: ${rssPath}`);
    console.log(`📊 Feed size: ${(rssContent.length / 1024).toFixed(2)} KB`);
    console.log(`📻 Episodes: ${episodes.length}`);

    // Write a health check file
    const healthPath = path.join(distDir, 'rss-health.json');
    const healthData = {
      status: 'ok',
      endpoint: '/rss.xml',
      generatedAt: new Date().toISOString(),
      episodeCount: episodes.length,
      feedSize: rssContent.length,
      environment: 'production',
      accessible: true,
      relays: RELAY_URLS,
      creatorPubkey: getCreatorPubkeyHex(),
      baseUrl: BASE_URL
    };
    await fs.writeFile(healthPath, JSON.stringify(healthData, null, 2));

    console.log(`✅ Health check file generated at: ${healthPath}`);
    console.log('\n🎉 RSS feed generation completed successfully!');
    console.log('📡 Feed will be available at: /rss.xml');
    console.log('🏥 Health check available at: /rss-health.json');

    if (episodes.length > 0) {
      console.log('\n📋 Episode Summary:');
      episodes.slice(0, 5).forEach((episode, i) => {
        console.log(`  ${i + 1}. ${episode.title} (${episode.publishDate.toDateString()})`);
      });
      if (episodes.length > 5) {
        console.log(`  ... and ${episodes.length - 5} more episodes`);
      }
    }

  } catch (error) {
    console.error('❌ Error generating RSS feed:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateRSS();
}

export { generateRSS, fetchPodcastEpisodes, generateRSSFeed };