import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Default relays to include in nevent encodings for better discoverability
 */
const DEFAULT_RELAYS = [
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.damus.io'
];

/**
 * Encode a Nostr event as nevent with relay hints for better discoverability
 * @param event The Nostr event to encode
 * @param customRelays Optional custom relays to include
 * @returns nevent string
 */
export function encodeNevent(event: NostrEvent, customRelays?: string[]): string {
  const relays = customRelays || DEFAULT_RELAYS;
  
  return nip19.neventEncode({
    id: event.id,
    relays,
    author: event.pubkey
  });
}

/**
 * Encode an event ID as nevent with relay hints
 * @param eventId The event ID to encode
 * @param authorPubkey The author's pubkey
 * @param customRelays Optional custom relays to include
 * @returns nevent string
 */
export function encodeEventIdAsNevent(
  eventId: string, 
  authorPubkey: string, 
  customRelays?: string[]
): string {
  const relays = customRelays || DEFAULT_RELAYS;
  
  return nip19.neventEncode({
    id: eventId,
    relays,
    author: authorPubkey
  });
}

/**
 * Get the default relays used for nevent encoding
 * @returns Array of default relay URLs
 */
export function getDefaultRelays(): string[] {
  return [...DEFAULT_RELAYS];
}