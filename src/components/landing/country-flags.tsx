const FLAGS: { code: string; name: string }[] = [
  { code: "gb", name: "UK" },
  { code: "jp", name: "Japan" },
  { code: "kr", name: "Korea" },
  { code: "sg", name: "Singapore" },
  { code: "my", name: "Malaysia" },
  { code: "id", name: "Indonesia" },
  { code: "ph", name: "Philippines" },
  { code: "in", name: "India" },
  { code: "pk", name: "Pakistan" },
  { code: "ae", name: "UAE" },
  { code: "za", name: "S. Africa" },
  { code: "sa", name: "Saudi" },
  { code: "az", name: "Azerbaijan" },
  { code: "tr", name: "Turkey" },
  { code: "bb", name: "Barbados" },
  { code: "es", name: "Spain" },
  { code: "br", name: "Brazil" },
  { code: "dk", name: "Denmark" },
];

export function CountryFlags({ className }: { className?: string }) {
  return (
    <div className={className}>
      {FLAGS.map(({ code, name }) => (
        <span
          key={code}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink/80"
        >
          {/* SVG files from country-flag-icons — Windows cannot render emoji flags */}
          <img
            src={`/flags/${code}.svg`}
            alt=""
            width={28}
            height={19}
            className="h-[19px] w-7 shrink-0 rounded-[2px] border border-black/10 object-cover"
          />
          {name}
        </span>
      ))}
    </div>
  );
}
