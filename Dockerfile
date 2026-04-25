FROM node:20-bookworm-slim AS build
WORKDIR /app

# Install Python 3 and curl for data build (needed before npm ci for dictionary build)
RUN apt-get update && apt-get install -y \
    python3 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# --- Build dictionary and corpus at image-build time ---
# Attempts to download OEWN and build fresh DBs. If this fails (network
# issues, GitHub rate limits), we fall back to pre-existing local DBs.
RUN mkdir -p /app/data

RUN ( \
    curl -fL "https://github.com/globalwordnet/english-wordnet/releases/download/2025-edition/english-wordnet-2025.xml.gz" -o /app/english-wordnet-2025.xml.gz \
    && python3 scripts/build_scholomance_dict.py --db /app/data/scholomance_dict.sqlite --oewn_path /app/english-wordnet-2025.xml.gz --overwrite \
    && python3 scripts/build_super_corpus.py --db /app/data/scholomance_corpus.sqlite --dict /app/data/scholomance_dict.sqlite --overwrite \
    && rm -f /app/english-wordnet-2025.xml.gz \
) || echo "Dictionary build failed — will fall back to pre-existing local DBs"

# Fallback: if Docker build produced no DBs (curl failed, etc.), use the
# pre-built local copies if they exist in the repo.
RUN test -s /app/data/scholomance_dict.sqlite || (test -f /app/scholomance_dict.sqlite && cp /app/scholomance_dict.sqlite /app/data/scholomance_dict.sqlite) || true
RUN test -s /app/data/scholomance_corpus.sqlite || (test -f /app/scholomance_corpus.sqlite && cp /app/scholomance_corpus.sqlite /app/data/scholomance_corpus.sqlite) || true

# Verify DBs exist (Warn but don't fail, as Turso handles live DBs)
RUN (test -s /app/data/scholomance_dict.sqlite && test -s /app/data/scholomance_corpus.sqlite) \
    || echo "WARNING: No local dictionary/corpus DBs available. Ensure Turso is configured."

# --- App build ---
# RHYME_ASTROLOGY_HOT_EDGE_WORD_LIMIT trims rhyme_edges.sqlite from ~97MB
# (default 10000 hot words) to ~73MB so the bundled artifact stays under
# the 100MB target. Less common words still resolve via runtime fallback.
RUN SCHOLOMANCE_DICT_PATH=/app/data/scholomance_dict.sqlite \
    SCHOLOMANCE_CORPUS_PATH=/app/data/scholomance_corpus.sqlite \
    RHYME_ASTROLOGY_OUTPUT_DIR=/app/data/rhyme-astrology \
    RHYME_ASTROLOGY_HOT_EDGE_WORD_LIMIT=7500 \
    npm run build:rhyme-astrology:index || \
    echo "Rhyme astrology build failed — index will be computed at runtime"
RUN npm run build
RUN npm prune --omit=dev

# --- Runtime stage ---
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
ENV SCHOLOMANCE_DICT_PATH=/app/data/scholomance_dict.sqlite
ENV SCHOLOMANCE_CORPUS_PATH=/app/data/scholomance_corpus.sqlite
ENV RHYME_ASTROLOGY_OUTPUT_DIR=/app/data/rhyme-astrology

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/codex ./codex
COPY --from=build /app/src/lib ./src/lib
COPY --from=build /app/src/data ./src/data
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/scripts/ritual-init.js ./scripts/ritual-init.js
COPY --from=build /app/mailer.adapter.js ./mailer.adapter.js
COPY --from=build /app/verseir_palette_payload.json ./verseir_palette_payload.json

# Copy pre-built dictionary and corpus (seed data — copied to persistent disk on first boot)
COPY --from=build /app/data/scholomance_dict.sqlite /app/data/scholomance_dict.sqlite
COPY --from=build /app/data/scholomance_corpus.sqlite /app/data/scholomance_corpus.sqlite
COPY --from=build /app/data/rhyme-astrology ./data/rhyme-astrology

EXPOSE 8080

CMD node scripts/ritual-init.js --detach && node codex/server/index.js
