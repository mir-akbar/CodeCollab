# Project Organization Structure

## 📁 Directory Structure

### Root Level
- **api/** - Backend API server and related files
- **src/** - Frontend React application source code
- **tests/** - All test files organized by category
- **docs/** - Documentation files
- **archives/** - Archived builds and compressed files
- **public/** - Static assets for the frontend
- **node_modules/** - Dependencies

### API Structure (`/api/`)
```
api/
├── server.js              # Main server entry point
├── package.json           # API dependencies
├── config/               # Configuration files
│   └── database.js       # Database connection config
├── db/                   # Database initialization
│   └── index.js          # DB connection setup
├── models/               # MongoDB schemas
│   ├── FileStorage.js
│   ├── Message.js
│   └── ...
├── routes/               # Express route handlers
│   ├── chat.js
│   ├── fileUpload.js
│   └── ...
├── services/             # Business logic services
│   └── fileStorageService.js
├── scripts/              # Utility and maintenance scripts
│   ├── analysis/         # Data analysis scripts
│   ├── backup/           # Backup scripts
│   ├── cleanup/          # Cleanup utilities
│   ├── database/         # Database management scripts
│   ├── debug/            # Debugging utilities
│   └── tests/            # API-specific tests
└── test-upload/          # Test files for upload testing
```

### Tests Structure (`/tests/`)
```
tests/
├── yjs/                  # YJS collaboration tests
│   ├── test-yjs-complete.js
│   ├── test-yjs-duplication-fix.js
│   ├── validate-yjs-integration.js
│   └── ...
├── awareness/            # User awareness and cursor tests
│   ├── test-awareness-fix.js
│   ├── test-provider-fix.js
│   └── debug-cursor-awareness.js
├── browser/              # Browser-specific tests
│   └── test-browser.html
├── analysis/             # Analysis and debugging tests
│   └── analyze-duplication.cjs
├── sidebar/              # Sidebar functionality tests
├── upload/               # File upload tests
├── websocket/            # WebSocket connection tests
├── mongodb/              # Database-specific tests
└── hierarchy/            # File hierarchy tests
```

### Documentation (`/docs/`)
```
docs/
├── MONGODB_STORAGE_IMPLEMENTATION.md
├── YJS_EVENT_HANDLER_FIX_REPORT.md
├── YJS_MIGRATION_COMPLETION_REPORT.md
├── YJS_MIGRATION_GUIDE.md
├── MONGODB_SECURITY_FIX_REPORT.md
└── README.md (this file)
```

## 🎯 Benefits of This Organization

### ✅ Improved Maintainability
- **Clear separation** of concerns
- **Logical grouping** of related files
- **Easy navigation** through the codebase

### ✅ Better Development Experience
- **Faster file discovery** with organized structure
- **Reduced cognitive load** when working on specific features
- **Cleaner root directory** for better project overview

### ✅ Enhanced Security
- **Centralized configuration** in `api/config/`
- **Environment-based** database connections
- **No exposed credentials** in source code

### ✅ Scalable Architecture
- **Modular structure** supports growth
- **Clear boundaries** between frontend and backend
- **Organized testing** structure for comprehensive coverage

## 🔧 File Movement Summary

### From API Root → Organized Subdirectories:
- **Analysis files** → `api/scripts/analysis/`
- **Test files** → `api/scripts/tests/`
- **Database utilities** → `api/scripts/database/`
- **Debug scripts** → `api/scripts/debug/`
- **Cleanup utilities** → `api/scripts/cleanup/`

### From Project Root → Organized Subdirectories:
- **YJS tests** → `tests/yjs/`
- **Awareness tests** → `tests/awareness/`
- **Browser tests** → `tests/browser/`
- **Analysis scripts** → `tests/analysis/`
- **Documentation** → `docs/`
- **Archive files** → `archives/`

## 🚀 Running Scripts

### API Scripts
```bash
# Analysis scripts
node api/scripts/analysis/analyze-duplication-simple.js

# Database management
node api/scripts/database/check-system-status.js

# Tests
node api/scripts/tests/test-server.js
```

### Project Tests
```bash
# YJS collaboration tests
node tests/yjs/test-yjs-duplication-fix.js

# Awareness tests
node tests/awareness/test-awareness-fix.js
```

## 📋 Next Steps

1. **Update import paths** in moved files if needed
2. **Create npm scripts** for common operations
3. **Add CI/CD configuration** for organized testing
4. **Document API endpoints** in dedicated files
5. **Set up automated testing** using the organized structure

---

**Note**: This organization follows modern Node.js project best practices and provides a solid foundation for scaling the collaborative code editor application.
