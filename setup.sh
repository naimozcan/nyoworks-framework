#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# NYOWORKS Framework Setup v2.2
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRAMEWORK_VERSION="2.2.0"


# ─────────────────────────────────────────────────────────────────────────────
# Colors
# ─────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

print_header() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║               NYOWORKS Framework Setup v${FRAMEWORK_VERSION}                      ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# ─────────────────────────────────────────────────────────────────────────────
# Validate Prerequisites
# ─────────────────────────────────────────────────────────────────────────────

check_prerequisites() {
    print_info "Checking prerequisites..."

    if ! command -v node &> /dev/null; then
        print_error "Node.js is required but not installed."
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 22 ]; then
        print_error "Node.js 22 or higher is required. Found: $(node -v)"
        exit 1
    fi
    print_success "Node.js $(node -v)"

    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is required but not installed."
        print_info "Install with: npm install -g pnpm"
        exit 1
    fi
    print_success "pnpm $(pnpm -v)"

    if ! command -v git &> /dev/null; then
        print_error "Git is required but not installed."
        exit 1
    fi
    print_success "Git $(git --version | cut -d' ' -f3)"

    if ! command -v docker &> /dev/null; then
        print_info "Docker not found - you'll need to set up database manually"
    else
        print_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
    fi

    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Get Project Info
# ─────────────────────────────────────────────────────────────────────────────

get_project_info() {
    echo -e "${BLUE}Project Configuration${NC}"
    echo "─────────────────────"
    echo ""

    read -p "Project name: " PROJECT_NAME
    if [ -z "$PROJECT_NAME" ]; then
        print_error "Project name is required"
        exit 1
    fi

    read -p "Project code (uppercase, e.g., ACME): " PROJECT_CODE
    PROJECT_CODE=$(echo "$PROJECT_CODE" | tr '[:lower:]' '[:upper:]')
    if [ -z "$PROJECT_CODE" ]; then
        print_error "Project code is required"
        exit 1
    fi

    PROJECT_SLUG=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')

    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Select Platforms
# ─────────────────────────────────────────────────────────────────────────────

select_platforms() {
    echo -e "${BLUE}Select target platforms:${NC}"
    echo ""
    echo -e "  ${GREEN}+${NC} web (always included)"
    echo "  1. mobile   - iOS/Android (Expo SDK 54)"
    echo "  2. desktop  - Win/Mac/Linux (Tauri 2.0)"
    echo ""

    read -p "Enter platform numbers (e.g., 1 2) or press Enter for web only: " PLATFORM_CHOICES

    TARGET_PLATFORMS=("web")
    PLATFORM_MAP=("mobile" "desktop")

    for choice in $PLATFORM_CHOICES; do
        if [ "$choice" -ge 1 ] && [ "$choice" -le 2 ]; then
            TARGET_PLATFORMS+=("${PLATFORM_MAP[$((choice-1))]}")
        fi
    done

    print_success "Target platforms: ${TARGET_PLATFORMS[*]}"
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Select Language
# ─────────────────────────────────────────────────────────────────────────────

select_language() {
    echo -e "${BLUE}Select default language:${NC}"
    echo "  1. English (en)"
    echo "  2. Turkish (tr)"
    echo "  3. Dutch (nl)"
    echo ""

    read -p "Choice [1]: " LANG_CHOICE
    LANG_CHOICE=${LANG_CHOICE:-1}

    case $LANG_CHOICE in
        1) DEFAULT_LOCALE="en" ;;
        2) DEFAULT_LOCALE="tr" ;;
        3) DEFAULT_LOCALE="nl" ;;
        *) DEFAULT_LOCALE="en" ;;
    esac

    print_success "Default language: $DEFAULT_LOCALE"
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Setup Project
# ─────────────────────────────────────────────────────────────────────────────

