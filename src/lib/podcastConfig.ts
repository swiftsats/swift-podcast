import { nip19 } from 'nostr-tools';

/**
 * Podcast configuration for PODSTR
 * This defines the podcast metadata and creator information
 */

export interface PodcastConfig {
  /** The hardcoded npub of the podcast creator */
  creatorNpub: string;

  /** Podcast metadata */
  podcast: {
    title: string;
    description: string;
    author: string;
    email: string;
    image: string;
    language: string;
    categories: string[];
    explicit: boolean;
    website: string;
    copyright: string;
    funding: string[];
    locked: boolean;
    value: {
      amount: number;
      currency: string;
      recipients?: Array<{
        name: string;
        type: 'node' | 'keysend';
        address: string;
        split: number;
        customKey?: string;
        customValue?: string;
      }>;
    };
    type: 'episodic' | 'serial';
    complete: boolean;
    // New Podcasting 2.0 fields
    guid?: string; // Unique podcast identifier
    medium?: 'podcast' | 'music' | 'video' | 'film' | 'audiobook' | 'newsletter' | 'blog';
    publisher?: string; // Publisher name
    location?: {
      name: string;
      geo?: string; // latitude,longitude
      osm?: string; // OpenStreetMap identifier
    };
    person?: Array<{
      name: string;
      role: string;
      group?: string;
      img?: string;
      href?: string;
    }>;
    license?: {
      identifier: string;
      url?: string;
    };
    txt?: Array<{
      purpose: string;
      content: string;
    }>;
    remoteItem?: Array<{
      feedGuid: string;
      feedUrl?: string;
      itemGuid?: string;
      medium?: string;
    }>;
    block?: {
      id: string;
      reason?: string;
    };
    newFeedUrl?: string;
  };

  /** RSS feed configuration */
  rss: {
    title: string;
    description: string;
    link: string;
    managingEditor: string;
    webMaster: string;
    ttl: number;
  };
}

export const PODCAST_CONFIG: PodcastConfig = {
  // Creator npub - replace this with your own npub
  creatorNpub: "npub1km5prrxcgt5fwgjzjpltyswsuu7u7jcj2cx9hk2rwvxyk00v2jqsgv0a3h",

  podcast: {
    title: "PODSTR Podcast",
    description: "A Nostr-powered podcast exploring decentralized conversations",
    author: "PODSTR Creator",
    email: "creator@podstr.example",
    image: "https://example.com/podcast-artwork.jpg",
    language: "en-us",
    categories: ["Technology", "Cryptocurrency", "Society & Culture"],
    explicit: false,
    website: "https://podstr.example",
    copyright: "© 2025 PODSTR Creator",
    funding: [],
    locked: false,
    value: {
      amount: 0,
      currency: "USD"
    },
    type: "episodic",
    complete: false,
    // Podcasting 2.0 defaults
    guid: "npub1km5prrxcgt5fwgjzjpltyswsuu7u7jcj2cx9hk2rwvxyk00v2jqsgv0a3h",
    medium: "podcast",
    publisher: "PODSTR Creator",
    person: [
      {
        name: "PODSTR Creator",
        role: "host",
        group: "cast"
      }
    ],
    license: {
      identifier: "CC BY 4.0",
      url: "https://creativecommons.org/licenses/by/4.0/"
    }
  },

  rss: {
    title: "PODSTR Podcast",
    description: "A Nostr-powered podcast exploring decentralized conversations",
    link: "https://podstr.example",
    managingEditor: "creator@podstr.example (PODSTR Creator)",
    webMaster: "creator@podstr.example (PODSTR Creator)",
    ttl: 60 // minutes
  }
};

/**
 * Nostr event kinds used by PODSTR
 */
export const PODCAST_KINDS = {
  /** Addressable podcast episodes with NIP-54 inspired tag structure */
  EPISODE: 30023,
  /** NIP-22: Comments on podcast episodes */
  COMMENT: 1111,
  /** Standard text notes that may reference episodes */
  NOTE: 1,
  /** Profile metadata */
  PROFILE: 0,
  /** Podcast metadata - using addressable event for podcast-specific config */
  PODCAST_METADATA: 30078
} as const;

/**
 * Get the creator's pubkey in hex format (for Nostr queries)
 */
export function getCreatorPubkeyHex(): string {
  try {
    const decoded = nip19.decode(PODCAST_CONFIG.creatorNpub);
    if (decoded.type === 'npub') {
      return decoded.data;
    }
    throw new Error('Invalid npub format');
  } catch (error) {
    console.error('Failed to decode creator npub:', error);
    // Fallback to the original value in case it's already hex
    return PODCAST_CONFIG.creatorNpub;
  }
}

/**
 * Check if a pubkey is the podcast creator
 */
export function isPodcastCreator(pubkey: string): boolean {
  const creatorHex = getCreatorPubkeyHex();
  return pubkey === creatorHex;
}