#!/bin/bash

echo "🔍 Step 1: Searching for duplicate 'auth.ts' files..."
find . -type f -name "auth.ts"

echo ""
echo "🧹 Step 2: Cleaning frontend build artifacts and cache..."

rm -rf node_modules/.cache
rm -rf frontend/.turbo
rm -rf frontend/dist
rm -rf frontend/node_modules/.cache
rm -rf frontend/build
rm -rf frontend/tsconfig.tsbuildinfo

echo ""
echo "📦 Step 3: Reinstalling dependencies..."
pnpm install

echo ""
echo "🚀 Step 4: Running clean build and typecheck for frontend..."
pnpm -F frontend build
pnpm -F frontend typecheck

echo ""
echo "✅ Done! If you still get the same error, please check if there's a stale 'auth.ts' file outside your expected folder."