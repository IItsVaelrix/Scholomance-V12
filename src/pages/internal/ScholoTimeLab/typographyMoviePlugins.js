const SCHOOL_COLORS = ["#d6b35f", "#42d9ff", "#b56cff", "#ff5ca8", "#ff9d3d"];
const WALL_DARK = "#090914";
const WALL_MID = "#171329";
const WALL_LINE = "rgba(214, 179, 95, 0.34)";
const FLOOR_LINE = "rgba(66, 217, 255, 0.22)";

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function stableHash(input) {
  let hash = 2166136261;
  const text = String(input);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function signedUnit(seed) {
  return ((stableHash(seed) % 2000) / 1000) - 1;
}

function easeOutCubic(value) {
  const p = clamp01(value);
  return 1 - Math.pow(1 - p, 3);
}

function resolveCue(packet, type) {
  return packet.cues.find((cue) => cue.type === type) || null;
}

function resolveActiveCueIntensity(packet, types) {
  return packet.cues
    .filter((cue) => types.includes(cue.type))
    .reduce((total, cue) => total + (cue.eased ?? cue.progress) * (cue.params?.intensity ?? 1), 0);
}

function getLyricText(packet) {
  if (!packet.lyrics.length) return "SCHOLO TIME";
  return packet.lyrics.map((lyric) => lyric.text).join(" ");
}

function splitGlyphs(packet) {
  const text = getLyricText(packet).toUpperCase();
  return Array.from(text).filter((glyph) => glyph.trim());
}

function drawPolygon(ctx, points, fillStyle, strokeStyle) {
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawBackground(ctx, width, height, packet) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#05050b");
  gradient.addColorStop(0.42, "#10101f");
  gradient.addColorStop(1, "#050609");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const pulse = 0.16 + 0.16 * Math.sin(packet.music.beatPhase * Math.PI);
  ctx.fillStyle = `rgba(66, 217, 255, ${pulse})`;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
}

function drawMazeCorridor(ctx, width, height, packet, settings) {
  const cx = width / 2;
  const cy = height * 0.51;
  const beatTravel = packet.music.beatPhase;
  const barTurn = Math.sin((packet.music.barPhase + packet.music.barIndex * 0.5) * Math.PI * 2);
  const cueTurn =
    (resolveCue(packet, "CAMERA_TURN_RIGHT")?.eased || 0) -
    (resolveCue(packet, "CAMERA_TURN_LEFT")?.eased || 0);
  const turn = clamp01(Math.abs(barTurn * 0.38 + cueTurn * 0.62)) * Math.sign(barTurn + cueTurn || 1);
  const sectionEnergy = packet.music.sectionEnergy || 0.5;
  const gate = resolveActiveCueIntensity(packet, ["LYRIC_GATE_OPEN", "SECTION_MATERIAL_SHIFT"]);

  ctx.save();
  ctx.translate(turn * width * 0.08, 0);

  const layers = 12;
  for (let i = layers; i >= 1; i -= 1) {
    const depth = (i - beatTravel) / layers;
    const nextDepth = Math.max(0.02, (i - 1 - beatTravel) / layers);
    const nearW = width * (1.04 - depth * 0.78);
    const nearH = height * (0.92 - depth * 0.62);
    const farW = width * (1.04 - nextDepth * 0.78);
    const farH = height * (0.92 - nextDepth * 0.62);
    const drift = Math.sin((packet.music.barIndex + i) * 1.7) * width * 0.045 * depth;
    const near = {
      left: cx - nearW / 2 + drift,
      right: cx + nearW / 2 + drift,
      top: cy - nearH / 2,
      bottom: cy + nearH / 2,
    };
    const far = {
      left: cx - farW / 2 + drift * 0.75,
      right: cx + farW / 2 + drift * 0.75,
      top: cy - farH / 2,
      bottom: cy + farH / 2,
    };
    const shade = Math.round(16 + (1 - depth) * 34 + sectionEnergy * 20);
    const wallFill = `rgb(${shade}, ${Math.round(shade * 0.82)}, ${Math.round(shade * 1.36)})`;

    drawPolygon(ctx, [[near.left, near.top], [far.left, far.top], [far.left, far.bottom], [near.left, near.bottom]], wallFill, WALL_LINE);
    drawPolygon(ctx, [[far.right, far.top], [near.right, near.top], [near.right, near.bottom], [far.right, far.bottom]], wallFill, WALL_LINE);
    drawPolygon(ctx, [[near.left, near.top], [near.right, near.top], [far.right, far.top], [far.left, far.top]], WALL_DARK, WALL_LINE);
    drawPolygon(ctx, [[far.left, far.bottom], [far.right, far.bottom], [near.right, near.bottom], [near.left, near.bottom]], WALL_MID, FLOOR_LINE);

    if (i % 2 === 0) {
      ctx.strokeStyle = `rgba(214, 179, 95, ${0.08 + depth * 0.2})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(near.left, near.bottom);
      ctx.lineTo(far.left, far.bottom);
      ctx.moveTo(near.right, near.bottom);
      ctx.lineTo(far.right, far.bottom);
      ctx.stroke();
    }
  }

  const doorPulse = clamp01(gate) * (0.55 + 0.45 * Math.sin(packet.music.beatPhase * Math.PI));
  ctx.strokeStyle = `rgba(214, 179, 95, ${0.42 + doorPulse * 0.44})`;
  ctx.lineWidth = Math.max(2, width * 0.003);
  ctx.strokeRect(cx - width * 0.12, cy - height * 0.18, width * 0.24, height * 0.36);
  ctx.fillStyle = `rgba(214, 179, 95, ${doorPulse * 0.08})`;
  ctx.fillRect(cx - width * 0.12, cy - height * 0.18, width * 0.24, height * 0.36);

  if (settings.scanlines) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawGlyph(ctx, glyph, x, y, fontSize, color, alpha, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = clamp01(alpha);
  ctx.font = `900 ${fontSize}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = color;
  ctx.shadowBlur = fontSize * 0.34;
  ctx.fillStyle = color;
  ctx.fillText(glyph, 0, 0);
  ctx.lineWidth = Math.max(1, fontSize * 0.035);
  ctx.strokeStyle = "rgba(5, 5, 8, 0.72)";
  ctx.strokeText(glyph, 0, 0);
  ctx.restore();
}

function drawSnowField(ctx, width, height, packet, progress) {
  ctx.save();
  ctx.globalAlpha = 0.18 + progress * 0.16;
  ctx.fillStyle = "#f4fbff";
  for (let i = 0; i < 70; i += 1) {
    const seed = `${packet.projectId}:snow:${packet.frameIndex}:${i}`;
    const x = (stableHash(`${seed}:x`) % width);
    const y = ((stableHash(`${seed}:y`) % height) + packet.timeMs * (0.012 + (i % 5) * 0.004)) % height;
    const r = 0.8 + (stableHash(`${seed}:r`) % 4);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSnowAura(ctx, x, y, scale, melt, packet) {
  const wingPulse = 0.94 + Math.sin(packet.music.beatPhase * Math.PI * 2) * 0.035;
  const gradient = ctx.createRadialGradient(x, y - scale * 0.2, scale * 0.08, x, y, scale * 1.7);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.34)");
  gradient.addColorStop(0.44, "rgba(66, 217, 255, 0.14)");
  gradient.addColorStop(1, "rgba(66, 217, 255, 0)");

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(x, y, scale * 1.55 * wingPulse, scale * 1.9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(238, 250, 255, ${0.34 - melt * 0.22})`;
  ctx.lineWidth = Math.max(1, scale * 0.012);
  for (let i = 0; i < 12; i += 1) {
    const angle = -Math.PI * 0.78 + (i / 11) * Math.PI * 1.56;
    const inner = scale * 0.32;
    const outer = scale * (1.05 + (i % 3) * 0.08);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * inner, y - scale * 0.22 + Math.sin(angle) * inner);
    ctx.quadraticCurveTo(
      x + Math.cos(angle) * outer * 0.72,
      y - scale * 0.28 + Math.sin(angle) * outer * 0.72,
      x + Math.cos(angle) * outer,
      y - scale * 0.22 + Math.sin(angle) * outer,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawPixelBrainIntroImage(ctx, image, x, y, drawWidth, drawHeight, melt, stare, packet, alpha = 1) {
  const shimmer = 0.96 + Math.sin(packet.music.beatPhase * Math.PI * 2) * 0.025;
  const liquidDrop = melt * drawHeight * 0.22;
  const visibleHeight = drawHeight * (1 - melt * 0.28);
  const top = y - drawHeight / 2;
  const left = x - drawWidth / 2;

  ctx.save();
  ctx.shadowColor = "#dff6ff";
  ctx.shadowBlur = drawWidth * (0.12 + melt * 0.12);
  ctx.globalAlpha = alpha * (1 - melt * 0.78);
  ctx.imageSmoothingEnabled = true;

  ctx.save();
  ctx.beginPath();
  ctx.rect(left - drawWidth * 0.16, top - drawHeight * 0.12, drawWidth * 1.32, visibleHeight + drawHeight * 0.08);
  ctx.clip();
  ctx.drawImage(image, left, top + liquidDrop * 0.18, drawWidth * shimmer, drawHeight);
  ctx.restore();

  if (melt > 0.02) {
    ctx.globalAlpha = alpha * melt * 0.62;
    ctx.filter = `blur(${Math.max(1, drawWidth * 0.012)}px)`;
    ctx.drawImage(
      image,
      left - drawWidth * 0.04,
      top + visibleHeight * 0.42 + liquidDrop,
      drawWidth * 1.08,
      drawHeight * (0.38 + melt * 0.28),
    );
    ctx.filter = "none";

    ctx.fillStyle = "rgba(219, 247, 255, 0.46)";
    for (let i = 0; i < 14; i += 1) {
      const seed = `${packet.projectId}:svg-melt:${i}`;
      const dripX = left + drawWidth * (0.18 + (stableHash(`${seed}:x`) % 64) / 100);
      const dripY = top + visibleHeight * (0.62 + melt * 0.34) + (i % 4) * drawHeight * 0.018;
      ctx.beginPath();
      ctx.ellipse(dripX, dripY, drawWidth * 0.018, drawHeight * (0.025 + melt * 0.045), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (stare > 0.01 && melt < 0.65) {
    ctx.globalAlpha = alpha * stare * (1 - melt) * 0.82;
    ctx.fillStyle = "#e9fbff";
    ctx.shadowColor = "#42d9ff";
    ctx.shadowBlur = drawWidth * 0.05;
    ctx.beginPath();
    ctx.ellipse(x - drawWidth * 0.085, y - drawHeight * 0.21, drawWidth * 0.018, drawHeight * 0.013, 0, 0, Math.PI * 2);
    ctx.ellipse(x + drawWidth * 0.085, y - drawHeight * 0.21, drawWidth * 0.018, drawHeight * 0.013, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawSnowAngelIntro(ctx, width, height, packet, settings) {
  const introDuration = Math.max(1, settings.typographyStartMs || 1);
  const approachMs = Math.min(5600, introDuration * 0.46);
  const progress = clamp01(packet.timeMs / introDuration);
  const approachProgress = clamp01(packet.timeMs / Math.max(1, approachMs));
  const holdProgress = clamp01((packet.timeMs - approachMs) / Math.max(1, introDuration - approachMs));
  const approach = easeOutCubic(approachProgress);
  const stare = clamp01(holdProgress / 0.16);
  const melt = clamp01((holdProgress - 0.55) / 0.45);
  const cx = width / 2;
  const groundY = height * (0.76 - approach * 0.22 + melt * 0.04);
  const scale = width * (0.052 + approach * 0.24);
  const alpha = clamp01(0.24 + approach * 0.9 - melt * 0.86);
  const wingSpread = scale * (1.6 + Math.sin(packet.music.beatPhase * Math.PI * 2) * 0.08);
  const beatPosition = packet.music.beatIndex + packet.music.beatPhase;
  const floatBob = (1 - stare * 0.86) * Math.sin(beatPosition * Math.PI * 2) * scale * 0.055;
  const bob = settings.motion === "reduced" ? 0 : floatBob;

  drawSnowField(ctx, width, height, packet, progress);
  drawSnowAura(ctx, cx, groundY + bob, scale * 1.08, melt, packet);

  if (settings.introImage?.complete || settings.introImage?.naturalWidth) {
    const actorHeight = scale * (2.42 + stare * 0.18);
    const actorWidth = actorHeight * (32 / 48);
    drawPixelBrainIntroImage(ctx, settings.introImage, cx, groundY + bob - actorHeight * 0.1, actorWidth, actorHeight, melt, stare, packet, alpha);
    return;
  }

  ctx.save();
  ctx.translate(cx, groundY + bob);
  ctx.globalAlpha = alpha;
  ctx.shadowColor = "#dff6ff";
  ctx.shadowBlur = scale * (0.36 + melt * 0.6);
  ctx.fillStyle = "#edf9ff";
  ctx.strokeStyle = "rgba(66, 217, 255, 0.45)";
  ctx.lineWidth = Math.max(1, scale * 0.045);

  ctx.beginPath();
  ctx.ellipse(-wingSpread * 0.58, -scale * 0.15, wingSpread * 0.56, scale * 0.96, -0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(wingSpread * 0.58, -scale * 0.15, wingSpread * 0.56, scale * 0.96, 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const bodyGradient = ctx.createLinearGradient(0, -scale * 1.4, 0, scale * 1.1);
  bodyGradient.addColorStop(0, "#ffffff");
  bodyGradient.addColorStop(0.65, "#dff6ff");
  bodyGradient.addColorStop(1, melt > 0 ? `rgba(214, 179, 95, ${0.34 * melt})` : "#bfefff");
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.moveTo(0, -scale * 1.24);
  ctx.bezierCurveTo(scale * 0.42, -scale * 0.78, scale * 0.58, scale * 0.28, scale * (0.24 + melt * 0.34), scale * 1.15);
  ctx.lineTo(-scale * (0.24 + melt * 0.34), scale * 1.15);
  ctx.bezierCurveTo(-scale * 0.58, scale * 0.28, -scale * 0.42, -scale * 0.78, 0, -scale * 1.24);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, -scale * 1.32, scale * 0.25 * (1 - melt * 0.22), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (melt > 0) {
    ctx.globalAlpha = melt * 0.76;
    ctx.fillStyle = "rgba(214, 179, 95, 0.42)";
    for (let i = 0; i < 9; i += 1) {
      const dripX = signedUnit(`${packet.projectId}:drip:${i}`) * scale * 0.48;
      const dripY = scale * (0.5 + melt * (0.8 + i * 0.045));
      ctx.beginPath();
      ctx.ellipse(dripX, dripY, scale * 0.05, scale * (0.1 + melt * 0.18), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawMazeTypography(ctx, width, height, packet, settings) {
  if (packet.timeMs < (settings.typographyStartMs || 0)) return;

  const glyphs = splitGlyphs(packet);
  const cx = width / 2;
  const cy = height / 2;
  const sectionEnergy = packet.music.sectionEnergy || 0.5;
  const wordImpact = resolveActiveCueIntensity(packet, ["WORD_IMPACT", "GLYPH_REVEAL"]);
  const rhymeEcho = resolveActiveCueIntensity(packet, ["RHYME_ECHO", "PHONEME_TRAIL"]);
  const gateOpen = resolveActiveCueIntensity(packet, ["LYRIC_GATE_OPEN"]);

  glyphs.forEach((glyph, index) => {
    const hash = stableHash(`${packet.projectId}:${packet.frameIndex}:${glyph}:${index}`);
    const side = index % 3;
    const laneSeed = signedUnit(`${packet.projectId}:${glyph}:${index}:lane`);
    const depthPhase = (packet.music.beatPhase + index * 0.085 + packet.music.barIndex * 0.031) % 1;
    const z = easeOutCubic(depthPhase);
    const color = SCHOOL_COLORS[(hash + packet.music.barIndex) % SCHOOL_COLORS.length];
    const fontSize = Math.max(18, width * (0.026 + z * 0.032 + sectionEnergy * 0.012));
    const alpha = 0.14 + z * 0.68 + clamp01(wordImpact) * 0.22;
    const tremor = settings.motion === "reduced" ? 0 : Math.sin(packet.music.beatPhase * Math.PI * 2 + index) * width * 0.006;

    if (side === 0) {
      drawGlyph(
        ctx,
        glyph,
        width * (0.18 + laneSeed * 0.05) + tremor,
        cy + height * (0.26 - z * 0.48),
        fontSize,
        color,
        alpha,
        -0.14,
      );
    } else if (side === 1) {
      drawGlyph(
        ctx,
        glyph,
        width * (0.82 + laneSeed * 0.05) - tremor,
        cy + height * (0.26 - z * 0.48),
        fontSize,
        color,
        alpha,
        0.14,
      );
    } else {
      drawGlyph(
        ctx,
        glyph,
        cx + laneSeed * width * 0.19,
        height * (0.78 - z * 0.54),
        fontSize * 0.74,
        color,
        alpha * 0.76,
        laneSeed * 0.08,
      );
    }

    if (rhymeEcho > 0.05) {
      drawGlyph(
        ctx,
        glyph,
        cx + laneSeed * width * 0.32,
        cy - height * (0.06 + z * 0.18),
        fontSize * (1.1 + rhymeEcho * 0.1),
        "#ffffff",
        clamp01(rhymeEcho * 0.18),
        laneSeed * 0.28,
      );
    }
  });

  const lyricText = getLyricText(packet).toUpperCase();
  if (lyricText) {
    const activeProgress = packet.lyrics.reduce((total, lyric) => total + lyric.progress * lyric.weight, 0);
    const lyricWeight = packet.lyrics.reduce((total, lyric) => total + lyric.weight, 0) || 1;
    const progress = clamp01(activeProgress / lyricWeight);
    const titleSize = Math.min(width * 0.085, 78) * (1 + clamp01(wordImpact) * 0.1);
    ctx.save();
    ctx.font = `900 ${titleSize}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#d6b35f";
    ctx.shadowBlur = titleSize * (0.28 + clamp01(gateOpen) * 0.18);
    ctx.fillStyle = "#f7e8b4";
    ctx.globalAlpha = 0.28 + progress * 0.54 + clamp01(gateOpen) * 0.18;
    ctx.fillText(lyricText.slice(0, 34), cx, height * (0.49 - clamp01(gateOpen) * 0.06));
    ctx.restore();
  }
}

function drawDiagnostics(ctx, width, height, packet, settings) {
  if (!settings.diagnostics) return;
  ctx.save();
  ctx.font = `${Math.max(11, width * 0.012)}px JetBrains Mono, monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "rgba(232, 224, 194, 0.72)";
  ctx.fillText(
    `frame ${packet.frameIndex} | beat ${packet.music.beatIndex}.${packet.music.beatPhase.toFixed(3)} | bar ${packet.music.barIndex}.${packet.music.barPhase.toFixed(3)}`,
    width * 0.025,
    height - height * 0.035,
  );
  ctx.restore();
}

function renderFirstPersonMaze(ctx, packet, settings = {}) {
  const { width, height } = ctx.canvas;
  drawBackground(ctx, width, height, packet);
  drawMazeCorridor(ctx, width, height, packet, settings);
  if (packet.timeMs < (settings.typographyStartMs || 0)) {
    drawSnowAngelIntro(ctx, width, height, packet, settings);
  }
  drawMazeTypography(ctx, width, height, packet, settings);
  drawDiagnostics(ctx, width, height, packet, settings);
}

function renderGlyphConstellation(ctx, packet, settings = {}) {
  const { width, height } = ctx.canvas;
  drawBackground(ctx, width, height, packet);
  if (packet.timeMs < (settings.typographyStartMs || 0)) {
    drawSnowAngelIntro(ctx, width, height, packet, settings);
    drawDiagnostics(ctx, width, height, packet, settings);
    return;
  }
  const glyphs = splitGlyphs(packet);
  const radius = Math.min(width, height) * 0.28;
  const pulse = 0.82 + Math.sin(packet.music.beatPhase * Math.PI) * 0.18;
  glyphs.forEach((glyph, index) => {
    const angle = ((index / Math.max(1, glyphs.length)) + packet.music.barPhase * 0.18) * Math.PI * 2;
    const color = SCHOOL_COLORS[(index + packet.music.beatIndex) % SCHOOL_COLORS.length];
    drawGlyph(
      ctx,
      glyph,
      width / 2 + Math.cos(angle) * radius * pulse,
      height / 2 + Math.sin(angle) * radius * pulse,
      Math.max(22, width * 0.052),
      color,
      settings.motion === "reduced" ? 0.72 : 0.9,
      angle + Math.PI / 2,
    );
  });
  drawDiagnostics(ctx, width, height, packet, settings);
}

export const TYPOGRAPHY_MOVIE_PLUGINS = Object.freeze([
  Object.freeze({
    id: "first-person-maze",
    label: "First-Person Maze",
    description: "Beat-locked corridor movement with wall-carved glyphs and lyric gates.",
    render: renderFirstPersonMaze,
  }),
  Object.freeze({
    id: "glyph-constellation",
    label: "Glyph Constellation",
    description: "A lighter deterministic fallback for radial lyric motion.",
    render: renderGlyphConstellation,
  }),
]);

export function getTypographyMoviePlugin(pluginId) {
  return TYPOGRAPHY_MOVIE_PLUGINS.find((plugin) => plugin.id === pluginId) || TYPOGRAPHY_MOVIE_PLUGINS[0];
}
