Design a Nostr-powered podcast platform for a single creator account (defined by a hardcoded `npub`). The application should support podcast publishing, community interaction, listening, and RSS syndication—all aligned with Podcasting 2.0 standards.

---

### Core Functional Requirements:

#### 1. **Authentication**

* Users authenticate via standard Nostr methods (e.g., NIP-07 or NIP-46).
* Only one hardcoded `npub` is recognized as the podcast creator. Only this user can publish podcast content.
* the podcast creator npub is: 

---

#### 2. **Podcast Publishing (Creator-Only)**

* Only the creator can publish new podcast episodes with:

  * Title, description, episode number, duration, cover image
  * Publish date, explicit flag, tags, and optional transcript or chapters
* Audio file support:

  * Upload to Blossom server
  * OR reference an external URL
* Podcast episodes are stored as `kind:30023` Nostr events following Podcasting 2.0 conventions
* Each episode may include:

  * `<podcast:transcript>`, `<podcast:funding>`, `<podcast:chapters>`, `<podcast:person>`, `<podcast:value>` tags where applicable
* Use **NIP-73** `r` tags to reference external podcast IDs (e.g., Apple Podcasts, PodcastIndex, original RSS)

---

#### 3. **RSS Feed Generation**

* Automatically generate and update a Podcasting 2.0-compliant RSS feed (`/feed.xml`)
* Feed includes:

  * Show-level metadata (title, description, author, cover art, categories, language)
  * All published episodes with standard and Podcasting 2.0 `<podcast:*>` extensions
  * GUIDs, enclosures, publish dates, episode numbers, durations, and more
* Make the feed accessible for directory indexing and traditional podcast apps
* It should be available at /rss.xml

---

#### 4. **Podcast Listening Experience (All Users)**

* Chronological list of podcast episodes
* Audio playback support with progress tracking
* Prominently display the most recent episode
* Include rich metadata for each episode (cover image, show notes, guests)

---

#### 5. **Community Feed**

* A dedicated feed showing only posts from the creator’s `npub`
* Fans can interact via:

  * Replies (NIP-22)
  * Reposts
  * Zaps (NIP-57) directly on episode posts
  * Reactions 
* Threaded discussion support for episodes and social posts

---

#### 6. **Fan Engagement Features**

* Zap leaderboard showing top supporters
* Highlight most zapped episodes
* Highlight most commented episodes

---

#### 7. **About Section**

* Show-level metadata including podcast summary, host bio, contact links, and donation options
* Source this info from a static config or a `kind:0` (metadata) Nostr event from the creator

---

#### 8. **Navigation and Discovery**

* Episode search by keyword, tags, or guest names
* Sort by date, popularity (zap count), or featured
* Responsive layout for both mobile and desktop
* Optional sections: Popular clips, Highlights, or “Start Here” intro for new listeners

---

### Nostr Event Guidelines

* Use `kind:30023` for episodes, with `e`, `p`, `r`, and `d` tags
* Implement zaps with NIP-57
* Link to external podcast platforms with NIP-73 `r` tags

---

This platform should empower a creator to self-host their podcast, maintain direct ownership and community connection via Nostr, and remain compatible with legacy podcast ecosystems through RSS and Podcasting 2.0 extensions.

