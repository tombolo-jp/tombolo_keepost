# KeePost Project Structure

## Root Directory
```
tombolo_keepost/
├── index.html          # Main HTML entry point
├── vite.config.js      # Vite configuration
├── package.json        # Dependencies and scripts
├── CLAUDE.md          # AI assistant instructions
├── README.md          # User documentation
├── .editorconfig      # Editor configuration
├── .gitignore         # Git ignore rules
└── src/               # Source code directory
```

## Source Code Structure (src/)
```
src/
├── main.js            # Application entry point
├── App.svelte         # Root Svelte component
└── lib/               # Library code
    ├── components/    # UI Components
    │   ├── common/    # Shared components (TabSwitcher, TermsModal, etc.)
    │   ├── import/    # Import flow components
    │   ├── keep/      # KEEP feature components
    │   ├── layout/    # Layout components (Header, Footer, Navigation)
    │   ├── pages/     # Page components (PostsPage, ImportPage)
    │   ├── post/      # Post display components
    │   └── tweet/     # Legacy tweet components
    ├── db/            # Database layer
    │   ├── database.js    # IndexedDB setup
    │   └── migrations.js  # DB migrations
    ├── models/        # Data models
    │   └── post.js        # Unified post model
    ├── repositories/  # Data access layer
    │   ├── post_repository.js  # Post CRUD operations
    │   └── keep_repository.js  # KEEP data operations
    ├── services/      # Business logic
    │   ├── importers/     # SNS-specific importers
    │   │   ├── base_importer.js
    │   │   ├── twitter_importer.js
    │   │   ├── bluesky_importer.js
    │   │   └── mastodon_importer.js
    │   ├── import_service.js   # Import orchestration
    │   ├── post_service.js     # Post operations
    │   ├── keep_service.js     # KEEP operations
    │   ├── search_service.js   # Search functionality
    │   ├── storage_service.js  # Storage management
    │   └── terms_service.js    # Terms of service
    ├── stores/        # Svelte stores (state management)
    │   ├── post_store.js    # Post state
    │   ├── keep_store.js    # KEEP state
    │   ├── sns_store.js     # SNS selection state
    │   ├── ui_store.js      # UI state
    │   └── filter_store.js  # Filter state
    └── utils/         # Utility functions
        ├── date_utils.js       # Date formatting
        ├── file_utils.js       # File handling
        ├── memory_monitor.js   # Memory usage tracking
        ├── error_handler.js    # Error handling
        ├── debug_helper.js     # Debug utilities
        └── validation.js       # Input validation
```

## Key Architecture Patterns
1. **Layered Architecture**:
   - Components → Services → Repositories → Database
   
2. **State Management**:
   - Svelte stores for reactive state
   - Unidirectional data flow
   
3. **Data Flow**:
   - Import: FileUpload → ImportService → Importers → Repository → IndexedDB
   - Display: IndexedDB → Repository → Service → Store → Component

4. **Separation of Concerns**:
   - Components: UI rendering
   - Services: Business logic
   - Repositories: Data access
   - Stores: State management
   - Utils: Helper functions