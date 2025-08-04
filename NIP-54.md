NIP-54
======

Podcasts
--------

`draft` `optional`

This NIP defines how podcast episodes can be fetched from relays. It's intended to fit easily into existing podcast players.

## Rationale

RSS feeds are great, but they have some problems that are solved by moving feeds from RSS URLs to multiple Nostr events, one for each episode:

- they depend on a URL and that is hard for most people, so podcasters tend to use service providers that can
   - charge money -- which isn't a bad thing per se but it turns out that with a Nostr-native podcast feed protocol it would be much simpler to host feeds and infinitely cheaper to host the media, so the ecosystem could be more decentralized
   - seal them into their walled gardens (like Spotify has been doing), slowly turning a previously open ecosystem into a centralized system captured by big corporations
   - censor podcasters and prevent them from migrating (on Nostr this wouldn't be a problem even if a relay banned someone as moving to other relays would be trivial as long as the podcaster held their key and podcast clients could easily discover the new relay URLs)
- they can only be loaded in full, with no pagination or filtering of any kind, which means that
   - the sync process in normal RSS clients is slow and cumbersome (which also nudges people into using centralized solutions)
     - this has also led to the creation of broken schemes like [Podping](https://podping.org/), which wouldn't be necessary in a Nostr-native podcast feed
   - It's impossible to reference a single episode directly (since it only exists as a member in the full RSS list of episodes), this means there is no way to share a podcast episode with friends or on social media, so people tend to share links to centralized platforms or to YouTube videos of the same podcast content, which is an antipattern
- they cannot be interacted with in any way: listeners cannot "like" or comment or signal that they have listened to the episode, which is also another factor in the push towards centralized closed platforms: better analytics and insights and possibilities of engagement with the public

## Event definitions

### Podcast Profile

Podcasts have their own key and their own [NIP-01](01.md) `kind:0` profile, but with a tag `["type", "podcast"]` that can be used to signal that they have podcast episodes published.

### Podcast Episodes

Podcast episodes are `kind:54` with some tags:

```jsonc
{
  "id": "55807e7d5cd90d0303d7dce7397f996fdbaed8697903f326c7cf8ad999b9de3d",
  "pubkey": "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
  "kind": 54,
  "created_at": 1700682555,
  "tags": [
    ["title", "<episode title>"],
    ["image", "<optional episode image>"],
    ["description", "<a brief description>"],
    ["audio", "https://.../", "<optional_media_type>"], // can be specified multiple times
    ["t", "<optional tag>"], // can be specified multiple times
    ["alt", "<optional NIP-31 short description for displaying in incompatible clients>"]
  ],
  "content": "<markdown content (or what is supported in RSS feeds content nowadays)>",
  "sig": "...",
}
```

## Implementation Details for PODSTR

This implementation follows NIP-54 with the following specific adaptations:

### Event Kind
- Uses `kind:54` for podcast episodes (as specified in NIP-54)
- Removed addressable event pattern (no `d` tag required)

### Required Tags
- `title`: The episode title (required)
- `audio`: Audio URL with optional media type (required)
- `alt`: NIP-31 alt tag for compatibility (required)

### Optional Tags
- `image`: Episode artwork URL
- `description`: Brief episode description
- `t`: Topic tags for categorization
- `duration`: Episode duration in seconds
- `explicit`: Boolean flag for explicit content

### Content Field
- Contains markdown show notes, timestamps, and additional content
- Supports rich formatting for episode descriptions

### Query Pattern
- Episodes are queried by `kind:54` and author pubkey
- No addressable event deduplication needed
- Each episode is a unique event with its own ID

### Integration with Nostr Features
- Supports zaps via standard reaction events
- Supports comments via NIP-22 (kind:1111)
- Supports reposts via standard repost events
- Compatible with existing Nostr clients and relays

### RSS Generation
- Episodes can be converted to RSS format for compatibility
- Maintains all podcast-specific metadata
- Supports Podcasting 2.0 features where applicable

### NIP-19 Identifier Strategy
- Uses `nevent1` identifiers instead of `note1` for better discoverability
- Includes relay hints in nevent encodings to improve event discovery
- Default relays: `wss://relay.nostr.band`, `wss://nos.lol`, `wss://relay.damus.io`
- Provides author pubkey for additional context and security
- Enables clients to fetch events from multiple reliable sources

### Benefits of nevent over note1
1. **Better Discoverability**: Relay hints help clients find events faster
2. **Redundancy**: Multiple relay options improve availability
3. **Author Context**: Includes pubkey for better security and verification
4. **Future-Proof**: More extensible identifier format for additional metadata
5. **Network Resilience**: Less dependent on single relay availability

This implementation provides a decentralized alternative to RSS feeds while maintaining compatibility with existing podcast infrastructure and enabling the social and interactive features of the Nostr protocol.

## Editing and Deletion

Since NIP-54 uses regular events (`kind:54`) rather than addressable events, special handling is required for editing and deletion operations.

### Episode Editing
Podcast episodes support full editing capabilities through a smart deduplication system:

- **Edit Tracking**: Edited events include an `edit` tag referencing the original event
- **Title-Based Deduplication**: Only the latest version of each episode title is displayed
- **Version History**: All edit versions are preserved on relays for audit purposes
- **Link Stability**: Original nevent links continue to work (redirect to latest version)

**Edit Event Structure**:
```json
{
  "kind": 54,
  "tags": [
    ["title", "Updated Episode Title"],
    ["audio", "https://.../updated.mp3", "audio/mpeg"],
    ["edit", "original-event-id"], // References the original event
    ["alt", "Updated podcast episode: Updated Episode Title"]
  ],
  "content": "Updated show notes and content..."
}
```

### Episode Deletion
Episode deletion follows the standard NIP-09 deletion mechanism:

- **Deletion Events**: Creates `kind:5` events with `e` tags referencing the episode
- **Relay Enforcement**: Supporting relays hide deleted events
- **Client Filtering**: Additional client-side filtering for safety
- **Permanent Removal**: Deleted content cannot be recovered

**Deletion Event Structure**:
```json
{
  "kind": 5,
  "tags": [
    ["e", "episode-event-id-to-delete"]
  ],
  "content": "Deleted podcast episode"
}
```

### User Experience
- **Seamless Editing**: Users see only the latest version of each episode
- **No Duplicates**: Original and edited versions don't appear together
- **Clean Deletion**: Deleted episodes disappear from all feeds
- **Link Stability**: Existing links continue to work appropriately

For detailed implementation information, see [Editing and Deletion Documentation](./src/docs/EditingAndDeletion.md).