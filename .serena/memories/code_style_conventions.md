# Code Style and Conventions for KeePost

## Naming Conventions
**IMPORTANT**: This project uses `snake_case` for all JavaScript identifiers (unconventional but consistent throughout the project)

### Files
- Components: PascalCase with .svelte extension (e.g., `PostList.svelte`)
- Services/Utils: snake_case with .js extension (e.g., `post_service.js`)
- Stores: snake_case with _store suffix (e.g., `post_store.js`)

### Variables and Functions
- Variables: snake_case (e.g., `post_data`, `is_kept`)
- Functions: snake_case (e.g., `get_posts`, `save_import_history`)
- Constants: snake_case (e.g., `max_file_size`)
- Classes: PascalCase (e.g., `PostService`, `TwitterImporter`)

## Code Structure
- **Indentation**: 2 spaces (enforced by .editorconfig)
- **Line endings**: LF (Unix-style)
- **Charset**: UTF-8
- **Trailing whitespace**: Trimmed
- **Final newline**: Always present

## Comments
- Minimal comments - code should be self-documenting
- No excessive inline comments
- Function descriptions only when necessary

## Module Design
- Single responsibility principle
- Small, focused modules
- Export single class or collection of related functions
- Use ES6 modules (import/export)

## Svelte Components
- Props at top of component
- Stores imported after props
- Event handlers and lifecycle methods next
- Helper functions at bottom

## Data Flow
- Unidirectional data flow
- State managed in Svelte stores
- Services handle business logic
- Repositories handle data access

## Error Handling
- Try-catch blocks for async operations
- User-friendly error messages via SweetAlert2
- Console logging for debugging

## Async/Await
- Prefer async/await over promises
- Always handle errors in async functions

## Important Patterns
- No external API calls (privacy-first)
- All data operations through IndexedDB
- Batch processing for large datasets
- Memory monitoring for large file imports