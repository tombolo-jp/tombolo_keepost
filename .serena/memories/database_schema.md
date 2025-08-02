# KeePost Database Schema

## IndexedDB Configuration
- Database Name: `keepost_db`
- Current Version: 6
- Schema Version: 4

## Object Stores

### 1. posts
Unified store for all SNS posts

**Indexes**:
- `sns_type`: SNS platform type
- `year_month`: For date-based filtering
- `is_kept`: For KEEP feature
- `created_at`: For sorting
- `[sns_type+year_month]`: Compound index
- `[sns_type+is_kept]`: Compound index
- `original_id`: Original post ID
- `[sns_type+original_id]`: Compound index (unique)

**Schema**:
```javascript
{
  id: String,              // Unique ID (sns_type + original_id)
  original_id: String,     // Original SNS post ID
  sns_type: String,        // 'twitter' | 'bluesky' | 'mastodon'
  created_at: String,      // ISO date string
  content: String,         // Post content
  author: {
    name: String,
    username: String,
    avatar_url: String
  },
  metrics: {
    likes: Number,
    shares: Number,
    replies: Number,
    views: Number
  },
  language: String,
  year_month: String,      // YYYY-MM format
  media: Array,
  urls: Array,
  hashtags: Array,
  mentions: Array,
  sns_specific: Object,    // SNS-specific data
  is_kept: Boolean,
  kept_at: String,
  original_url: String,
  imported_at: String,
  version: Number
}
```

### 2. keeps
Dedicated store for KEEP functionality

**Indexes**:
- `post_id`: Reference to post
- `kept_at`: Timestamp of KEEP action
- `sns_type`: SNS platform

**Schema**:
```javascript
{
  id: String,           // Unique KEEP ID
  post_id: String,      // Reference to posts.id
  kept_at: String,      // ISO date when kept
  sns_type: String,     // SNS type for filtering
  tags: Array,          // User-defined tags
  notes: String         // User notes
}
```

### 3. import_history
Track import operations

**Indexes**:
- `imported_at`: Import timestamp
- `sns_type`: SNS platform

**Schema**:
```javascript
{
  id: String,
  sns_type: String,
  file_name: String,
  imported_at: String,
  post_count: Number,
  file_size: Number,
  status: String,       // 'success' | 'partial' | 'failed'
  error_message: String
}
```

### 4. settings
Application settings

**Schema**:
```javascript
{
  key: String,         // Setting key
  value: Any,          // Setting value
  updated_at: String
}
```

## Migration Strategy
- Migrations handled in `src/lib/db/migrations.js`
- Each version upgrade has specific migration logic
- Backward compatibility maintained where possible
- Data integrity checks during migration