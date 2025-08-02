# Task Completion Checklist for KeePost

## When Completing a Development Task

### 1. Code Quality Checks
- [ ] Ensure snake_case naming convention is followed consistently
- [ ] Verify 2-space indentation is used
- [ ] Remove any unnecessary comments
- [ ] Check that code is self-documenting

### 2. Functionality Verification
- [ ] Test the feature in the browser (npm run dev)
- [ ] Verify IndexedDB operations work correctly
- [ ] Check memory usage for large data operations
- [ ] Test with sample data from all supported SNS (Twitter, Bluesky, Mastodon)

### 3. Error Handling
- [ ] Ensure all async operations have try-catch blocks
- [ ] Verify user-friendly error messages are shown via SweetAlert2
- [ ] Check console for any unhandled errors

### 4. Performance
- [ ] Test with large datasets (10,000+ posts)
- [ ] Monitor browser memory usage
- [ ] Verify search and filter performance

### 5. Build Verification
- [ ] Run `npm run build` to ensure production build works
- [ ] No build errors or warnings

### 6. Browser Testing
- [ ] Test in Chrome/Chromium
- [ ] Test in Firefox
- [ ] Test in Safari (if on macOS)
- [ ] Verify IndexedDB storage works

### 7. Privacy Compliance
- [ ] Ensure NO external API calls are made
- [ ] Verify all data stays in IndexedDB
- [ ] Check network tab - should be empty except for local resources

### 8. Git Commit
- [ ] Stage relevant files with `git add`
- [ ] Write clear commit message following pattern from recent commits
- [ ] Format: `[action]description` (e.g., `[fix]posts`, `[up]keepost`)

## Important Reminders
- **NO external tests or linting** configured - manual testing required
- **Privacy is paramount** - no data should leave the browser
- **Memory management** is critical for large file imports
- **Snake_case** convention must be maintained (non-standard for JS)

## Missing Tools (Consider Adding)
- ESLint configuration for consistent code style
- Prettier for automatic formatting
- Vitest or Jest for unit testing
- Husky for pre-commit hooks