'use client';

import { useState, useEffect } from 'react';
import { 
  UserSession, 
  AppConfig,
  showConnect,
  openContractCall,
  showSignMessage 
} from '@stacks/connect';
import { StacksTestnet, StacksMainnet } from '@stacks/network';
import { 
  makeContractCall,
  AnchorMode,
  PostConditionMode,
  stringAsciiCV,
  uintCV,
  principalCV,
  someCV,
  noneCV,
  boolCV
} from '@stacks/transactions';

// Configure the app
const appConfig = new AppConfig(['store_write', 'publish_data']);

export function useStacksConnection() {
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState(new StacksTestnet());

  useEffect(() => {
    const session = new UserSession({ appConfig });
    setUserSession(session);
    
    if (session.isUserSignedIn()) {
      setIsConnected(true);
      const userData = session.loadUserData();
      setUserAddress(userData.profile.stxAddress.testnet);
    }
  }, []);

  const connectWallet = () => {
    showConnect({
      appDetails: {
        name: 'EquiLock',
        icon: window.location.origin + '/logo.png',
      },
      redirectTo: window.location.origin,
      onFinish: () => {
        window.location.reload();
      },
      userSession,
    });
  };

  const disconnectWallet = () => {
    if (userSession) {
      userSession.signUserOut();
      setIsConnected(false);
      setUserAddress(null);
      window.location.reload();
    }
  };

  const switchNetwork = (isMainnet: boolean) => {
    setNetwork(isMainnet ? new StacksMainnet() : new StacksTestnet());
  };

  return {
    userSession,
    isConnected,
    userAddress,
    network,
    connectWallet,
    disconnectWallet,
    switchNetwork,
  };
}
