#!/bin/bash
# Builds a local template repo and a project created from its first commit.
set -euo pipefail
ROOT="$1"
rm -rf "$ROOT"; mkdir -p "$ROOT"
T="$ROOT/vue-starter-template"; D="$ROOT/payroll-portal"
export GIT_AUTHOR_NAME="Fixture" GIT_AUTHOR_EMAIL="fixture@example.com" GIT_COMMITTER_NAME="Fixture" GIT_COMMITTER_EMAIL="fixture@example.com"
commit() { git -C "$1" add -A; GIT_AUTHOR_DATE="$2" GIT_COMMITTER_DATE="$2" git -C "$1" commit -q -m "$3"; }

mkdir -p "$T/src" "$T/.github/workflows"; git -C "$T" init -q -b main
cat > "$T/package.json" <<'EOF'
{
  "name": "vue-starter",
  "private": true,
  "type": "module",
  "engines": { "node": ">=18" },
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "lint": "eslint . --ext .ts,.vue",
    "format": "prettier --write .",
    "test": "vitest run"
  },
  "dependencies": { "vue": "^3.4.0" },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "eslint": "^8.57.0",
    "eslint-plugin-vue": "^9.20.0",
    "prettier": "^3.2.0",
    "typescript": "^5.4.0",
    "vite": "^5.0.0",
    "vitest": "^1.6.0",
    "vue-tsc": "^2.0.0"
  }
}
EOF
echo "18" > "$T/.nvmrc"
cat > "$T/.eslintrc.json" <<'EOF'
{
  "root": true,
  "extends": ["eslint:recommended", "plugin:vue/vue3-recommended"],
  "rules": { "no-console": "warn" }
}
EOF
echo '{ "singleQuote": true, "semi": false }' > "$T/.prettierrc"
cat > "$T/.github/workflows/ci.yml" <<'EOF'
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm run lint
      - run: npm test
EOF
cat > "$T/vite.config.ts" <<'EOF'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({ plugins: [vue()] })
EOF
echo '{ "compilerOptions": { "target": "ES2020", "module": "ESNext", "strict": true, "jsx": "preserve" }, "include": ["src"] }' > "$T/tsconfig.json"
printf 'node_modules\ndist\n' > "$T/.gitignore"
printf "import { createApp } from 'vue'\nimport App from './App.vue'\n\ncreateApp(App).mount('#app')\n" > "$T/src/main.ts"
printf '<template>\n  <h1>Vue starter</h1>\n</template>\n' > "$T/src/App.vue"
printf '# Vue starter\n\nA starter for Vue 3 + Vite apps.\n' > "$T/README.md"
commit "$T" "2025-01-10T10:00:00Z" "Initial starter"

# The project: created with "Use this template" = same tree, fresh history.
mkdir -p "$D"; git -C "$D" init -q -b main
git -C "$T" archive HEAD | tar -x -C "$D"
commit "$D" "2025-02-01T09:00:00Z" "Initial commit"

# The project's own work.
python3 - "$D/package.json" <<'EOF'
import json, sys
p = sys.argv[1]; d = json.load(open(p))
d["name"] = "payroll-portal"
d["dependencies"].update({"axios": "^1.7.0", "pinia": "^2.1.0"})
d["devDependencies"]["vite"] = "^6.1.0"
d["devDependencies"]["@vitejs/plugin-vue"] = "^5.2.1"
open(p, "w").write(json.dumps(d, indent=2) + "\n")
EOF
commit "$D" "2025-03-03T09:00:00Z" "Upgrade vite to 6 for faster HMR"
python3 - "$D/package.json" <<'EOF'
import json, sys
p = sys.argv[1]; d = json.load(open(p))
del d["devDependencies"]["prettier"]
d["devDependencies"]["@biomejs/biome"] = "^1.9.0"
d["scripts"]["format"] = "biome format --write ."
open(p, "w").write(json.dumps(d, indent=2) + "\n")
EOF
rm "$D/.prettierrc"
echo '{ "formatter": { "indentStyle": "space" }, "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "asNeeded" } } }' > "$D/biome.json"
commit "$D" "2025-03-20T09:00:00Z" "Replace Prettier with Biome formatter (team decision, faster and one tool less)"
cat >> "$D/.github/workflows/ci.yml" <<'EOF'
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy.sh
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
EOF
mkdir -p "$D/scripts"; printf '#!/bin/sh\necho deploy\n' > "$D/scripts/deploy.sh"
commit "$D" "2025-04-02T09:00:00Z" "Add deploy job"
printf '# Payroll portal\n\nInternal payroll self-service.\n' > "$D/README.md"
mkdir -p "$D/src/stores"; printf "import { defineStore } from 'pinia'\nexport const usePayslips = defineStore('payslips', {})\n" > "$D/src/stores/payslips.ts"
printf '<template>\n  <h1>Payroll portal</h1>\n</template>\n' > "$D/src/App.vue"
commit "$D" "2025-04-10T09:00:00Z" "Payroll portal shell"

