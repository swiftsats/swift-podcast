# RSS Feed Cron Job Setup

This document explains how to set up a cron job to automatically generate the RSS feed from Nostr relays.

## Overview

The `scripts/generate-rss.js` script fetches podcast episodes from Nostr relays and generates a static `rss.xml` file that can be served by any web server. This solves the problem where RSS readers and podcast apps cannot execute JavaScript and therefore can't see the dynamically generated RSS feed.

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

Edit the `PODCAST_CONFIG` object in `scripts/generate-rss.js` to customize:

- Creator npub (public key)
- Podcast metadata (title, description, author, etc.)
- Categories and iTunes settings
- Podcasting 2.0 tags

## Manual Execution

To run the script manually:

```bash
# From the project root directory
node scripts/generate-rss.js
```

## Cron Job Setup

### 1. Make the script executable

```bash
chmod +x scripts/generate-rss.js
```

### 2. Test the script with full paths

```bash
cd /full/path/to/your/podstr/project
/usr/bin/node scripts/generate-rss.js
```

### 3. Create a wrapper script (recommended)

Create `/usr/local/bin/generate-podstr-rss.sh`:

```bash
#!/bin/bash

# Set environment variables
export BASE_URL="https://your-domain.com"
export NOSTR_RELAYS="wss://relay.nostr.band,wss://relay.damus.io"

# Change to project directory
cd /full/path/to/your/podstr/project

# Run the RSS generation script
/usr/bin/node scripts/generate-rss.js >> /var/log/podstr-rss.log 2>&1
```

Make it executable:
```bash
chmod +x /usr/local/bin/generate-podstr-rss.sh
```

### 4. Set up the cron job

Edit your crontab:
```bash
crontab -e
```

Add one of these entries based on your update frequency needs:

```bash
# Every 15 minutes (for frequent updates)
*/15 * * * * /usr/local/bin/generate-podstr-rss.sh

# Every hour (recommended for most use cases)
0 * * * * /usr/local/bin/generate-podstr-rss.sh

# Every 6 hours (for less frequent updates)
0 */6 * * * /usr/local/bin/generate-podstr-rss.sh

# Daily at 2 AM
0 2 * * * /usr/local/bin/generate-podstr-rss.sh
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
node scripts/generate-rss.js
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

1. **Wrapper script** (`/usr/local/bin/generate-podstr-rss.sh`):
```bash
#!/bin/bash
export BASE_URL="https://mypodcast.com"
export NOSTR_RELAYS="wss://relay.nostr.band,wss://relay.damus.io"
cd /var/www/podstr
/usr/bin/node scripts/generate-rss.js >> /var/log/podstr-rss.log 2>&1

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
*/30 * * * * /usr/local/bin/generate-podstr-rss.sh
```

3. **Nginx config**:
```nginx
location /rss.xml {
    alias /var/www/podstr/dist/rss.xml;
    add_header Content-Type application/rss+xml;
    add_header Cache-Control "public, max-age=1800";
}
```

This setup will automatically update your RSS feed every 30 minutes with the latest episodes from Nostr relays, ensuring that RSS readers and podcast apps always have access to fresh content without requiring JavaScript execution.