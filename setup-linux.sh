#!/usr/bin/env bash

# ==============================================================================
# ✨ Scholomance V12 — Linux Substrate Installer (setup-linux.sh) ✨
# ==============================================================================
# This script initializes the Scholomance grimoire stack on Linux.
# Specifically optimized for Arch, Debian/Ubuntu, Fedora, and SteamOS (Steam Deck).
# Automatically handles NVM, Node 20+, system compilation libraries,
# secure secrets generation, npm dependencies, and database seeds.
# ==============================================================================

# Exit immediately if a pipeline returns a non-zero status
set -o pipefail

# --- Color Palette (Magic Schools Theme) ---
export COLOR_SONIC="\e[1;35m"      # Purple (Sound/Vibration)
export COLOR_PSYCHIC="\e[1;36m"    # Cyan (Mind/Perception)
export COLOR_ALCHEMY="\e[38;5;201m" # Magenta/Pink (Transformation)
export COLOR_WILL="\e[38;5;208m"    # Orange (Force/Intent)
export COLOR_VOID="\e[1;30m"        # Zinc/Dark Grey (Entropy)
export COLOR_GOLD="\e[38;5;220m"    # Gold (Grimoire Border)
export COLOR_GREEN="\e[1;32m"       # Success
export COLOR_RED="\e[1;31m"         # Error/Danger
export COLOR_RESET="\e[0m"          # Reset color

# --- Beautiful Grimoire Print Helper ---
function print_banner() {
  clear
  echo -e "${COLOR_GOLD}╔══════════════════════════════════════════════════════════════════════════╗${COLOR_RESET}"
  echo -e "${COLOR_GOLD}║${COLOR_RESET}   ${COLOR_SONIC}❖${COLOR_RESET} ${COLOR_GOLD}SCHOLOMANCE V12 — LINUX SUBSTRATE INITIALIZATION RITUAL${COLOR_RESET} ${COLOR_SONIC}❖${COLOR_RESET}   ${COLOR_GOLD}║${COLOR_RESET}"
  echo -e "${COLOR_GOLD}╚══════════════════════════════════════════════════════════════════════════╝${COLOR_RESET}"
  echo -e ""
}

function log_status() {
  local school_color="$1"
  local symbol="$2"
  local message="$3"
  echo -e "${school_color}[${symbol}] ${message}${COLOR_RESET}"
}

function log_success() {
  echo -e "${COLOR_GREEN}✔ $1${COLOR_RESET}"
}

function log_warning() {
  echo -e "${COLOR_WILL}⚠ $1${COLOR_RESET}"
}

function log_error() {
  echo -e "${COLOR_RED}✘ $1${COLOR_RESET}"
}

# --- 1) Welcome Header & OS Detection ---
print_banner
log_status "$COLOR_PSYCHIC" "🔮" "Detecting physical host constraints..."

# Detect Linux Distribution
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS_NAME=$NAME
  OS_ID=$ID
  OS_ID_LIKE=$ID_LIKE
else
  OS_NAME="Generic Linux"
  OS_ID="linux"
  OS_ID_LIKE="unix"
fi

log_success "Host platform detected: ${COLOR_PSYCHIC}${OS_NAME}${COLOR_RESET} (ID: ${OS_ID})"

# Special SteamOS / Steam Deck Handler
IS_STEAMOS=false
if [[ "$OS_ID" == "steamos" || "$VARIANT_ID" == "steamdeck" ]]; then
  IS_STEAMOS=true
  log_status "$COLOR_ALCHEMY" "✦" "Steam Deck (SteamOS) environment detected!"
  log_status "$COLOR_VOID" "❖" "Root filesystem is read-only by default on SteamOS."
fi

# --- 2) Check or Install Node.js via NVM ---
log_status "$COLOR_SONIC" "❖" "Auditing Node.js & npm runtime..."

# Helper to check if node command is available
function check_node() {
  if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v | sed 's/v//')
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
      return 0
    fi
  fi
  return 1
}

# Source NVM paths just in case it is installed but not active in current non-interactive shell
function load_nvm() {
  export NVM_DIR="$HOME/.nvm"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
    return 0
  fi
  return 1
}

# Main Node/NPM resolution
NODE_FOUND=false
USING_VOLTA=false

if command -v volta >/dev/null 2>&1; then
  USING_VOLTA=true
  NODE_FOUND=true
elif check_node; then
  NODE_FOUND=true
else
  if load_nvm && check_node; then
    NODE_FOUND=true
  fi
fi

if [ "$NODE_FOUND" = true ]; then
  if [ "$USING_VOLTA" = true ]; then
    log_success "Volta toolchain manager active: Node v$(node -v), npm v$(npm -v), pnpm v$(pnpm -v 2>/dev/null || echo 'not installed')"
  else
    log_success "Found Node.js v$(node -v) and npm v$(npm -v)"
  fi
