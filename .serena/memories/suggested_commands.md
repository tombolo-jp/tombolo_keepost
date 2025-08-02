# Development Commands for KeePost

## Package Management
- `npm install` - Install all dependencies
- `npm install <package>` - Add new dependency

## Development
- `npm run dev` - Start development server (Vite) on port 8080 with hot reload
- Opens browser automatically at http://localhost:8080

## Build & Production
- `npm run build` - Build for production (output to dist/ directory)
- `npm run preview` - Preview production build locally

## Git Commands (Darwin/macOS)
- `git status` - Check current changes
- `git diff` - View unstaged changes
- `git add .` - Stage all changes
- `git commit -m "message"` - Commit changes
- `git push` - Push to remote
- `git pull` - Pull latest changes
- `git log --oneline -10` - View recent commits

## File System Commands (Darwin/macOS)
- `ls -la` - List all files with details
- `cd <directory>` - Change directory
- `pwd` - Print working directory
- `open .` - Open current directory in Finder
- `find . -name "*.js"` - Find JavaScript files
- `grep -r "pattern" .` - Search for pattern in files

## Testing & Quality
Note: Currently no test suite or linting configured. Consider adding:
- ESLint for JavaScript linting
- Prettier for code formatting
- Vitest or Jest for testing

## Important Notes
- No lint/format/test commands currently configured
- Server runs on port 8080 by default
- Vite config includes Sass support with legacy API warnings suppressed
- All data stored locally in browser (IndexedDB)