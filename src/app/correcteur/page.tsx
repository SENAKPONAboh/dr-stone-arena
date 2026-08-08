export default function CorrecteurDashboard() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Dashboard Correcteur</h1>
        <a href="/api/auth/logout">
          <button className="mt-8 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
            Se déconnecter
          </button>
        </a>
      </div>
    </div>
  );
}