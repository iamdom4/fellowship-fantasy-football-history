#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Install Python dependencies for the data pipeline
pip install espn-api python-dotenv 2>/dev/null || pip3 install espn-api python-dotenv 2>/dev/null || true
