'use client';

import TokenIssuanceDashboard from '@/components/TokenIssuanceDashboard';
import { useStacksConnection } from '@/hooks/useStacksConnection';

export default function Home() {
  const { isConnected, connectWallet, userAddress } = useStacksConnection();

  if (!isConnected) {
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
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto mb-8">
              <h2 className="text-2xl font-semibold mb-4">Platform Features</h2>
              <ul className="text-left space-y-2 text-gray-700">
                <li>• Tokenized equity shares with legal binding</li>
                <li>• Compliant secondary market trading</li>
                <li>• KYC/AML integration and whitelist management</li>
                <li>• On-chain governance and voting</li>
                <li>• Dividend distribution</li>
                <li>• EU DLT Pilot Regime compliance</li>
                <li>• Real-time transaction monitoring</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
              <h3 className="text-lg font-semibold mb-4">Get Started</h3>
              <p className="text-gray-600 mb-6">
                Connect your Stacks wallet to access the token issuance dashboard and start managing tokenized equity.
              </p>
              <button
                onClick={connectWallet}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Connect Stacks Wallet
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">EquiLock Platform</h1>
              <p className="text-gray-600">Tokenized Private Equity Management</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Connected Wallet</p>
                <p className="font-mono text-sm">{userAddress}</p>
              </div>
              <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                <div className="h-3 w-3 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <TokenIssuanceDashboard className="py-8" />
    </main>
  );
}