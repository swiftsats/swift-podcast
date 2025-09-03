# RSS Feed Build-Time Setup

This document explains how to set up automated RSS feed generation using the build-time RSS system.

## Overview

The `scripts/build-rss.ts` script fetches podcast episodes from Nostr relays and generates a static `rss.xml` file during the build process. This solves the problem where RSS readers and podcast apps cannot execute JavaScript and therefore can't see the dynamically generated RSS feed.

## Script Features

- ✅ Fetches podcast episodes from multiple Nostr relays
- ✅ Validates episodes according to NIP-54 (podcast episodes)
- ✅ Handles episode edits and deduplication
- ✅ Generates complete RSS feed with iTunes and Podcasting 2.0 tags
- ✅ Creates health check file for monitoring
- ✅ Configurable relay URLs and base URL via environment variables
- ✅ Comprehensive error handling and logging

## Configuration

### Environment Variables

The script can be configured with these environment variables:

```bash
# Base URL for the podcast (used in RSS links)
export BASE_URL="https://your-domain.com"

# Comma-separated list of Nostr relay URLs
export NOSTR_RELAYS="wss://relay.nostr.band,wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net"
```

### Podcast Configuration

The RSS feed is automatically configured using:

- Environment variables for creator npub and metadata
- Nostr metadata events from the creator's profile
- Build-time fetching of episode data

## Manual Execution

To run the RSS build script manually:

```bash
# From the project root directory
npx tsx scripts/build-rss.ts

# Or as part of the full build process
npm run build
```

## Automated RSS Updates

### Option 1: Build-Time Generation (Recommended)

The RSS feed is automatically generated during the build process via `npm run build`. For deployment platforms like Vercel, Netlify, or GitHub Pages, this means the RSS feed is always up-to-date with each deployment.

### Option 2: Periodic Rebuilds via Cron

For servers where you want to update the RSS feed without full rebuilds, you can set up a cron job to run just the RSS build script.

### 1. Test the script with full paths

```bash
cd /full/path/to/your/podstr/project
npx tsx scripts/build-rss.ts
```

### 2. Create a wrapper script (for cron setup)

Create `/usr/local/bin/update-podstr-rss.sh`:

```bash
#!/bin/bash

# Set environment variables (should match your .env file)
export BASE_URL="https://your-domain.com"
export NOSTR_RELAYS="wss://relay.nostr.band,wss://relay.damus.io"

# Change to project directory
cd /full/path/to/your/podstr/project

# Run the RSS build script
npx tsx scripts/build-rss.ts >> /var/log/podstr-rss.log 2>&1
```

Make it executable:
```bash
chmod +x /usr/local/bin/update-podstr-rss.sh
```

### 3. Set up the cron job

Edit your crontab:
```bash
crontab -e
```

Add one of these entries based on your update frequency needs:

```bash
# Every 15 minutes (for frequent updates)
*/15 * * * * /usr/local/bin/update-podstr-rss.sh

# Every hour (recommended for most use cases)
0 * * * * /usr/local/bin/update-podstr-rss.sh

# Every 6 hours (for less frequent updates)
0 */6 * * * /usr/local/bin/update-podstr-rss.sh

# Daily at 2 AM
0 2 * * * /usr/local/bin/update-podstr-rss.sh
```

## Web Server Configuration

### Nginx

Add this to your nginx configuration to serve the RSS feed:

```nginx
location /rss.xml {
    alias /full/path/to/your/podstr/project/dist/rss.xml;
    add_header Content-Type application/rss+xml;
    add_header Cache-Control "public, max-age=300"; # 5 minute cache
}

location /rss-health.json {
    alias /full/path/to/your/podstr/project/dist/rss-health.json;
    add_header Content-Type application/json;
}
```

### Apache

Add this to your `.htaccess` or virtual host configuration:

```apache
# Serve RSS with correct MIME type
<Files "rss.xml">
    Header set Content-Type "application/rss+xml"
    Header set Cache-Control "public, max-age=300"
</Files>

<Files "rss-health.json">
    Header set Content-Type "application/json"
</Files>
```

## Monitoring

### Health Check

The script generates a health check file at `dist/rss-health.json` with information about:

- Generation timestamp
- Episode count  
- Feed size
- Relay status
- Configuration

You can monitor this endpoint to ensure the RSS feed is being updated correctly.

### Logging

Enable logging by redirecting output to a log file:

```bash
# In your wrapper script or cron job
/usr/bin/node scripts/generate-rss.js >> /var/log/podstr-rss.log 2>&1
```

Rotate logs with logrotate by creating `/etc/logrotate.d/podstr-rss`:

```
/var/log/podstr-rss.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    create 644 root root
}
```

## Troubleshooting

### Common Issues

1. **Permission denied**: Make sure the script is executable and the web server can read the output files
2. **Path issues**: Use absolute paths in cron jobs
3. **Environment variables**: Set them in the wrapper script, not in crontab
4. **Network timeouts**: The script has built-in timeout handling, but relay connectivity can vary

### Debug Mode

Run the script manually to see detailed output:

```bash
npx tsx scripts/build-rss.ts
```

### Check Cron Logs

View cron execution logs:

```bash
# On most systems
tail -f /var/log/cron

# On systemd systems
journalctl -f -u cron
```

## Example Complete Setup

Here's a complete example for a production deployment:

1. **Wrapper script** (`/usr/local/bin/update-podstr-rss.sh`):
```bash
#!/bin/bash
export BASE_URL="https://mypodcast.com"
export NOSTR_RELAYS="wss://relay.nostr.band,wss://relay.damus.io"
cd /var/www/podstr
npx tsx scripts/build-rss.ts >> /var/log/podstr-rss.log 2>&1

# Optional: notify monitoring service
if [ $? -eq 0 ]; then
    curl -s "https://monitor.example.com/ping/rss-success" > /dev/null
else
    curl -s "https://monitor.example.com/ping/rss-failure" > /dev/null
fi
```

2. **Crontab entry**:
```bash
# Update RSS every 30 minutes
*/30 * * * * /usr/local/bin/update-podstr-rss.sh
```

3. **Nginx config**:
```nginx
location /rss.xml {
    alias /var/www/podstr/dist/rss.xml;
    add_header Content-Type application/rss+xml;
    add_header Cache-Control "public, max-age=1800";
}
```

## Deployment Platform Integration

For modern deployment platforms, RSS feed updates can be automated through:

### Build-Time Generation (Recommended)
- **Vercel/Netlify**: RSS is automatically generated on each deployment
- **GitHub Pages**: Use GitHub Actions to trigger builds when new episodes are published
- **Self-hosted**: Use the cron setup above for periodic RSS updates

### Webhook-Triggered Builds
Set up webhooks to trigger new builds when episodes are published, ensuring immediate RSS updates without waiting for scheduled builds.

This approach ensures that RSS readers and podcast apps always have access to fresh content without requiring JavaScript execution.