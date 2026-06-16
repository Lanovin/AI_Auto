export default function BackgroundDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute left-1/2 -top-40 h-120 w-170 -translate-x-1/2 rounded-full blur-[160px]"
        style={{
          opacity: 0.18,
          background: 'radial-gradient(ellipse at center, rgba(37, 99, 235, 0.28), rgba(37, 99, 235, 0) 60%)',
        }}
      />
    </div>
  );
}
