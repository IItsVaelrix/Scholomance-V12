-- Scholomance Foundry -> Aseprite importer
--
-- Usage in Aseprite:
--   File -> Scripts -> Open Scripts Folder
--   Copy this file there, rescan scripts, then run it.
--
-- Input: JSON created by exportFoundryToAseprite().

local BRIDGE_VERSION = "foundry-aseprite-lua/0.1.0"

local function fail(message)
  app.alert("Foundry import failed:\n" .. tostring(message))
  error(message)
end

local function read_file(path)
  local file = io.open(path, "rb")
  if not file then fail("Could not open " .. tostring(path)) end
  local data = file:read("*a")
  file:close()
  return data
end

local function hex_to_rgba(hex)
  local raw = tostring(hex or "#FFFFFF"):gsub("#", "")
  if #raw == 3 then
    raw = raw:sub(1, 1) .. raw:sub(1, 1)
      .. raw:sub(2, 2) .. raw:sub(2, 2)
      .. raw:sub(3, 3) .. raw:sub(3, 3)
  end
  if #raw ~= 6 then raw = "FFFFFF" end
  return tonumber(raw:sub(1, 2), 16) or 255,
    tonumber(raw:sub(3, 4), 16) or 255,
    tonumber(raw:sub(5, 6), 16) or 255,
    255
end

local function normalize_hex(hex)
  local r, g, b = hex_to_rgba(hex)
  return string.format("#%02X%02X%02X", r, g, b)
end

local function ensure_json()
  if json and json.decode and json.encode then return json end
  fail("Aseprite JSON module is unavailable. Use Aseprite 1.3+ or install a JSON-capable scripting build.")
end

local function ensure_frames(sprite, frame_count)
  while #sprite.frames < frame_count do
    app.activeSprite = sprite
    app.command.NewFrame()
  end
end

local function clear_default_layers(sprite)
  while #sprite.layers > 0 do
    sprite:deleteLayer(sprite.layers[1])
  end
end

local function build_locked_palette(payload)
  local colors = {}
  local color_to_index = {}
  table.insert(colors, "#000000")

  for _, color in ipairs((payload.palette and payload.palette.colors) or {}) do
    local normalized = normalize_hex(color)
    if not color_to_index[normalized] then
      table.insert(colors, normalized)
      color_to_index[normalized] = #colors - 1
    end
  end

  for _, frame_data in ipairs(payload.frames or {}) do
    for _, layer_data in ipairs(frame_data.layers or {}) do
      for _, cell in ipairs(layer_data.cells or {}) do
        local normalized = normalize_hex(cell.color)
        if not color_to_index[normalized] then
          table.insert(colors, normalized)
          color_to_index[normalized] = #colors - 1
        end
      end
    end
  end

  return colors, color_to_index
end

local function apply_palette(sprite, colors)
  local palette = Palette(#colors)
  for index, hex in ipairs(colors) do
    local r, g, b, a = hex_to_rgba(hex)
    palette:setColor(index - 1, Color { r = r, g = g, b = b, a = a })
  end
  sprite:setPalette(palette)
end

local function apply_pixel_art_defaults(sprite, payload, json_api)
  pcall(function()
    sprite.gridBounds = Rectangle(0, 0, 1, 1)
  end)
  pcall(function()
    app.preferences.tool("pencil").pixel_perfect = true
  end)
  pcall(function()
    app.preferences.tool("line").pixel_perfect = true
  end)
  pcall(function()
    sprite.data = json_api.encode({
      bridge = "foundry-aseprite",
      colorMode = "indexed",
      paletteLocked = true,
      paletteSource = payload.palette or {},
      pixelPerfect = true,
      grid = { width = 1, height = 1 },
    })
  end)
end

local function put_cell(image, cell, color_to_index)
  local x = math.floor(tonumber(cell.x) or 0)
  local y = math.floor(tonumber(cell.y) or 0)
  if x < 0 or y < 0 or x >= image.width or y >= image.height then return end
  local color_index = color_to_index[normalize_hex(cell.color)] or 0
  image:putPixel(x, y, color_index)
end

local function layer_metadata(payload, layer_data)
  return {
    bridge = "foundry-aseprite",
    bridgeLua = BRIDGE_VERSION,
    sourceMeta = payload.meta or {},
    layerName = layer_data.name or "Layer",
    role = layer_data.role or nil,
    editable = layer_data.editable,
  }
end

local function set_layer_data(layer, metadata, json_api)
  pcall(function()
    layer.data = json_api.encode(metadata)
  end)
end

local function import_payload(payload, json_api)
  if type(payload) ~= "table" then fail("Payload root must be a JSON object.") end
  local width = math.floor(tonumber(payload.width) or 0)
  local height = math.floor(tonumber(payload.height) or 0)
  if width <= 0 or height <= 0 then fail("Payload width/height must be positive.") end
  if type(payload.frames) ~= "table" or #payload.frames == 0 then fail("Payload must contain at least one frame.") end

  local sprite = Sprite(width, height, ColorMode.INDEXED)
  sprite.filename = tostring((payload.meta and payload.meta.id) or "foundry-import") .. ".aseprite"
  clear_default_layers(sprite)
  ensure_frames(sprite, #payload.frames)
  local palette_colors, color_to_index = build_locked_palette(payload)
  apply_palette(sprite, palette_colors)
  apply_pixel_art_defaults(sprite, payload, json_api)

  for frame_index, frame_data in ipairs(payload.frames) do
    local frame = sprite.frames[frame_index]
    if frame_data.duration then
      pcall(function()
        frame.duration = tonumber(frame_data.duration) / 1000
      end)
    end

    for _, layer_data in ipairs(frame_data.layers or {}) do
      local layer = sprite:newLayer()
      layer.name = tostring(layer_data.name or "Foundry Layer")
      pcall(function()
        layer.opacity = math.max(0, math.min(255, math.floor(tonumber(layer_data.opacity) or 255)))
      end)
      pcall(function()
        layer.isVisible = layer_data.visible ~= false
      end)
      pcall(function()
        layer.isEditable = layer_data.editable ~= false
      end)
      set_layer_data(layer, layer_metadata(payload, layer_data), json_api)

      local image = Image(width, height, ColorMode.INDEXED)
      image:clear()
      for _, cell in ipairs(layer_data.cells or {}) do
        put_cell(image, cell, color_to_index)
      end
      sprite:newCel(layer, frame, image, Point(0, 0))
    end
  end

  app.activeSprite = sprite
  app.refresh()
  app.alert("Imported Foundry JSON into Aseprite layers.\nBridge: " .. BRIDGE_VERSION)
end

local json_api = ensure_json()
local dlg = Dialog { title = "Import Foundry JSON" }
dlg:file {
  id = "path",
  label = "Foundry JSON",
  open = true,
  filetypes = { "json" },
}
dlg:button { id = "ok", text = "Import" }
dlg:button { id = "cancel", text = "Cancel" }
dlg:show()

local data = dlg.data
if not data.ok or not data.path or data.path == "" then return end

local payload = json_api.decode(read_file(data.path))
import_payload(payload, json_api)
