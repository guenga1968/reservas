export default function Loading({ text = 'Cargando...' }: { text?: string }) {
  return (
    <div role="status" className="flex items-center justify-center py-8 gap-2 text-gray-600">
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span>{text}</span>
    </div>
  );
}