# The template moves on.
python3 - "$T/package.json" <<'EOF'
import json, sys
p = sys.argv[1]; d = json.load(open(p))
d["devDependencies"]["vite"] = "^6.0.0"; d["devDependencies"]["@vitejs/plugin-vue"] = "^5.2.0"
open(p, "w").write(json.dumps(d, indent=2) + "\n")
EOF
commit "$T" "2025-02-15T10:00:00Z" "Bump vite to 6 (#12)"
python3 - "$T/package.json" <<'EOF'
import json, sys
p = sys.argv[1]; d = json.load(open(p))
dd = d["devDependencies"]
dd["eslint"] = "^9.12.0"; dd["eslint-plugin-vue"] = "^9.28.0"; dd["@eslint/js"] = "^9.12.0"; dd["typescript-eslint"] = "^8.8.0"
d["scripts"]["lint"] = "eslint ."
open(p, "w").write(json.dumps(d, indent=2) + "\n")
EOF
rm "$T/.eslintrc.json"
cat > "$T/eslint.config.js" <<'EOF'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  { rules: { 'no-console': 'warn' } },
]
EOF
commit "$T" "2025-05-05T10:00:00Z" "Migrate to ESLint 9 flat config (#14)"
python3 - "$T/package.json" <<'EOF'
import json, sys
p = sys.argv[1]; d = json.load(open(p))
d["engines"]["node"] = ">=22"
open(p, "w").write(json.dumps(d, indent=2) + "\n")
EOF
echo "22" > "$T/.nvmrc"
python3 - "$T/.github/workflows/ci.yml" <<'EOF'
import sys
p = sys.argv[1]; s = open(p).read()
s = s.replace("node-version: 18", "node-version-file: .nvmrc\n          cache: npm")
open(p, "w").write(s)
EOF
commit "$T" "2025-06-01T10:00:00Z" "Node 22 for runtime and CI, npm cache in CI (#15)"
cat > "$T/.github/dependabot.yml" <<'EOF'
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly }
    groups:
      dev-dependencies: { dependency-type: development }
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: weekly }
EOF
commit "$T" "2025-06-20T10:00:00Z" "Add Dependabot with grouped updates (#16)"
python3 - "$T/package.json" <<'EOF'
import json, sys
p = sys.argv[1]; d = json.load(open(p))
d["devDependencies"]["prettier-plugin-organize-imports"] = "^4.1.0"
open(p, "w").write(json.dumps(d, indent=2) + "\n")
EOF
echo '{ "singleQuote": true, "semi": false, "plugins": ["prettier-plugin-organize-imports"] }' > "$T/.prettierrc"
commit "$T" "2025-07-01T10:00:00Z" "Prettier: organize imports on format (#17)"
printf '# Vue starter\n\nA starter for Vue 3 + Vite apps. Node 22, ESLint 9, Vitest.\n\n## Getting started\n\nnpm install && npm run dev\n' > "$T/README.md"
commit "$T" "2025-07-10T10:00:00Z" "Docs: refresh README (#18)"
printf '# Conventions\n\n- Composition API with <script setup lang="ts"> only.\n- State in Pinia stores under src/stores.\n- Run npm run lint and npm test before committing.\n' > "$T/CLAUDE.md"
commit "$T" "2025-08-01T10:00:00Z" "Add CLAUDE.md with project conventions (#19)"
python3 - "$T/package.json" <<'EOF'
import json, sys
p = sys.argv[1]; d = json.load(open(p))
d["devDependencies"]["vitest"] = "^2.1.0"; d["devDependencies"]["@vue/test-utils"] = "^2.4.0"; d["devDependencies"]["jsdom"] = "^25.0.0"
open(p, "w").write(json.dumps(d, indent=2) + "\n")
EOF
cat > "$T/vitest.config.ts" <<'EOF'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(viteConfig, defineConfig({ test: { environment: 'jsdom' } }))
EOF
commit "$T" "2025-09-01T10:00:00Z" "Vitest 2 with jsdom and Vue Test Utils (#20)"
echo "template: $T"; echo "project:  $D"