setup_project() {
    print_info "Setting up project..."
    echo ""

    # ─── Generate nyoworks.config.yaml ───

    cat > nyoworks.config.yaml << CONFIGEOF
framework:
  version: "${FRAMEWORK_VERSION}"

project:
  name: "${PROJECT_NAME}"
  code: "${PROJECT_CODE}"
  scope: "@${PROJECT_SLUG}"

platforms:
  targets:
$(printf "    - %s\n" "${TARGET_PLATFORMS[@]}")

i18n:
  default: "${DEFAULT_LOCALE}"
  supported:
    - en
    - tr
    - nl

specs:
  required: false
  max_lines: 20
CONFIGEOF

    print_success "nyoworks.config.yaml"

    # ─── Create .nyoworks state ───

    mkdir -p .nyoworks
    cat > .nyoworks/state.json << STATEEOF
{
  "name": "${PROJECT_NAME}",
  "code": "${PROJECT_CODE}",
  "phase": "DISCOVERY",
  "enabledFeatures": [],
  "targetPlatforms": [$(printf '"%s",' "${TARGET_PLATFORMS[@]}" | sed 's/,$//') ],
  "tasks": [],
  "taskLocks": {},
  "decisions": [],
  "activityLog": [],
  "agents": {},
  "handoffs": [],
  "specs": [],
  "specRequired": false,
  "subPhaseDefinitions": {},
  "currentSubPhase": null,
  "subPhaseHistory": [],
  "manualApprovals": {}
}
STATEEOF

    print_success ".nyoworks/state.json"

    # ─── Remove unused platforms ───

    if [[ ! " ${TARGET_PLATFORMS[*]} " =~ " mobile " ]]; then
        if [ -d "apps/mobile" ]; then
            rm -rf apps/mobile
            print_info "Removed apps/mobile (not selected)"
        fi
    fi

    if [[ ! " ${TARGET_PLATFORMS[*]} " =~ " desktop " ]]; then
        if [ -d "apps/desktop" ]; then
            rm -rf apps/desktop
            print_info "Removed apps/desktop (not selected)"
        fi
    fi

    # ─── Build MCP server ───

    print_info "Building MCP server..."
    cd mcp-server && pnpm install -q && pnpm build -q && cd ..
    print_success "MCP server v${FRAMEWORK_VERSION}"

    # ─── Create .mcp.json ───

    cat > .mcp.json << MCPEOF
{
  "mcpServers": {
    "nyoworks": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
MCPEOF

    print_success ".mcp.json"

    # ─── Create .claude/settings.json ───

    mkdir -p .claude
    cat > .claude/settings.json << SETTINGSEOF
{
  "permissions": {
    "allow": [
      "Bash(*)",
      "Read",
      "Write",
      "Edit",
      "Glob",
      "Grep",
      "WebFetch",
      "WebSearch",
      "mcp__nyoworks"
    ],
    "deny": []
  }
}
SETTINGSEOF

    print_success ".claude/settings.json"

    # ─── Update package names ───

    if [[ "$(uname)" == "Darwin" ]]; then
        find . -name "package.json" -not -path "*/node_modules/*" -exec sed -i '' "s/@project/@$PROJECT_SLUG/g" {} \;
    else
        find . -name "package.json" -not -path "*/node_modules/*" -exec sed -i "s/@project/@$PROJECT_SLUG/g" {} \;
    fi

    print_success "Package names updated to @$PROJECT_SLUG"

    # ─── Replace {PROJECT_NAME} in agent commands ───

    if [[ "$(uname)" == "Darwin" ]]; then
        find .claude/commands -name "*.md" -exec sed -i '' "s/{PROJECT_NAME}/$PROJECT_NAME/g" {} \;
    else
        find .claude/commands -name "*.md" -exec sed -i "s/{PROJECT_NAME}/$PROJECT_NAME/g" {} \;
    fi

    print_success "Agent commands configured"

    # ─── Initialize git ───

    if [ ! -d ".git" ]; then
        git init -q
        git checkout -b main -q 2>/dev/null || true
        print_success "Git initialized (main branch)"
    fi

    # ─── Create .env.local ───

    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        print_success ".env.local created"
    fi

    # ─── Generate CLAUDE.md ───

    cat > CLAUDE.md << CLAUDEEOF
# ${PROJECT_NAME} - Claude Code Rules
> NYOWORKS Framework v${FRAMEWORK_VERSION} | $(date +%Y-%m-%d)

## Framework Integration

This project uses **NYOWORKS Framework v${FRAMEWORK_VERSION}**. Configuration: \`nyoworks.config.yaml\`

### AI Workflow Commands
\`\`\`
/lead      - Project orchestration (requirements, feature selection, Bible)
/architect - System design (schema, API contracts, UI contracts)
/data      - Database implementation (Drizzle schema, migrations)
/backend   - API implementation (Hono routes, services)
/designer  - UI/UX design (TweakCN themes, components)
/frontend  - UI development (Next.js pages, components)
/qa        - Testing and quality (unit, integration, E2E)
/devops    - Infrastructure (Docker, CI/CD, deployment)
\`\`\`

### Target Platforms
$(printf -- "- %s\n" "${TARGET_PLATFORMS[@]}")

## Strict Rules

### Code Style
- NO semicolons
- NO comments (only section dividers)
- Exports at end of file (RFCE pattern)
- Code in English, chat in Turkish
- NO emojis in professional communication

### Architecture
- Modular structure, clear boundaries
- Zero redundancy (DRY)
- MVC pattern (Models - Services - Controllers - Routes)
- Type safety (strict TypeScript, no any)
- Security first (auth + rate limiting + validation on every endpoint)

### Workflow
- Handoff Protocol: get_pending_handoffs -> acknowledge -> work -> create_handoff
- Spec-Driven: get_spec -> create_spec if missing -> approve -> implement
- Root File Ban: check_orphan_code() after every task (MANDATORY)

### Visual Elements
NEVER write from scratch. Use: Recharts, Motion, Magic UI, Lucide, shadcn/ui

### Bible Location
\`docs/bible/\` - All project documentation and decisions

---
> Generated by NYOWORKS Framework v${FRAMEWORK_VERSION}
CLAUDEEOF

    print_success "CLAUDE.md"

    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Setup Git Remote
# ─────────────────────────────────────────────────────────────────────────────

setup_git_remote() {
    echo -e "${BLUE}Git Repository Setup${NC}"
    echo "─────────────────────"
    echo ""
    echo "  1. GitHub (recommended)"
    echo "  2. GitLab"
    echo "  3. Skip (setup later)"
    echo ""

    read -p "Choice [3]: " GIT_PROVIDER
    GIT_PROVIDER=${GIT_PROVIDER:-3}

    if [ "$GIT_PROVIDER" == "3" ]; then
        print_info "Skipping Git remote setup"
        echo ""
        return
    fi

    case $GIT_PROVIDER in
        1) GIT_HOST="github.com" ;;
        2) GIT_HOST="gitlab.com" ;;
        *) print_info "Skipping Git remote setup"; echo ""; return ;;
    esac

    echo ""
    read -p "Repository URL (e.g., git@${GIT_HOST}:user/repo.git): " GIT_REMOTE_URL

    if [ -z "$GIT_REMOTE_URL" ]; then
        print_info "No URL provided, skipping remote setup"
        echo ""
        return
    fi

    # Add remote
    git remote add origin "$GIT_REMOTE_URL" 2>/dev/null || git remote set-url origin "$GIT_REMOTE_URL"
    print_success "Git remote: $GIT_REMOTE_URL"

    # Ask about initial commit and push
    echo ""
    read -p "Create initial commit and push? [Y/n]: " DO_INITIAL_COMMIT
    DO_INITIAL_COMMIT=${DO_INITIAL_COMMIT:-Y}

    if [[ "$DO_INITIAL_COMMIT" =~ ^[Yy]$ ]]; then
        # Create .gitignore if not exists
        if [ ! -f ".gitignore" ]; then
            cat > .gitignore << 'GITIGNOREEOF'
# Dependencies
node_modules/
.pnpm-store/

# Environment
.env
.env.local
.env.*.local

# Build
dist/
.next/
.turbo/
*.tsbuildinfo

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/

# Logs
*.log
npm-debug.log*

# State
.nyoworks/state.json
GITIGNOREEOF
            print_success ".gitignore"
        fi

        # Stage and commit
        git add -A
        git commit -m "feat: initial project setup

- NYOWORKS Framework v${FRAMEWORK_VERSION}
- Project: ${PROJECT_NAME} (${PROJECT_CODE})
- Platforms: ${TARGET_PLATFORMS[*]}
- Language: ${DEFAULT_LOCALE}

Co-Authored-By: NYOWORKS Framework <noreply@nyoworks.com>" -q

        print_success "Initial commit created"

        # Create develop branch
        git checkout -b develop -q
        print_success "Created develop branch"

        # Push both branches
        print_info "Pushing to remote..."
        git push -u origin main develop 2>/dev/null && print_success "Pushed main and develop branches" || print_error "Push failed - check your credentials"

        # Switch back to develop for development
        git checkout develop -q
        print_success "Switched to develop branch (default for development)"
    fi

    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Start Docker
# ─────────────────────────────────────────────────────────────────────────────

start_docker() {
    if command -v docker &> /dev/null && [ -f "docker-compose.yml" ]; then
        echo -e "${BLUE}Start Docker services?${NC}"
        echo "  PostgreSQL 16 + Redis 7"
        echo ""
        read -p "Start now? [Y/n]: " START_DOCKER
        START_DOCKER=${START_DOCKER:-Y}

        if [[ "$START_DOCKER" =~ ^[Yy]$ ]]; then
            print_info "Starting Docker services..."
            docker compose up -d
            print_success "Docker services started"
            echo ""
        fi
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Install Dependencies
# ─────────────────────────────────────────────────────────────────────────────

install_dependencies() {
    echo -e "${BLUE}Install dependencies?${NC}"
    read -p "Run pnpm install? [Y/n]: " INSTALL_DEPS
    INSTALL_DEPS=${INSTALL_DEPS:-Y}

    if [[ "$INSTALL_DEPS" =~ ^[Yy]$ ]]; then
        print_info "Installing dependencies..."
        pnpm install
        print_success "Dependencies installed"
        echo ""
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Print Summary
# ─────────────────────────────────────────────────────────────────────────────

print_summary() {
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    Project Setup Complete                          ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Project:   $PROJECT_NAME ($PROJECT_CODE)"
    echo "Framework: v$FRAMEWORK_VERSION"
    echo "Platforms: ${TARGET_PLATFORMS[*]}"
    echo "Language:  $DEFAULT_LOCALE"
    echo ""
    echo -e "${BLUE}Git Workflow:${NC}"
    echo "  - main:    Production-ready code"
    echo "  - develop: Integration branch (default)"
    echo "  - feature/TASK-xxx-description: Feature branches"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. cp .env.example .env.local    # Edit with your values"
    echo "  2. docker compose up -d          # Start database & Redis"
    echo "  3. pnpm db:push                  # Push schema to database"
    echo "  4. pnpm dev                      # Start development"
    echo ""
    echo -e "${BLUE}In Claude Code:${NC}"
    echo "  Type /lead to start the AI workflow"
    echo ""
    echo -e "${YELLOW}Note:${NC} Lead agent will ask about features and project type."
    echo "      All features are pre-included. Unused ones will be removed."
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

main() {
    print_header
    check_prerequisites
    get_project_info
    select_platforms
    select_language
    setup_project
    setup_git_remote
    start_docker
    install_dependencies
    print_summary
}

main
