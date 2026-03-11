#!/usr/bin/env bash
set -euo pipefail

# Convert Markdown chapter drafts to AsciiDoc for Antora
# Usage: ./scripts/convert-chapters.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC_DIR="$PROJECT_ROOT/_tmp/cto-book-draft"
DEST_DIR="$PROJECT_ROOT/docs/modules/ROOT/pages"

# Check pandoc is installed
if ! command -v pandoc &>/dev/null; then
  echo "Error: pandoc is not installed. Install with: brew install pandoc" >&2
  exit 1
fi

# Chapter mapping: source_file:target_file
CHAPTERS=(
  "chapter-0-introduction-draft.md:introduction.adoc"
  "chapter-1-draft.md:1-four-stages-cto-evolution.adoc"
  "chapter-2-draft.md:2-how-people-become-ctos.adoc"
  "chapter-3-draft.md:3-ceo-cto-relationship.adoc"
  "chapter-4-draft.md:4-technical-decisions-business-decisions.adoc"
  "chapter-5-draft.md:5-technical-debt.adoc"
  "chapter-6-draft.md:6-shipping-software.adoc"
  "chapter-7-draft.md:7-rushing-vs-speed.adoc"
  "chapter-8-draft.md:8-working-with-product.adoc"
  "chapter-9-draft.md:9-measuring-engineering-metrics.adoc"
  "chapter-10-draft.md:10-business-acumen-gap.adoc"
  "chapter-11-draft.md:11-building-engineering-team.adoc"
  "chapter-12-draft.md:12-ai-transformation.adoc"
  "chapter-13-draft.md:13-maker-to-multiplier.adoc"
  "chapter-14-draft.md:14-operating-rhythm.adoc"
  "chapter-15-draft.md:15-cto-burnout-isolation.adoc"
)

mkdir -p "$DEST_DIR"

convert_chapter() {
  local src_file="$1"
  local dest_file="$2"
  local src_path="$SRC_DIR/$src_file"
  local dest_path="$DEST_DIR/$dest_file"

  if [[ ! -f "$src_path" ]]; then
    echo "  SKIP: $src_file (not found)" >&2
    return 1
  fi

  # Step 1: Pandoc conversion
  local content
  content=$(pandoc -f markdown -t asciidoc --wrap=none "$src_path" 2>/dev/null)

  # Step 2: Post-pandoc fixups

  # 2a: Promote all heading levels by one (pandoc outputs == for #, === for ##, etc.
  # but AsciiDoc/Antora expects = for doc title, == for sections, etc.)
  content=$(echo "$content" | perl -pe 's/^(=+)=/\1/ if /^==/')

  # 2b: Fix smart quotes - pandoc wraps them in backtick-quote pairs
  # "`text`" -> "text"  and '`text`' -> 'text'
  content=$(echo "$content" | sed -E "s/\"\`([^\`]*)\`\"/\"\1\"/g")

  # 2c: Convert AUTHOR insertion markers to WARNING admonition blocks
  # Pandoc produces: *++[++AUTHOR: ...++]++*
  # We need to match potentially multi-line AUTHOR markers
  content=$(echo "$content" | perl -0777 -pe '
    # Handle pandoc-mangled AUTHOR markers: *++[++AUTHOR: ...++]++*
    s/\*\+\+\[\+\+AUTHOR:\s*(.*?)\+\+\]\+\+\*/\n[WARNING]\n====\nAUTHOR: $1\n====\n/gs;
    # Handle any remaining raw **[AUTHOR: ...]** that pandoc did not mangle
    s/\*\*\[AUTHOR:\s*(.*?)\]\*\*/\n[WARNING]\n====\nAUTHOR: $1\n====\n/gs;
  ')

  # 2d: Clean up remaining pandoc bracket escaping: ++[++ and ++]++ -> [ and ]
  content=$(echo "$content" | sed -E 's/\+\+\[\+\+/[/g; s/\+\+\]\+\+/]/g')

  # 2e: Remove empty Endnotes section at end of file
  # (pandoc inlines footnotes, so the Endnotes heading is left empty)
  content=$(echo "$content" | sed '/^== Endnotes$/d; /^=== Endnotes$/d')

  # 2f: Remove trailing horizontal rules (thematic breaks) that were just separators
  # before the endnotes section - clean up the last one if it's near end of file
  content=$(echo "$content" | perl -0777 -pe "s/\n'{5,}\n*\$/\n/s")

  # 2g: Clean up any double+ blank lines
  content=$(echo "$content" | cat -s)

  echo "$content" > "$dest_path"
  echo "  OK: $src_file -> $dest_file"
}

echo "Converting chapters from $SRC_DIR to $DEST_DIR"
echo ""

errors=0
for mapping in "${CHAPTERS[@]}"; do
  src_file="${mapping%%:*}"
  dest_file="${mapping##*:}"
  if ! convert_chapter "$src_file" "$dest_file"; then
    ((errors++))
  fi
done

echo ""
echo "Done. Converted $((${#CHAPTERS[@]} - errors))/${#CHAPTERS[@]} chapters."
if [[ $errors -gt 0 ]]; then
  echo "WARNING: $errors chapter(s) failed." >&2
  exit 1
fi
