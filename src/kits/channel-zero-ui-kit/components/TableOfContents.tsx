export type TocItem = {
  href: string;
  label: string;
};

export type TableOfContentsProps = {
  items: TocItem[];
};

export function TableOfContents({ items }: TableOfContentsProps) {
  return (
    <aside className="cz-toc" aria-label="Article table of contents">
      <p className="cz-toc__title">Signal Map</p>
      {items.map((item) => (
        <a key={item.href} href={item.href}>
          {item.label}
        </a>
      ))}
    </aside>
  );
}
