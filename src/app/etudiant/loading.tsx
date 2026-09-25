export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-12 h-12 border-4 border-gray-200 dark:border-slate-600 border-t-emerald-500 rounded-full animate-spin"></div>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-4 font-bold">Chargement...</p>
    </div>
  );
}