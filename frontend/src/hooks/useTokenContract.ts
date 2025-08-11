'use client';

import { useState } from 'react';
import { 
  callReadOnlyFunction,
  makeContractCall,
  AnchorMode,
  PostConditionMode,
  cvToJSON,
  stringAsciiCV,
  uintCV,
  principalCV,
  someCV,
  noneCV,
  boolCV,
  listCV,
  tupleCV
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import { useStacksConnection } from './useStacksConnection';
import { 
  TokenIssuanceRequest,
  KycUpdateRequest,
  WhitelistRequest,
  DividendDeclarationRequest,
  ContractCallResult,
  TokenInfo
} from '@/shared/types';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const CONTRACT_NAME = 'equity-token';

export function useTokenContract() {
  const [loading, setLoading] = useState(false);
  const { userSession, network, userAddress } = useStacksConnection();

  // Helper function to call read-only functions
  const callReadOnly = async (functionName: string, functionArgs: any[] = []) => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName,
        functionArgs,
        network,
        senderAddress: userAddress || CONTRACT_ADDRESS,
      });
      return cvToJSON(result).value;
    } catch (error) {
      console.error(`Failed to call ${functionName}:`, error);
      throw error;
    }
  };

  // Helper function to prepare contract calls
  const prepareContractCall = async (
    functionName: string, 
    functionArgs: any[], 
    postConditions: any[] = []
  ): Promise<ContractCallResult> => {
    try {
      const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName,
        functionArgs,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        postConditions,
      };

      return {
        success: true,
        txOptions,
        estimatedFee: 1000, // This should be calculated properly
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  };

  // Execute a prepared contract call
  const executeContractCall = async (txOptions: any) => {
    if (!userSession) {
      throw new Error('User session not available');
    }

    return new Promise((resolve, reject) => {
      openContractCall({
        ...txOptions,
        onFinish: (data) => {
          console.log('Transaction broadcasted:', data.txId);
          resolve(data);
        },
        onCancel: () => {
          reject(new Error('Transaction cancelled by user'));
        },
      });
    });
  };

  // Read-only functions
  const getTokenInfo = async (): Promise<TokenInfo> => {
    const result = await callReadOnly('get-contract-info');
    return {
      name: result.name,
      symbol: result.symbol,
      decimals: result.decimals,
      totalSupply: result['total-supply'].toString(),
      maxSupply: result['max-supply'].toString(),
      issuanceActive: result['issuance-active'],
      legalDocumentHash: result['legal-document-hash'],
      issuerName: result['issuer-name'],
      holdingPeriod: result['holding-period'],
      contractOwner: result['contract-owner'],
    };
  };

  const getBalance = async (address: string): Promise<string> => {
    const result = await callReadOnly('get-balance', [principalCV(address)]);
    return result.toString();
  };

  const getKycStatus = async (address: string) => {
    return await callReadOnly('get-kyc-status', [principalCV(address)]);
  };

  const getWhitelistStatus = async (address: string) => {
    return await callReadOnly('get-whitelist-status', [principalCV(address)]);
  };

  const getTransferRestrictions = async (address: string) => {
    return await callReadOnly('get-transfer-restrictions', [principalCV(address)]);
  };

  const canTransfer = async (sender: string, recipient: string, amount: string): Promise<boolean> => {
    const result = await callReadOnly('can-transfer', [
      principalCV(sender),
      principalCV(recipient),
      uintCV(amount),
    ]);
    return result;
  };

  const checkAccountSummary = async (address: string) => {
    try {
      const [balance, kycStatus, whitelistStatus, transferRestrictions] = await Promise.all([
        getBalance(address),
        getKycStatus(address),
        getWhitelistStatus(address),
        getTransferRestrictions(address),
      ]);

      return {
        address,
        balance,
        kycStatus,
        whitelistStatus,
        transferRestrictions,
      };
    } catch (error) {
      console.error('Failed to get account summary:', error);
      return null;
    }
  };

  // Write functions (prepare transactions)
  const issueTokens = async (request: TokenIssuanceRequest): Promise<ContractCallResult> => {
    const functionArgs = [
      principalCV(request.recipient),
      uintCV(request.amount),
      stringAsciiCV(request.legalDocumentHash),
    ];

    return await prepareContractCall('issue-tokens', functionArgs);
  };

  const batchIssueTokens = async (
    recipients: Array<{ recipient: string; amount: string }>,
    legalDocumentHash: string
  ): Promise<ContractCallResult> => {
    const recipientList = listCV(
      recipients.map(item =>
        tupleCV({
          recipient: principalCV(item.recipient),
          amount: uintCV(item.amount),
        })
      )
    );

    const functionArgs = [recipientList, stringAsciiCV(legalDocumentHash)];
    return await prepareContractCall('batch-issue-tokens', functionArgs);
  };

  const updateKycStatus = async (request: KycUpdateRequest): Promise<ContractCallResult> => {
    const functionArgs = [
      principalCV(request.userAddress),
      stringAsciiCV(request.status),
      uintCV(request.tier),
      request.expiresAt ? someCV(uintCV(request.expiresAt)) : noneCV(),
    ];

    return await prepareContractCall('update-kyc-status', functionArgs);
  };

  const updateWhitelist = async (request: WhitelistRequest): Promise<ContractCallResult> => {
    const functionName = request.approved ? 'add-to-whitelist' : 'remove-from-whitelist';
    const functionArgs = [principalCV(request.userAddress)];

    return await prepareContractCall(functionName, functionArgs);
  };

  const declareDividend = async (request: DividendDeclarationRequest): Promise<ContractCallResult> => {
    const functionArgs = [
      uintCV(request.totalAmount),
      uintCV(request.paymentDeadline),
    ];

    return await prepareContractCall('declare-dividend', functionArgs);
  };

  const toggleIssuance = async (active: boolean): Promise<ContractCallResult> => {
    const functionArgs = [boolCV(active)];
    return await prepareContractCall('toggle-issuance', functionArgs);
  };

  const transferTokens = async (
    amount: string,
    recipient: string,
    memo?: string
  ): Promise<ContractCallResult> => {
    const functionArgs = [
      uintCV(amount),
      principalCV(userAddress!),
      principalCV(recipient),
      memo ? someCV(stringAsciiCV(memo)) : noneCV(),
    ];

    return await prepareContractCall('transfer', functionArgs);
  };

  return {
    loading,
    // Read-only functions
    getTokenInfo,
    getBalance,
    getKycStatus,
    getWhitelistStatus,
    getTransferRestrictions,
    canTransfer,
    checkAccountSummary,
    // Write functions
    issueTokens,
    batchIssueTokens,
    updateKycStatus,
    updateWhitelist,
    declareDividend,
    toggleIssuance,
    transferTokens,
    // Utility functions
    executeContractCall,
  };
}
