const statItems = [
  { value: '5', label: 'Navázaných modulů' },
  { value: '1', label: 'Sdílená garáž aut' },
  { value: 'Opus 4.6', label: 'Jediný aktivní model' },
  { value: 'Zdarma', label: 'Zkušební režim B2B' }
];

export default function Stats() {
  return (
    <section className="bg-brand-900 py-16 md:py-24" id="cenik">
      <div className="mx-auto max-w-300 px-6 md:px-12">
        <h2 className="sr-only">Klíčové metriky AutoAI</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {statItems.map((item) => (
            <div key={item.label}>
              <p className="text-[32px] font-medium tracking-[-0.02em] text-white md:text-[36px]">{item.value}</p>
              <p className="mt-2 text-[15px] leading-[1.6] text-brand-100">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}