#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# NYOWORKS Framework Setup
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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
    echo -e "${BLUE}║                    NYOWORKS Framework Setup                        ║${NC}"
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

    # Generate slug from name
    PROJECT_SLUG=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')

    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Select Delivery Model
# ─────────────────────────────────────────────────────────────────────────────

select_delivery_model() {
    echo -e "${BLUE}Select delivery model:${NC}"
    echo "  1. SaaS Platform (multi-tenant)"
    echo "  2. White Label (tenant branding)"
    echo "  3. Single Deploy (dedicated)"
    echo ""

    read -p "Choice [1]: " DELIVERY_CHOICE
    DELIVERY_CHOICE=${DELIVERY_CHOICE:-1}

    case $DELIVERY_CHOICE in
        1) DELIVERY_MODEL="saas" ;;
        2) DELIVERY_MODEL="whitelabel" ;;
        3) DELIVERY_MODEL="single" ;;
        *) DELIVERY_MODEL="saas" ;;
    esac

    print_success "Delivery model: $DELIVERY_MODEL"
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Select Features
# ─────────────────────────────────────────────────────────────────────────────

select_features() {
    echo -e "${BLUE}Select features to enable:${NC}"
    echo ""
    echo "  [Core - always included]"
    echo -e "  ${GREEN}✓${NC} auth, multi-tenancy, rbac, i18n, theme"
    echo ""
    echo "  [Optional - enter numbers separated by space]"
    echo "  1. payments      - Stripe subscriptions"
    echo "  2. appointments  - Booking/scheduling"
    echo "  3. inventory     - Warehouse management"
    echo "  4. crm           - Customer relationship"
    echo "  5. cms           - Content management"
    echo "  6. ecommerce     - Products/cart/checkout"
    echo "  7. analytics     - Dashboards/reports"
    echo "  8. notifications - Push/email alerts"
    echo "  9. audit         - Activity logging"
    echo "  10. export       - CSV/PDF export"
    echo "  11. realtime     - WebSocket features"
    echo ""

    read -p "Enter feature numbers (e.g., 2 7 8): " FEATURE_CHOICES

    ENABLED_FEATURES=()
    FEATURE_MAP=("payments" "appointments" "inventory" "crm" "cms" "ecommerce" "analytics" "notifications" "audit" "export" "realtime")

    for choice in $FEATURE_CHOICES; do
        if [ "$choice" -ge 1 ] && [ "$choice" -le 11 ]; then
            ENABLED_FEATURES+=("${FEATURE_MAP[$((choice-1))]}")
        fi
    done

    if [ ${#ENABLED_FEATURES[@]} -eq 0 ]; then
        print_info "No optional features selected"
    else
        print_success "Enabled features: ${ENABLED_FEATURES[*]}"
    fi

    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Select i18n
# ─────────────────────────────────────────────────────────────────────────────

select_i18n() {
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
# Create Project
# ─────────────────────────────────────────────────────────────────────────────

create_project() {
    TARGET_DIR="$PROJECT_SLUG"

    if [ -d "$TARGET_DIR" ]; then
        print_error "Directory '$TARGET_DIR' already exists"
        exit 1
    fi

    print_info "Creating project..."

    # Create directory
    mkdir -p "$TARGET_DIR"
    cd "$TARGET_DIR"

    # Copy monorepo template
    cp -r "$SCRIPT_DIR/templates/monorepo/." .

    # Copy core modules
    mkdir -p packages/database/src/schema
    cp -r "$SCRIPT_DIR/core/database/schema/"* packages/database/src/schema/
    cp "$SCRIPT_DIR/core/database/client.ts" packages/database/src/

    mkdir -p packages/validators/src
    cp -r "$SCRIPT_DIR/core/validators/"* packages/validators/src/

    mkdir -p packages/shared/src
    cp -r "$SCRIPT_DIR/core/shared/"* packages/shared/src/

    # Copy i18n messages
    mkdir -p apps/web/messages
    cp -r "$SCRIPT_DIR/core/i18n/messages/"* apps/web/messages/

    # Copy theme
    mkdir -p apps/web/styles
    cp "$SCRIPT_DIR/core/theme/variables.css" packages/ui/styles/

    # Copy enabled features
    for feature in "${ENABLED_FEATURES[@]}"; do
        if [ -d "$SCRIPT_DIR/features/$feature" ]; then
            mkdir -p "features/$feature"
            cp -r "$SCRIPT_DIR/features/$feature/"* "features/$feature/"
            print_success "$feature feature enabled"
        fi
    done

    # Copy Bible templates
    mkdir -p docs/bible
    cp -r "$SCRIPT_DIR/docs/bible/"* docs/bible/

    # Copy Claude commands
    mkdir -p .claude/commands
    cp -r "$SCRIPT_DIR/.claude/commands/"* .claude/commands/

    # Copy workflow configs
    mkdir -p workflow
    cp -r "$SCRIPT_DIR/workflow/"* workflow/

    # Create nyoworks.config.yaml
    FEATURES_YAML=""
    for feature in "${ENABLED_FEATURES[@]}"; do
        FEATURES_YAML="$FEATURES_YAML    - $feature\n"
    done

    cat > nyoworks.config.yaml << EOF
project:
  name: "$PROJECT_NAME"
  code: "$PROJECT_CODE"
  type: "$DELIVERY_MODEL"

features:
  enabled:
$(printf "    - %s\n" "${ENABLED_FEATURES[@]}")

delivery:
  model: "$DELIVERY_MODEL"
  region: "eu-west-1"

i18n:
  default: "$DEFAULT_LOCALE"
  supported: ["en", "tr", "nl"]
EOF

    print_success "nyoworks.config.yaml"

    # Create .nyoworks state
    mkdir -p .nyoworks
    cat > .nyoworks/state.json << EOF
{
  "name": "$PROJECT_NAME",
  "code": "$PROJECT_CODE",
  "phase": "DISCOVERY",
  "enabledFeatures": [$(printf '"%s",' "${ENABLED_FEATURES[@]}" | sed 's/,$//') ],
  "tasks": [],
  "taskLocks": {},
  "decisions": [],
  "activityLog": [],
  "agents": {}
}
EOF

    print_success ".nyoworks/state.json"

    # Copy and build MCP server
    mkdir -p mcp-server
    cp -r "$SCRIPT_DIR/mcp-server/src" mcp-server/
    cp "$SCRIPT_DIR/mcp-server/package.json" mcp-server/
    cp "$SCRIPT_DIR/mcp-server/tsconfig.json" mcp-server/
    cd mcp-server && pnpm install -q && pnpm build -q && cd ..
    print_success "MCP server installed"

    # Create .claude/settings.json with MCP
    mkdir -p .claude
    cat > .claude/settings.json << EOF
{
  "permissions": {
    "allow": [
      "Bash(mkdir:*)",
      "Bash(cp:*)",
      "Bash(mv:*)",
      "Bash(rm:*)",
      "Bash(chmod:*)",
      "Bash(pnpm:*)",
      "Bash(npm:*)",
      "Bash(git:*)",
      "Bash(docker:*)",
      "Read",
      "Write",
      "Edit",
      "Glob",
      "Grep",
      "mcp__nyoworks"
    ],
    "deny": []
  },
  "mcpServers": {
    "nyoworks": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
EOF
    print_success ".claude/settings.json with MCP"

    # Update package names
    find . -name "package.json" -exec sed -i '' "s/@project/@$PROJECT_SLUG/g" {} \;

    # Initialize git
    git init -q
    print_success "Git initialized"

    # Create .env.local
    cp .env.example .env.local
    print_success ".env.local created"

    # Create CLAUDE.md
    cat > CLAUDE.md << EOF
# $PROJECT_NAME - Claude Code Rules

> Project Code: $PROJECT_CODE
> Generated: $(date +%Y-%m-%d)

## Quick Reference

- **Phase:** Check with \`nyoworks status\`
- **Features:** ${ENABLED_FEATURES[*]}
- **Locale:** $DEFAULT_LOCALE

## Agent Commands

- \`/lead\` - Project Lead (orchestration)
- \`/architect\` - System Architect (design)
- \`/backend\` - Backend Developer (API)
- \`/frontend\` - Frontend Developer (UI)
- \`/data\` - Database Engineer (schema)
- \`/qa\` - QA Engineer (testing)
- \`/devops\` - DevOps Engineer (deploy)

## Code Standards

- NO semicolons
- NO comments (only section dividers)
- Exports at end of file
- Code in English
- Chat in Turkish

## Bible Location

\`docs/bible/\` - All documentation

---

[See full CLAUDE.md rules in parent framework]
EOF

    print_success "CLAUDE.md"

    cd ..
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Print Summary
# ─────────────────────────────────────────────────────────────────────────────

print_summary() {
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    Project Created Successfully                    ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Project: $PROJECT_NAME"
    echo "Directory: $PROJECT_SLUG"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. cd $PROJECT_SLUG"
    echo "  2. pnpm install"
    echo "  3. cp .env.example .env.local  # Edit with your values"
    echo "  4. docker compose up -d        # Start database & Redis"
    echo "  5. pnpm db:push               # Push schema to database"
    echo "  6. pnpm dev                   # Start development"
    echo ""
    echo -e "${BLUE}In Claude Code:${NC}"
    echo "  Type /lead to start the AI workflow"
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

main() {
    print_header
    check_prerequisites
    get_project_info
    select_delivery_model
    select_features
    select_i18n
    create_project
    print_summary
}

main
