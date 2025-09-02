# PODSTR Configuration Guide

PODSTR uses environment variables to configure your podcast metadata and settings. This makes it easy to customize your podcast without modifying code.

## Quick Start

1. **Copy the example configuration:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file** with your podcast details:
   ```bash
   # Required: Your Nostr public key
   VITE_CREATOR_NPUB=npub1your_public_key_here
   
   # Basic podcast info
   VITE_PODCAST_TITLE=My Amazing Podcast
   VITE_PODCAST_DESCRIPTION=A podcast about amazing things
   VITE_PODCAST_AUTHOR=Your Name
   VITE_PODCAST_EMAIL=you@example.com
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

## Configuration Categories

### 🎙️ Essential Settings

These are the minimum settings you should configure:

- `VITE_CREATOR_NPUB` - Your Nostr public key (npub format)
- `VITE_PODCAST_TITLE` - Your podcast name
- `VITE_PODCAST_DESCRIPTION` - Brief description of your podcast
- `VITE_PODCAST_AUTHOR` - Your name as the host/creator
- `VITE_PODCAST_EMAIL` - Contact email for your podcast

### 🎨 Branding & Media

- `VITE_PODCAST_IMAGE` - URL to your podcast cover art (1400x1400px minimum)
- `VITE_PODCAST_WEBSITE` - Your podcast website URL
- `VITE_PODCAST_COPYRIGHT` - Copyright notice

### 🏷️ Discovery & Classification

- `VITE_PODCAST_CATEGORIES` - Comma-separated categories (e.g., "Technology,Education")
- `VITE_PODCAST_LANGUAGE` - Language code (e.g., "en-us", "es-es")
- `VITE_PODCAST_EXPLICIT` - Set to "true" if explicit content

### ⚡ Lightning Value-for-Value

Configure Lightning payments for listener support:

- `VITE_PODCAST_VALUE_AMOUNT` - Suggested payment amount in sats per minute
- `VITE_PODCAST_VALUE_CURRENCY` - Currency type ("sats", "USD", "BTC", etc.)
- `VITE_PODCAST_VALUE_RECIPIENTS` - JSON array of payment recipients

### 📍 Location & Metadata

- `VITE_PODCAST_LOCATION_NAME` - Recording location name
- `VITE_PODCAST_LOCATION_GEO` - GPS coordinates (latitude,longitude)
- `VITE_PODCAST_GUID` - Unique podcast identifier (defaults to your npub)

## Advanced Configuration

### Lightning Recipients

The `VITE_PODCAST_VALUE_RECIPIENTS` field accepts a JSON array defining how Lightning payments are split:

```json
[
  {
    "name": "Host",
    "type": "node",
    "address": "your_lightning_address_or_pubkey",
    "split": 60,
    "fee": false
  },
  {
    "name": "Producer", 
    "type": "keysend",
    "address": "producer_pubkey",
    "split": 30,
    "customKey": "podcast",
    "customValue": "producer-fee"
  },
  {
    "name": "Platform",
    "type": "node", 
    "address": "platform_pubkey",
    "split": 10,
    "fee": true
  }
]
```

**Split percentages should total 100%.**

### Person Metadata

Define who's involved in your podcast with `VITE_PODCAST_PERSON`:

```json
[
  {
    "name": "Your Name",
    "role": "host",
    "group": "cast",
    "img": "https://example.com/your-photo.jpg",
    "href": "https://yourwebsite.com"
  },
  {
    "name": "Producer Name", 
    "role": "producer",
    "group": "crew"
  }
]
```

### Funding Links

Add support links with `VITE_PODCAST_FUNDING` (comma-separated):
```
VITE_PODCAST_FUNDING=lightning:your@address.com,https://donate.example.com,bitcoin:bc1address
```

## Environment Variables Reference

| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `VITE_CREATOR_NPUB` | string | Your Nostr public key | Example npub |
| `VITE_PODCAST_TITLE` | string | Podcast name | "PODSTR Podcast" |
| `VITE_PODCAST_DESCRIPTION` | string | Podcast description | Example description |
| `VITE_PODCAST_AUTHOR` | string | Host/creator name | "PODSTR Creator" |
| `VITE_PODCAST_EMAIL` | string | Contact email | "creator@podstr.example" |
| `VITE_PODCAST_IMAGE` | string | Cover art URL | Example image URL |
| `VITE_PODCAST_LANGUAGE` | string | Language code | "en-us" |
| `VITE_PODCAST_CATEGORIES` | string | Comma-separated categories | "Technology,Social Networking" |
| `VITE_PODCAST_EXPLICIT` | boolean | Explicit content flag | false |
| `VITE_PODCAST_WEBSITE` | string | Podcast website | "https://podstr.example" |
| `VITE_PODCAST_COPYRIGHT` | string | Copyright notice | "© 2025 PODSTR Creator" |
| `VITE_PODCAST_VALUE_AMOUNT` | number | Sats per minute | 1000 |
| `VITE_PODCAST_VALUE_CURRENCY` | string | Payment currency | "sats" |
| `VITE_PODCAST_VALUE_RECIPIENTS` | JSON array | Payment recipients | Example recipients |
| `VITE_RSS_TTL` | number | RSS cache time (minutes) | 60 |

## Validation

After configuring your environment variables, you can validate the configuration by:

1. Starting the development server (`npm run dev`)
2. Checking the browser console for any parsing errors
3. Visiting the podcast pages to see if your metadata appears correctly
4. Generating the RSS feed to ensure all fields are populated

## Tips

- **JSON fields**: Use online JSON validators to ensure your JSON arrays are properly formatted
- **URLs**: Always use complete URLs starting with `https://`
- **Lightning addresses**: Test your Lightning addresses before adding them to recipients
- **Images**: Use high-quality square images (1400x1400px minimum) for best podcast directory compatibility
- **Categories**: Check common podcast categories used by Apple Podcasts and Spotify for better discoverability

## Troubleshooting

**JSON parsing errors**: Check the browser console for detailed error messages about malformed JSON in environment variables.

**Missing metadata**: Ensure all required `VITE_` prefixed variables are set in your `.env` file.

**Lightning recipients not working**: Verify that split percentages total 100% and all addresses are valid Lightning addresses or node public keys.