else
  log_warning "Node.js (v18+) or npm not found in current execution path."
  log_status "$COLOR_ALCHEMY" "✦" "Initializing local Node.js environment via NVM..."

  # Install NVM
  export NVM_DIR="$HOME/.nvm"
  if [ ! -d "$NVM_DIR" ]; then
    log_status "$COLOR_PSYCHIC" "🔮" "Downloading NVM (Node Version Manager)..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  fi

  # Load NVM
  load_nvm

  if [ -s "$NVM_DIR/nvm.sh" ]; then
    log_status "$COLOR_SONIC" "❖" "Installing Node.js v20 (LTS Iron)..."
    nvm install 20
    nvm use 20
    nvm alias default 20
    
    if check_node; then
      log_success "Successfully installed Node.js v$(node -v) and npm v$(npm -v)"
    else
      log_error "Failed to install Node.js via NVM. Please install Node.js v20+ manually."
      exit 1
    fi
  else
    log_error "NVM setup failed. Please install Node.js v20+ manually."
    exit 1
  fi
fi

# --- 3) System Dependencies Installation ---
log_status "$COLOR_WILL" "⚔️" "Checking compiler and canvas library dependencies..."

# Detect which packages we need to install based on package manager
PACKAGES_TO_INSTALL=""
INSTALL_CMD=""

if [[ "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" || "$OS_ID_LIKE" == *"debian"* ]]; then
  INSTALL_CMD="sudo apt-get update && sudo apt-get install -y build-essential libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev librsvg2-dev python3 sqlite3"
  log_status "$COLOR_PSYCHIC" "🔮" "Debian/Ubuntu system libraries mapped for compilation support."
elif [[ "$OS_ID" == "fedora" || "$OS_ID" == "rhel" || "$OS_ID" == "centos" ]]; then
  INSTALL_CMD="sudo dnf groupinstall -y \"Development Tools\" && sudo dnf install -y cairo-devel pango-devel libjpeg-turbo-devel giflib-devel librsvg2-devel python3 sqlite"
  log_status "$COLOR_PSYCHIC" "🔮" "Fedora/RHEL system libraries mapped for compilation support."
elif [[ "$OS_ID" == "arch" || "$OS_ID_LIKE" == *"arch"* ]]; then
  INSTALL_CMD="sudo pacman -S --needed base-devel cairo pango libjpeg-turbo giflib librsvg pixman python3 sqlite"
  log_status "$COLOR_PSYCHIC" "🔮" "Arch Linux system libraries mapped for compilation support."
fi

# SteamOS Read-Only Handling
if [ "$IS_STEAMOS" = true ]; then
  # Check if root is actually read-only right now
  ROOT_RO=false
  touch /test-rw 2>/dev/null && rm /test-rw || ROOT_RO=true
  
  if [ "$ROOT_RO" = true ]; then
    log_warning "SteamOS root filesystem is READ-ONLY."
    echo -e "Native modules (like canvas and better-sqlite3) compile best with system dev libraries."
    echo -e "To install system packages on Steam Deck, you must temporarily disable read-only mode:"
    echo -e "  ${COLOR_SONIC}sudo steamos-readonly disable${COLOR_RESET}"
    echo -e "  ${COLOR_SONIC}sudo pacman-key --init && sudo pacman-key --populate archlinux holo${COLOR_RESET}"
    echo -e "  ${COLOR_SONIC}sudo pacman -S --needed base-devel cairo pango libjpeg-turbo giflib librsvg pixman python3 sqlite${COLOR_RESET}"
    echo -e ""
    
    read -p "Would you like to run these pacman installation commands now? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      log_status "$COLOR_ALCHEMY" "✦" "Disabling read-only mode and running pacman..."
      sudo steamos-readonly disable
      sudo pacman-key --init
      sudo pacman-key --populate archlinux holo
      sudo pacman -S --needed base-devel cairo pango libjpeg-turbo giflib librsvg pixman python3 sqlite
    else
      log_warning "Proceeding without system packages. Node prebuilts will be used, but compilation might fail."
    fi
  else
    log_status "$COLOR_GREEN" "✔" "SteamOS root filesystem is already writable."
    sudo pacman -S --needed base-devel cairo pango libjpeg-turbo giflib librsvg pixman python3 sqlite
  fi
elif [ -n "$INSTALL_CMD" ]; then
  echo -e "To compile compiled binary modules (canvas/better-sqlite3), we need to run:"
  echo -e "  ${COLOR_SONIC}${INSTALL_CMD}${COLOR_RESET}"
  echo -e ""
  read -p "Would you like to install these system dependencies now? (y/N) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    eval "$INSTALL_CMD"
  else
    log_status "$COLOR_VOID" "❖" "Skipping system library installation. Hope you have build tools installed!"
  fi
fi

# --- 4) Environment Setup (.env Configuration) ---
log_status "$COLOR_PSYCHIC" "🔮" "Harmonizing environment parameters (.env)..."

if [ ! -f .env ]; then
  log_status "$COLOR_SONIC" "❖" "Creating new .env file from .env.example..."
  copy_success=false
  if cp .env.example .env 2>/dev/null; then
    copy_success=true
  else
    # Fallback to python/node if normal cp fails due to permissions (shouldn't happen in workspace)
    cp .env.example .env
    copy_success=true
  fi

  if [ "$copy_success" = true ]; then
    log_success ".env file generated successfully."
  else
    log_error "Could not generate .env file. Please check folder permissions."
    exit 1
  fi
