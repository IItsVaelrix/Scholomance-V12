export const FACTORY_SCROLLS = import.meta.glob('../../../../vst/scholo-candy/golden/factory_scrolls/*.json', { eager: true });

export function getFactoryScrolls() {
  return Object.values(FACTORY_SCROLLS).map((module: any) => module.default || module);
}
