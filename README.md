# PODSTR

A Nostr-powered podcast platform for single creator accounts that combines decentralized publishing with Podcasting 2.0 standards.

## ✨ Features

### 🎙️ **Podcast Publishing**
- **Creator-only publishing** with hardcoded npub authentication
- Upload audio files to Blossom servers or reference external URLs
- Rich episode metadata: title, description, cover art, transcripts, chapters
- Podcasting 2.0 value tags for Lightning payments and funding
- Episode editing and management through intuitive Studio interface

### 📡 **RSS Feed Generation**
- Automatic Podcasting 2.0-compliant RSS feed at `/rss.xml`
- Build-time RSS generation using `scripts/build-rss.ts`
- Lightning value splits with modern `lnaddress` method (no keysend fallback)
- iTunes and standard RSS 2.0 support with health monitoring
- RSS feed pulls episodes from Nostr relays at build time

### 🎧 **Listening Experience**
- Clean, responsive audio player with progress tracking
- Chronological episode listing with rich metadata
- Episode search by title, description, and tags
- Mobile-optimized interface

### 💬 **Community Interaction**
- Creator social feed for updates and announcements  
- Episode comments system with full threading (NIP-22)
- Fan engagement through Nostr protocol:
  - Threaded comments and replies on episodes
  - Lightning zaps (NIP-57) with WebLN and NWC support
  - Social reactions and reposts
- Zap leaderboards and episode popularity metrics
- Real-time comment updates and notifications

### 🔐 **Nostr Integration**
- Standard Nostr authentication (NIP-07, NIP-46)
- Addressable podcast episodes (kind 30054)
- Comments system using NIP-22
- Value-for-value Lightning integration

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- NPM or compatible package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/podstr.git
cd podstr

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Configure your podcast settings in .env
# Set your creator npub and podcast metadata
```

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Generate RSS feed
npx tsx scripts/build-rss.ts
```

### Configuration

Edit `.env` to customize your podcast:

```env
# Creator Configuration
VITE_CREATOR_NPUB=npub1...

# Podcast Metadata  
VITE_PODCAST_TITLE=Your Podcast Name
VITE_PODCAST_DESCRIPTION=Your podcast description
VITE_PODCAST_AUTHOR=Your Name
VITE_PODCAST_EMAIL=your@email.com
VITE_PODCAST_IMAGE=https://your-image-url.jpg

# Podcasting 2.0 Value
VITE_PODCAST_VALUE_RECIPIENTS=[{"name":"Host","type":"lightning-address","address":"you@domain.com","split":100}]
```

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, TailwindCSS 3.x
- **UI Components**: shadcn/ui (48+ components) with Radix primitives  
- **Build Tool**: Vite with hot module replacement
- **Nostr**: Nostrify framework for Deno and web
- **State Management**: TanStack Query for data fetching and caching
- **Routing**: React Router with BrowserRouter
- **Audio**: HTML5 audio with persistent playback state
- **Lightning**: WebLN and Nostr Wallet Connect (NWC) integration
- **File Upload**: Blossom server integration for media storage

## 📋 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components (48+ available)
│   ├── auth/           # Authentication components (LoginArea, AccountSwitcher)
│   ├── audio/          # Audio player components (PersistentAudioPlayer)
│   ├── podcast/        # Podcast-specific components (EpisodeCard, etc.)
│   ├── social/         # Social interaction components (PostActions, NoteComposer)
│   ├── comments/       # Threading comment system (CommentsSection)
│   └── studio/         # Creator studio components (EpisodeManagement, etc.)
├── hooks/              # Custom React hooks (useNostr, useZaps, etc.)
├── lib/                # Utility functions and configurations
├── pages/              # Route components (Index, Episodes, Studio, etc.)
├── contexts/           # React context providers (AppContext, NWCContext)
└── types/              # TypeScript type definitions

scripts/
├── build-rss.ts        # Build-time RSS feed generation
├── validate-rss.ts     # RSS feed validation
└── test-rss-endpoint.ts # RSS endpoint testing

dist/
├── rss.xml             # Generated Podcasting 2.0 RSS feed
├── rss-health.json     # RSS health and status monitoring
└── 404.html            # GitHub Pages compatibility
```

## 🎯 Core Event Types

- **Episodes**: `kind 30054` (Addressable/editable podcast episodes)
- **Metadata**: `kind 30078` (Podcast configuration)
- **Comments**: `kind 1111` (NIP-22 episode comments) 
- **Social**: `kind 1` (Creator updates and announcements)

## 🔧 Deployment

### Static Hosting (Recommended)
Deploy to Vercel, Netlify, or GitHub Pages:

```bash
npm run build
# Deploy dist/ folder to your hosting provider
```

### RSS Feed Updates
- **Build-time**: RSS generated automatically during `npm run build`
- **Manual**: Run `npx tsx scripts/build-rss.ts` to regenerate
- **Periodic**: Set up cron jobs using updated `RSS_CRON_SETUP.md` guide  
- **Webhooks**: Trigger builds when new episodes are published
- **Health monitoring**: Check `/rss-health.json` for feed status

### Environment Variables
Ensure production environment has all required variables from `.env`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Nostr Protocol** - Decentralized social networking foundation
- **Podcasting 2.0** - Modern podcast standards and value integration
- **shadcn/ui** - Beautiful, accessible UI components
- **Nostrify** - Nostr development framework

---

**Vibed with [MKStack](https://soapbox.pub/mkstack)** ⚡

Built for creators who want to own their content, engage directly with their audience, and participate in the value-for-value economy through Bitcoin Lightning payments.