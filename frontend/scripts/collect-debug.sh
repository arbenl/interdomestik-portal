# save as scripts/collect-debug.sh, then: bash scripts/collect-debug.sh
set -euo pipefail

ROOT="$(pwd)"
OUT="debug-bundle-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

# 1) Versions & git
{
  echo "### VERSIONS"
  (corepack pnpm -v || pnpm -v) 2>&1
  node -v
  uname -a
  echo
  echo "### GIT"
  git status -sb || true
  git rev-parse HEAD || true
} > "$OUT/01-env.txt"

# 2) Lockfiles present
{
  echo "### LOCKFILES (root)"
  ls -al | egrep 'pnpm-lock|package-lock|yarn.lock' || true
  echo
  echo "### LOCKFILES (frontend)"
  ls -al frontend | egrep 'pnpm-lock|package-lock|yarn.lock' || true
} > "$OUT/02-lockfiles.txt"

# 3) Key configs & harness files (best-effort)
FILES=(
  "frontend/vitest.config.ts"
  "frontend/vite.config.ts"
  "frontend/eslint.config.js" "frontend/eslint.config.cjs" "frontend/.eslintrc" "frontend/.eslintrc.cjs" "frontend/.eslintrc.json"
  "frontend/tsconfig.json" "frontend/tsconfig.app.json" "frontend/tsconfig.vitest.json" "frontend/tsconfig.tools.json"
  "frontend/src/setupTests.ts"
  "frontend/src/test-utils.tsx"
  "frontend/src/services/functionsClient.ts"
  "frontend/src/hooks/useAuth.ts" "frontend/src/hooks/useAuth/index.ts" "frontend/src/hooks/useAuth.tsx"
  "frontend/src/lib/firebase.ts" "frontend/src/lib/firebase/index.ts"
)
for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    mkdir -p "$OUT/$(dirname "$f")"
    cp "$f" "$OUT/$f"
  fi
done

# 4) Why key deps
{
  echo "### pnpm why vite"; pnpm -w why vite || true
  echo; echo "### pnpm why vitest"; pnpm -w why vitest || true
  echo; echo "### pnpm why @vitest/coverage-v8"; pnpm -w why @vitest/coverage-v8 || true
} > "$OUT/03-why.txt"

# 5) TS showConfig (scope)
(
  cd frontend || exit 0
  tsc -p tsconfig.app.json --showConfig > "../$OUT/tsconfig.app.show.json" || true
  tsc -p tsconfig.vitest.json --showConfig > "../$OUT/tsconfig.vitest.show.json" || true
)

# 6) Import/casing hotspots
{
  echo "### functionsClient imports"
  rg -n "from ['\"]/\\@/services/functionsClient['\"]" frontend/src || true
  echo
  echo "### useAuth imports"
  rg -n "from ['\"]/\\@/hooks/useAuth['\"]" frontend/src || true
  echo
  echo "### Button casing imports"
  rg -n "components/ui/button" frontend/src || true
  rg -n "components/ui/Button" frontend/src || true
} > "$OUT/04-grep.txt"

# 7) Quick test probe
{
  echo "### vitest version"
  npx vitest --version || true
  echo
  echo "### test smoke (create if missing)"
  [ -f frontend/src/smoke.test.ts ] || cat > frontend/src/smoke.test.ts <<'EOF'
import { describe, it, expect } from 'vitest';
describe('runner', () => { it('collects', () => expect(1+1).toBe(2)); });
EOF
  pnpm --filter frontend test --run src/smoke.test.ts || true
  echo
  echo "### first failing test (bail=1)"
  pnpm --filter frontend test --reporter=verbose --bail=1 || true
} > "$OUT/05-test-probe.txt"

tar -czf "$OUT.tgz" "$OUT"
echo "Created: $OUT.tgz"