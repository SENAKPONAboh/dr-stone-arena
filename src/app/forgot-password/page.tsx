export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border-2 border-gray-100 text-center">
        <div className="w-20 h-20 bg-orange-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-orange-200">
          <span className="text-4xl">🔑</span>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-800">Mot de passe oublié</h1>
        <p className="text-gray-500 mt-2 mb-6">
          Pas de panique ! Pour des raisons de sécurité, contactez l'administrateur de votre faculté. 
          Il pourra réinitialiser votre mot de passe manuellement.
        </p>
        <a href="/login" className="inline-block py-3 px-6 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all">
          Retour à la connexion
        </a>
      </div>
    </div>
  );
}