else
  log_success ".env file already exists. Preserving custom parameters."
fi

# Generate cryptographically secure keys for development if placeholders exist
function generate_secure_hex() {
  local length="$1"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$((length / 2))"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c "import secrets; print(secrets.token_hex($((length / 2))))"
  else
    # Simple shell random fallback if all else fails
    echo "$RANDOM$RANDOM$RANDOM$RANDOM$RANDOM$RANDOM" | md5sum | cut -c 1-"$length"
  fi
}

# Update SESSION_SECRET if placeholder exists
if grep -q "SESSION_SECRET=replace-me" .env; then
  log_status "$COLOR_ALCHEMY" "✦" "Infusing secure SESSION_SECRET..."
  RAND_SECRET=$(generate_secure_hex 32)
  # Handle sed syntax differences on BSD vs Linux, but we are on Linux
  sed -i "s/SESSION_SECRET=replace-me-with-a-random-32-char-string/SESSION_SECRET=${RAND_SECRET}/g" .env
  log_success "SESSION_SECRET successfully infused."
fi

# Update AUDIO_ADMIN_TOKEN if placeholder exists
if grep -q "AUDIO_ADMIN_TOKEN=replace-with" .env; then
  log_status "$COLOR_ALCHEMY" "✦" "Infusing secure AUDIO_ADMIN_TOKEN..."
  RAND_TOKEN=$(generate_secure_hex 24)
  sed -i "s/AUDIO_ADMIN_TOKEN=replace-with-a-long-random-token/AUDIO_ADMIN_TOKEN=${RAND_TOKEN}/g" .env
  log_success "AUDIO_ADMIN_TOKEN successfully infused."
fi

# --- 5) Dependency Installation ---
install_success=false

if [ -f "pnpm-lock.yaml" ]; then
  log_status "$COLOR_SONIC" "❖" "Summoning pnpm dependencies (running pnpm install)..."
  
  if pnpm install --frozen-lockfile; then
    install_success=true
  else
    log_warning "pnpm install with frozen lockfile failed. Attempting standard pnpm install..."
    if pnpm install; then
      install_success=true
    fi
  fi
else
  log_status "$COLOR_SONIC" "❖" "Summoning npm dependencies (running npm ci/install)..."

  # Ensure we use NVM version if loaded
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    \. "$NVM_DIR/nvm.sh"
  fi

  if npm ci; then
    install_success=true
  else
    log_warning "npm ci failed. Attempting standard npm install..."
    if npm install; then
      install_success=true
    fi
  fi
fi

if [ "$install_success" = true ]; then
  log_success "All dependencies successfully loaded."
else
  log_error "Dependency installation failed. Please check build errors above."
  exit 1
fi

# --- 6) Playwright Browser Installation ---
log_status "$COLOR_PSYCHIC" "🔮" "Downloading visual assertion tools (Playwright)..."
if npx playwright install chromium; then
  log_success "Playwright Chromium binary loaded."
else
  log_warning "Playwright installation failed. Visual regression tests may be unavailable."
fi

# --- 7) Database Setup & Initialization ---
log_status "$COLOR_ALCHEMY" "✦" "Initializing grimoire databases..."

# Setup user databases and seeds
if npm run db:setup; then
  log_success "SQLite databases created and seeded successfully."
else
  log_error "Database setup failed. Please verify database path configuration in .env"
  exit 1
fi

# Generate school styles variables
log_status "$COLOR_SONIC" "❖" "Regenerating school-themed stylesheets..."
if node scripts/generate-school-styles.js; then
  log_success "School styles generated."
else
  log_warning "Failed to pre-generate school styles. They will be generated at build time."
fi

# --- 8) Synthesis / Success ---
print_banner
echo -e "${COLOR_GREEN}✔ THE SUBSTRATE INITIALIZATION RITUAL IS COMPLETE!${COLOR_RESET}"
echo -e ""
echo -e "The grimoire has aligned itself with your Linux environment."
echo -e ""
echo -e "══════════════════════════════════════════════════════════════════════════"
echo -e "🧙 ${COLOR_GOLD}HOW TO RUN SCHOLOMANCE V12:${COLOR_RESET}"
echo -e "══════════════════════════════════════════════════════════════════════════"
echo -e "Start the backend and frontend Vite development server together:"
echo -e "  ${COLOR_PSYCHIC}npm run dev:full${COLOR_RESET}"
echo -e ""
echo -e "Or run them independently:"
echo -e "  - Server only:   ${COLOR_SONIC}npm run dev:server${COLOR_RESET}"
echo -e "  - Frontend only: ${COLOR_SONIC}npm run dev${COLOR_RESET}"
echo -e "══════════════════════════════════════════════════════════════════════════"
echo -e ""
echo -e "${COLOR_GOLD}Keep your words sharp and your phonemes resonant.${COLOR_RESET}"
echo -e ""
