export default function HomePage() {
  return (
    <main
      aria-label="Kota Maskot"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        overflow: "hidden",
        background: "#e9b58e",
      }}
    >
      <iframe
        title="Kota Maskot — NOVARIA 3D World"
        src="/kota-maskot-world.html"
        allow="fullscreen"
        referrerPolicy="same-origin"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          border: 0,
          overflow: "hidden",
        }}
      />
    </main>
  );
}
