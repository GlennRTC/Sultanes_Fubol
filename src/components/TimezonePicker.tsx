import { useEffect } from 'react';

export const STORAGE_KEY = 'fubol_timezone';

export const SUPPORTED_TIMEZONES = [
  { label: 'México (Centro)',     iana: 'America/Mexico_City' },
  { label: 'México (Pacífico)',   iana: 'America/Mazatlan' },
  { label: 'México (Cancún)',     iana: 'America/Cancun' },
  { label: 'Colombia',            iana: 'America/Bogota' },
  { label: 'Perú',                iana: 'America/Lima' },
  { label: 'Ecuador',             iana: 'America/Guayaquil' },
  { label: 'Venezuela',           iana: 'America/Caracas' },
  { label: 'Bolivia',             iana: 'America/La_Paz' },
  { label: 'Chile',               iana: 'America/Santiago' },
  { label: 'Argentina / Uruguay', iana: 'America/Argentina/Buenos_Aires' },
  { label: 'Paraguay',            iana: 'America/Asuncion' },
  { label: 'Cuba',                iana: 'America/Havana' },
  { label: 'España (Península)',  iana: 'Europe/Madrid' },
  { label: 'España (Canarias)',   iana: 'Atlantic/Canary' },
  { label: 'UTC',                 iana: 'UTC' },
];

const SUPPORTED_IANA_SET = new Set(SUPPORTED_TIMEZONES.map((t) => t.iana));

// Reads localStorage first; falls back to browser timezone if supported; defaults to UTC (D-14, D-15, Pitfall 8)
export function detectTimezone(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_IANA_SET.has(stored)) return stored;
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (SUPPORTED_IANA_SET.has(detected)) return detected;
  return 'UTC';
}

// Persists the selected timezone to localStorage
export function saveTimezone(iana: string): void {
  localStorage.setItem(STORAGE_KEY, iana);
}

interface TimezonePickerProps {
  current: string;
  onSelect: (iana: string) => void;
  onClose: () => void;
}

// Centered modal overlay with 15 timezone options (UI-SPEC §Timezone Picker)
export function TimezonePicker({ current, onSelect, onClose }: TimezonePickerProps) {
  // Close on Escape key (UI-SPEC accessibility)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 w-full max-w-[320px]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-bold text-zinc-300 mb-3">Selecciona tu zona horaria</p>
        <div className="flex flex-col">
          {SUPPORTED_TIMEZONES.map(({ label, iana }) => (
            <button
              key={iana}
              type="button"
              onClick={() => {
                onSelect(iana);
                onClose();
              }}
              className={`w-full text-left px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800 rounded-lg min-h-[44px]${
                current === iana ? ' bg-zinc-800' : ''
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
