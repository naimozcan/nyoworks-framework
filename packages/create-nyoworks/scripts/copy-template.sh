#!/bin/bash

# Copy template files for create-nyoworks package
# Run this before publishing: ./scripts/copy-template.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
FRAMEWORK_ROOT="$(dirname "$(dirname "$PACKAGE_DIR")")"
TEMPLATE_DIR="$PACKAGE_DIR/template"

echo "Copying template files..."
echo "From: $FRAMEWORK_ROOT"
echo "To: $TEMPLATE_DIR"

# Clean existing template
rm -rf "$TEMPLATE_DIR"
mkdir -p "$TEMPLATE_DIR"

# Copy directories
cp -r "$FRAMEWORK_ROOT/apps" "$TEMPLATE_DIR/"
cp -r "$FRAMEWORK_ROOT/packages" "$TEMPLATE_DIR/"
cp -r "$FRAMEWORK_ROOT/docs" "$TEMPLATE_DIR/"
cp -r "$FRAMEWORK_ROOT/mcp-server" "$TEMPLATE_DIR/"
cp -r "$FRAMEWORK_ROOT/.claude" "$TEMPLATE_DIR/"
cp -r "$FRAMEWORK_ROOT/docker" "$TEMPLATE_DIR/" 2>/dev/null || true

# Copy root files
cp "$FRAMEWORK_ROOT/package.json" "$TEMPLATE_DIR/"
cp "$FRAMEWORK_ROOT/pnpm-workspace.yaml" "$TEMPLATE_DIR/"
cp "$FRAMEWORK_ROOT/turbo.json" "$TEMPLATE_DIR/"
cp "$FRAMEWORK_ROOT/tsconfig.json" "$TEMPLATE_DIR/"
cp "$FRAMEWORK_ROOT/.env.example" "$TEMPLATE_DIR/"
cp "$FRAMEWORK_ROOT/.gitignore" "$TEMPLATE_DIR/"
cp "$FRAMEWORK_ROOT/nyoworks.config.yaml" "$TEMPLATE_DIR/"

# Remove create-nyoworks from template (avoid inception)
rm -rf "$TEMPLATE_DIR/packages/create-nyoworks"

# Remove build artifacts and dependencies
find "$TEMPLATE_DIR" -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
find "$TEMPLATE_DIR" -type d -name "dist" -exec rm -rf {} + 2>/dev/null || true
find "$TEMPLATE_DIR" -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true
find "$TEMPLATE_DIR" -type d -name ".turbo" -exec rm -rf {} + 2>/dev/null || true
find "$TEMPLATE_DIR" -type d -name ".nyoworks" -exec rm -rf {} + 2>/dev/null || true

# Remove sensitive files
find "$TEMPLATE_DIR" -name ".env" -delete 2>/dev/null || true
find "$TEMPLATE_DIR" -name "*.log" -delete 2>/dev/null || true

echo "Template copied successfully!"
echo "Files: $(find "$TEMPLATE_DIR" -type f | wc -l | tr -d ' ')"
