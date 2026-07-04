export const ITEM_DATABASE = {
  'item_helm_void': {
    id: 'item_helm_void',
    assetId: 'VoidIceHelm',
    name: 'Void Ice Helm',
    type: 'head',
    rarity: 'legendary',
    icon: '/assets/items/VoidIceHelm-icon.png',
    sprite: '/assets/items/VoidIceHelm-f0-png.png',
  },
  'item_chest_void': {
    id: 'item_chest_void',
    assetId: 'VoidIceChestplate',
    name: 'Void Ice Chestplate',
    type: 'chest',
    rarity: 'legendary',
    icon: '/assets/items/VoidIceChestplate-icon.png',
    sprite: '/assets/items/VoidIceChestplate-f0-png.png',
  },
  'item_legs_void': {
    id: 'item_legs_void',
    assetId: 'VoidIceLeggings',
    name: 'Void Ice Leggings',
    type: 'legs',
    rarity: 'legendary',
    icon: '/assets/items/VoidIceLeggings-icon.png',
    sprite: '/assets/items/VoidIceLeggings-f0-png.png',
  },
  'item_boots_void': {
    id: 'item_boots_void',
    assetId: 'VoidIceBoots',
    name: 'Void Ice Boots',
    type: 'boots',
    rarity: 'legendary',
    icon: '/assets/items/VoidIceBoots-icon.png',
    sprite: '/assets/items/VoidIceBoots-f0-png.png',
  },
  'item_sword_void': {
    id: 'item_sword_void',
    assetId: 'VoidIceGreatsword',
    name: 'Void Ice Greatsword',
    type: 'weapon',
    slot: 'mainHand',
    rarity: 'legendary',
    icon: '/assets/items/VoidIceGreatsword-icon.png',
    sprite: '/assets/items/VoidIceGreatsword-f0-png.png',
  },
  'item_void_pickaxe': {
    id: 'item_void_pickaxe',
    assetId: 'VoidIceGreatsword',
    name: 'Voidmetal Pickaxe',
    type: 'weapon',
    slot: 'mainHand',
    rarity: 'rare',
    gatherTool: 'pickaxe',
    icon: '/assets/items/VoidIceGreatsword-icon.png',
    sprite: '/assets/items/VoidIceGreatsword-f0-png.png',
  },
  'item_shield_void': {
    id: 'item_shield_void',
    assetId: 'VoidIceShield',
    name: 'Void Ice Aegis',
    type: 'shield',
    slot: 'offHand',
    rarity: 'legendary',
    icon: '/assets/items/VoidIceShield-icon.png',
    sprite: '/assets/items/VoidIceShield-f0-png.png',
  },
  'item_offhand_orb': {
    id: 'item_offhand_orb',
    assetId: 'AmethystFocusOrb',
    name: 'Amethyst Aether Focus',
    type: 'weapon',
    slot: 'offHand',
    holdStyle: 'palmCradle',
    holdAnchor: { x: 19, y: 55 },
    rarity: 'rare',
    icon: '/assets/items/AmethystFocusOrb-icon.png',
    sprite: '/assets/items/AmethystFocusOrb-f0-png.png',
  },
  'item.stormheart-orb': {
    id: 'item.stormheart-orb',
    assetId: 'StormheartOrb',
    name: 'Stormheart Orb',
    type: 'weapon',
    slot: 'offHand',
    holdStyle: 'palmCradle',
    holdAnchor: { x: 19, y: 55 },
    rarity: 'rare',
    school: 'SONIC',
    source: 'tutorial-obelisk',
    description: 'A compact storm-core drawn from the central tutorial obelisk.',
    icon: '/assets/items/StormheartOrb-icon.png',
    sprite: '/assets/items/StormheartOrb-f0-png.png',
    combatModifiers: {
      movementPoints: 1,
    },
  }
};

/**
 * Which hand an item occupies, or null if it is not a hand item.
 * An explicit `slot` wins (lets a weapon be dual-wielded in the off hand);
 * otherwise weapons default to the main hand and shields to the off hand.
 */
export function equipSlotOf(item) {
  if (!item) return null;
  if (item.slot === 'mainHand' || item.slot === 'offHand') return item.slot;
  if (item.type === 'weapon') return 'mainHand';
  if (item.type === 'shield') return 'offHand';
  return null;
}

const HAND_TO_INVENTORY_SLOT = Object.freeze({
  mainHand: 'weapon',
  offHand: 'offhand',
});

/** Maps an item to the inventory overlay equipment slot id (weapon, offhand, head, …). */
export function inventorySlotOf(item, equipped = {}) {
  if (!item) return null;
  const handSlot = equipSlotOf(item);
  if (handSlot) return HAND_TO_INVENTORY_SLOT[handSlot];
  if (item.type === 'ring') return equipped.ring1 ? 'ring2' : 'ring1';
  return item.type;
}
