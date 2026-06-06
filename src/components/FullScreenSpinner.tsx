// Full-screen loading spinner shown while auth session resolves on page load (D-10)
export function FullScreenSpinner() {
  return (
    <div
      className="min-h-screen w-full bg-slate-900 flex items-center justify-center"
      role="status"
      aria-label="Cargando…"
    >
      <div className="w-10 h-10 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
    </div>
  );
}
