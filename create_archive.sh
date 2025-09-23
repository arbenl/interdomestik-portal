#!/bin/bash

# This script creates a zip archive of the project, including only the
# necessary source code and configuration files to run it on another machine.

set -e

ARCHIVE_NAME="interdomestik-member-portal-dist.zip"

echo "🧹 Cleaning up old archive..."
rm -f "$ARCHIVE_NAME"

echo "📦 Creating new project archive: $ARCHIVE_NAME"

# Zip the current directory, excluding unnecessary files and folders.
zip -r "$ARCHIVE_NAME" . \
  -x ".git/*" \
  -x ".github/*" \
  -x "node_modules/*" \
  -x "*/node_modules/*" \
  -x "frontend/dist/*" \
  -x "frontend/build/*" \
  -x "functions/lib/*" \
  -x "*.log" \
  -x ".firebase-data/*" \
  -x "firebase-export/*" \
  -x ".DS_Store" \
  -x "*.zip" \
  -x ".vscode/*" \
  -x "cypress/screenshots/*" \
  -x "cypress/videos/*" \
  -x "cypress/downloads/*" \
  -x "build.errors" \
  -x "frontend/build_errors.txt" \
  -x "frontend/lint_errors.txt" \
  -x "frontend/test.errors" \
  -x "frontend/stats.html" \
  -x "tsprune.txt" \
  -x "knip.json" \
  -x "depcheck.json"

echo "✅ Archive created successfully: $ARCHIVE_NAME"
echo "   You can now transfer this file to another machine."
echo ""
echo "   Instructions for the other machine:"
echo "   1. Unzip the file."
echo "   2. Run 'pnpm install' in the root directory."
echo "   3. Follow the README.md to run the emulators and application."
