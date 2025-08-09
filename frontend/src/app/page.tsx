export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to EquiLock
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Tokenized Private Equity Trading on Stacks Blockchain
          </p>
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4">Platform Features</h2>
            <ul className="text-left space-y-2 text-gray-700">
              <li>• Tokenized equity shares with legal binding</li>
              <li>• Compliant secondary market trading</li>
              <li>• KYC/AML integration</li>
              <li>• On-chain governance and voting</li>
              <li>• Dividend distribution</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}