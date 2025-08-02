# KeePost Project Overview

## Purpose
KeePost is a privacy-first web application for managing and viewing exported social media data from multiple platforms (Twitter, Bluesky, Mastodon) locally in the browser. All data is stored in IndexedDB with no external server communication.

## Tech Stack
- **Frontend Framework**: Svelte 4.2.0 (reactive UI framework)
- **Build Tool**: Vite 5.0.0 (fast development and build)
- **Database**: IndexedDB via Dexie 4.0.1 (browser storage)
- **Search**: Fuse.js 6.6.2 (fuzzy search library)
- **CSS Preprocessor**: Sass 1.69.0
- **Additional Libraries**:
  - @ipld/car 5.4.2 (for Bluesky CAR file handling)
  - date-fns 2.30.0 (date utilities)
  - sweetalert2 11.22.2 (alert dialogs)

## Key Features
- Multi-SNS support (Twitter, Bluesky, Mastodon)
- KEEP functionality for saving favorite posts
- Tab-based navigation between SNS types
- Advanced filtering (year/month, hashtags, mentions, media)
- Full-text search across all posts
- Complete offline operation
- Support for 100,000+ posts

## Platform
- Operating System: Darwin (macOS)
- Node environment with ESM modules
- Browser-based application