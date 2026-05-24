#!/usr/bin/env bash
# bapX Tools Provisioning Script
# Installs all built-in tools into a sandbox's ~/.bapx/tools/
set -e

BAPX_HOME="${1:-$HOME/.bapx}"
TOOLS_DIR="$BAPX_HOME/tools"
mkdir -p "$TOOLS_DIR"

echo "=== Installing bapX built-in tools ==="

# Install Python deps
pip3 install python-pptx pymupdf pytesseract Pillow yt-dlp youtube-transcript-api \
  spotipy feedparser arxiv pyfiglet 2>&1 | tail -1 || true

# Install system deps
apt-get install -y tesseract-ocr poppler-utils 2>&1 | tail -1 || true

# Copy tool scripts
TOOL_SRCS="/usr/local/lib/bapx/tools"
if [ -d "$TOOL_SRCS" ]; then
  cp "$TOOL_SRCS"/tool_*.py "$TOOLS_DIR/" 2>/dev/null || true
  chmod +x "$TOOLS_DIR"/tool_*.py
fi

# Install bapX tool runner
cat > "$BAPX_HOME/bin/bapX-tools" << 'BAPXEOF'
#!/usr/bin/env bash
# bapX tool runner: bapX <tool> <command> [args...]
TOOL="${1:-help}"
CMD="${2:-help}"
shift 2 2>/dev/null || true

TOOL_DIR="${BAPX_HOME:-$HOME/.bapx}/tools"
SCRIPT="$TOOL_DIR/tool_${TOOL}.py"

if [ "$TOOL" = "help" ] || [ "$TOOL" = "--help" ]; then
  echo "bapX Tools — Built-in Tool Suite"
  echo "Usage: bapX <tool> <command> [json-args]"
  echo ""
  for f in "$TOOL_DIR"/tool_*.py; do
    name=$(basename "$f" | sed 's/tool_//;s/\.py//')
    desc=$(grep -m1 '"""' "$f" | sed 's/"""//g' 2>/dev/null)
    printf "  %-15s %s\n" "$name" "$desc"
  done
  exit 0
fi

if [ ! -f "$SCRIPT" ]; then
  echo "{\"error\": \"Unknown tool: $TOOL. Run 'bapX help' for list.\"}"
  exit 1
fi

exec python3 "$SCRIPT" "$CMD" "$@"
BAPXEOF
chmod +x "$BAPX_HOME/bin/bapX-tools"

echo "=== bapX tools installed ==="
ls -la "$TOOLS_DIR"/tool_*.py 2>/dev/null
