-- Scholomance Aseprite -> Foundry JSON exporter
--
-- Usage in Aseprite:
--   Run after editing a sprite imported by foundry_import.lua.
--
-- Output: JSON accepted by importAsepriteToFoundryAsset().

local BRIDGE_VERSION = "foundry-aseprite-lua/0.1.0"

local function fail(message)
  app.alert("Foundry export failed:\n" .. tostring(message))
  error(message)
end

local function ensure_json()
  if json and json.encode and json.decode then return json end
  fail("Aseprite JSON module is unavailable. Use Aseprite 1.3+ or install a JSON-capable scripting build.")
end

local function write_file(path, data)
  local file = io.open(path, "wb")
  if not file then fail("Could not write " .. tostring(path)) end
  file:write(data)
  file:close()
end

local function hex2(value)
  value = math.max(0, math.min(255, math.floor(value or 0)))
  return string.format("%02X", value)
end

local function pixel_to_hex(sprite, pixel)
  if sprite.colorMode == ColorMode.INDEXED then
    local palette = sprite.palettes[1] or sprite.palette
    local ok, color = pcall(function()
      return palette:getColor(pixel)
    end)
    if ok and color then
      return "#" .. hex2(color.red) .. hex2(color.green) .. hex2(color.blue)
    end
  end

  local r = app.pixelColor.rgbaR(pixel)
  local g = app.pixelColor.rgbaG(pixel)
  local b = app.pixelColor.rgbaB(pixel)
  return "#" .. hex2(r) .. hex2(g) .. hex2(b)
end

local function pixel_alpha(sprite, pixel)
  if sprite.colorMode == ColorMode.INDEXED then
    local palette = sprite.palettes[1] or sprite.palette
    local ok, color = pcall(function()
      return palette:getColor(pixel)
    end)
    if ok and color then return color.alpha or 255 end
  end

  return app.pixelColor.rgbaA(pixel)
end

local function layer_metadata(layer, json_api)
  if not layer.data or layer.data == "" then return nil end
  local ok, decoded = pcall(function()
    return json_api.decode(layer.data)
  end)
  if ok and type(decoded) == "table" then return decoded end
  return nil
end

local function collect_layers(layers, out)
  for _, layer in ipairs(layers) do
    if layer.isGroup then
      collect_layers(layer.layers, out)
    elseif layer.isImage then
      table.insert(out, layer)
    end
  end
end

local function export_layer_frame(sprite, layer, frame, json_api)
  local cel = layer:cel(frame)
  local cells = {}
  if cel then
    local image = cel.image
    local pos = cel.position
    for it in image:pixels() do
      local pixel = it()
      local alpha = pixel_alpha(sprite, pixel)
      if alpha and alpha > 0 then
        local x = it.x + pos.x
        local y = it.y + pos.y
        if x >= 0 and y >= 0 and x < sprite.width and y < sprite.height then
          table.insert(cells, {
            x = x,
            y = y,
            color = pixel_to_hex(sprite, pixel),
            emphasis = alpha / 255,
          })
        end
      end
    end
  end

  table.sort(cells, function(a, b)
    if a.y ~= b.y then return a.y < b.y end
    if a.x ~= b.x then return a.x < b.x end
    return a.color < b.color
  end)

  local metadata = layer_metadata(layer, json_api)
  for _, cell in ipairs(cells) do
    cell.metadata = {
      partId = metadata and metadata.layerName or layer.name,
      source = "aseprite_lua_export",
    }
  end

  return {
    name = layer.name,
    visible = layer.isVisible,
    editable = metadata and metadata.editable,
    role = metadata and metadata.role,
    cells = cells,
  }
end

local function build_payload(sprite, json_api, export_id)
  local image_layers = {}
  collect_layers(sprite.layers, image_layers)

  local frames = {}
  for frame_index, frame in ipairs(sprite.frames) do
    local layers = {}
    for _, layer in ipairs(image_layers) do
      table.insert(layers, export_layer_frame(sprite, layer, frame, json_api))
    end
    table.insert(frames, {
      frame = frame_index - 1,
      duration = math.max(1, math.floor((frame.duration or 0.1) * 1000)),
      layers = layers,
    })
  end

  return {
    version = "foundry-aseprite-bridge/0.1.0",
    width = sprite.width,
    height = sprite.height,
    cellSize = 1,
    gridType = "rectangular",
    snapStrength = 1,
    frames = frames,
    anchorPoints = {},
    symmetryAxes = {},
    palette = {
      source = "aseprite-lua",
      mode = "indexed",
      locked = true,
      colors = {},
    },
    meta = {
      bridge = "foundry-aseprite",
      bridgeLua = BRIDGE_VERSION,
      id = export_id,
      sourceKind = "aseprite-manual-edit",
      editable = true,
      roundTrip = {
        importFunction = "importAsepriteToFoundryAsset",
        preserves = { "x", "y", "color", "emphasis", "layer.name" },
      },
    },
  }
end

local sprite = app.activeSprite
if not sprite then fail("No active sprite.") end

local json_api = ensure_json()
local default_name = app.fs.fileTitle(sprite.filename or "foundry-edit")
if default_name == "" then default_name = "foundry-edit" end

local dlg = Dialog { title = "Export Foundry JSON" }
dlg:entry {
  id = "export_id",
  label = "Asset ID",
  text = default_name,
}
dlg:file {
  id = "path",
  label = "Save JSON",
  save = true,
  filename = default_name .. ".foundry.json",
  filetypes = { "json" },
}
dlg:button { id = "ok", text = "Export" }
dlg:button { id = "cancel", text = "Cancel" }
dlg:show()

local data = dlg.data
if not data.ok or not data.path or data.path == "" then return end

local payload = build_payload(sprite, json_api, data.export_id or default_name)
write_file(data.path, json_api.encode(payload))
app.alert("Exported Foundry JSON.\nBridge: " .. BRIDGE_VERSION)
