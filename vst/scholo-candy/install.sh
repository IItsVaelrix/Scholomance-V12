#!/usr/bin/env bash

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}  ScholoCandy Plugin Installer Wizard  ${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

echo -e "This wizard will compile and install the ScholoCandy VST3 and CLAP plugins."
echo ""

# Check for cargo
if ! command -v cargo &> /dev/null && [ ! -x "$HOME/.cargo/bin/cargo" ]; then
    echo -e "${YELLOW}Warning: Cargo not found in PATH. Make sure Rust is installed.${NC}"
    exit 1
fi

CARGO_CMD="cargo"
if ! command -v cargo &> /dev/null; then
    CARGO_CMD="$HOME/.cargo/bin/cargo"
fi

# Ask for installation type
echo -e "Where would you like to install the plugins?"
echo "1) Current User ( ~/.vst3 and ~/.clap ) - Recommended"
echo "2) System Wide ( /usr/lib/vst3 and /usr/lib/clap ) - Requires sudo"
read -p "Select an option [1 or 2]: " INSTALL_CHOICE

VST3_DIR="$HOME/.vst3"
CLAP_DIR="$HOME/.clap"
USE_SUDO=""

if [ "$INSTALL_CHOICE" == "2" ]; then
    VST3_DIR="/usr/lib/vst3"
    CLAP_DIR="/usr/lib/clap"
    USE_SUDO="sudo"
fi

echo ""
echo -e "${BLUE}Building the plugins (this might take a moment)...${NC}"
cd "$(dirname "$0")"
$CARGO_CMD run -p xtask -- bundle scholo_candy --release

echo -e "${BLUE}Installing plugins...${NC}"

# Create directories if they don't exist
$USE_SUDO mkdir -p "$VST3_DIR"
$USE_SUDO mkdir -p "$CLAP_DIR"

# Copy the bundles
$USE_SUDO cp -r "target/bundled/scholo_candy.vst3" "$VST3_DIR/"
$USE_SUDO cp -r "target/bundled/scholo_candy.clap" "$CLAP_DIR/"

echo -e "${GREEN}Installation Complete!${NC}"
echo -e "VST3 installed to: $VST3_DIR/scholo_candy.vst3"
echo -e "CLAP installed to: $CLAP_DIR/scholo_candy.clap"
echo -e "${YELLOW}You may need to rescan your plugins in Reaper or your DAW of choice.${NC}"
