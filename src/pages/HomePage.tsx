import { useAuthStore } from '../store/authStore';

// Placeholder home page — replaced by /calendario in Phase 2 (D-14)
export function HomePage() {
  const { profile } = useAuthStore();

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-zinc-100">
          Bienvenido, {profile?.username}
        </h1>
      </div>
    </div>
  );
}
