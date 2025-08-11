import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  StacksNetwork, 
  StacksTestnet, 
  StacksMainnet 
} from '@stacks/network';
import { 
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  makeStandardSTXPostCondition,
  FungibleConditionCode,
  createAssetInfo,
  makeStandardFungiblePostCondition,
} from '@stacks/transactions';
import { 
  callReadOnlyFunction,
  cvToJSON,
  uintCV,
  principalCV,
  stringAsciiCV,
  stringUtf8CV,
  someCV,
  noneCV,
  listCV,
  tupleCV,
  boolCV
} from '@stacks/transactions';
import { StacksApi } from '@stacks/blockchain-api-client';
import { 
  TokenIssuanceRequest,
  KycUpdateRequest,
  WhitelistRequest,
  DividendDeclarationRequest,
  ContractCallResult,
  TokenInfo,
  IssuanceRecord,
  KycStatus as KycStatusEnum
} from '../../shared/types';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly network: StacksNetwork;
  private readonly api: StacksApi;
  private readonly contractAddress: string;
  private readonly contractName: string = 'equity-token';

  constructor(private configService: ConfigService) {
    const environment = this.configService.get('NODE_ENV', 'development');
    this.network = environment === 'production' 
      ? new StacksMainnet() 
      : new StacksTestnet();
    
    this.api = new StacksApi({ url: this.network.coreApiUrl });
    this.contractAddress = this.configService.get('STACKS_CONTRACT_ADDRESS');
  }

  /**
   * Get basic token information
   */
  async getTokenInfo(): Promise<TokenInfo> {
    try {
      const contractInfo = await this.callReadOnlyFunction('get-contract-info', []);
      const tokenUri = await this.callReadOnlyFunction('get-token-uri', []);
      
      return {
        name: contractInfo.name,
        symbol: contractInfo.symbol,
        decimals: contractInfo.decimals,
        totalSupply: contractInfo['total-supply'],
        maxSupply: contractInfo['max-supply'],
        issuanceActive: contractInfo['issuance-active'],
        legalDocumentHash: contractInfo['legal-document-hash'],
        issuerName: contractInfo['issuer-name'],
        holdingPeriod: contractInfo['holding-period'],
        contractOwner: contractInfo['contract-owner'],
        tokenUri: tokenUri || null
      };
    } catch (error) {
      this.logger.error('Failed to get token info', error);
      throw new Error('Failed to retrieve token information');
    }
  }

  /**
   * Get token balance for a specific address
   */
  async getBalance(address: string): Promise<string> {
    try {
      const result = await this.callReadOnlyFunction('get-balance', [
        principalCV(address)
      ]);
      return result.toString();
    } catch (error) {
      this.logger.error(`Failed to get balance for ${address}`, error);
      throw new Error('Failed to retrieve balance');
    }
  }

  /**
   * Check if a transfer is allowed
   */
  async canTransfer(sender: string, recipient: string, amount: string): Promise<boolean> {
    try {
      const result = await this.callReadOnlyFunction('can-transfer', [
        principalCV(sender),
        principalCV(recipient),
        uintCV(amount)
      ]);
      return result;
    } catch (error) {
      this.logger.error('Failed to check transfer eligibility', error);
      return false;
    }
  }

  /**
   * Get KYC status for an address
   */
  async getKycStatus(address: string): Promise<any> {
    try {
      const result = await this.callReadOnlyFunction('get-kyc-status', [
        principalCV(address)
      ]);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get KYC status for ${address}`, error);
      return null;
    }
  }

  /**
   * Get whitelist status for an address
   */
  async getWhitelistStatus(address: string): Promise<any> {
    try {
      const result = await this.callReadOnlyFunction('get-whitelist-status', [
        principalCV(address)
      ]);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get whitelist status for ${address}`, error);
      return null;
    }
  }

  /**
   * Get issuance details by ID
   */
  async getIssuanceDetails(issuanceId: number): Promise<IssuanceRecord | null> {
    try {
      const result = await this.callReadOnlyFunction('get-issuance-details', [
        uintCV(issuanceId)
      ]);
      
      if (!result) return null;
      
      return {
        id: issuanceId.toString(),
        recipient: result.recipient,
        amount: result.amount.toString(),
        issuedAt: new Date(result['issued-at'] * 1000),
        legalDocumentHash: result['legal-doc-hash'],
        vestingSchedule: result['vesting-schedule'] || null
      };
    } catch (error) {
      this.logger.error(`Failed to get issuance details for ID ${issuanceId}`, error);
      return null;
    }
  }

  /**
   * Get transfer restrictions for an address
   */
  async getTransferRestrictions(address: string): Promise<any> {
    try {
      const result = await this.callReadOnlyFunction('get-transfer-restrictions', [
        principalCV(address)
      ]);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get transfer restrictions for ${address}`, error);
      return null;
    }
  }

  /**
   * Get dividend distribution details
   */
  async getDividendDistribution(distributionId: number): Promise<any> {
    try {
      const result = await this.callReadOnlyFunction('get-dividend-distribution', [
        uintCV(distributionId)
      ]);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get dividend distribution ${distributionId}`, error);
      return null;
    }
  }

  /**
   * Issue tokens to a recipient (owner only)
   * This method prepares the transaction but doesn't broadcast it
   * Broadcasting should be handled by the client-side with proper signing
   */
  async prepareTokenIssuance(request: TokenIssuanceRequest): Promise<ContractCallResult> {
    try {
      const functionArgs = [
        principalCV(request.recipient),
        uintCV(request.amount),
        stringAsciiCV(request.legalDocumentHash)
      ];

      // Create post-conditions for security
      const postConditions = [
        makeStandardFungiblePostCondition(
          request.recipient,
          FungibleConditionCode.Equal,
          request.amount,
          createAssetInfo(this.contractAddress, this.contractName)
        )
      ];

      const txOptions = {
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'issue-tokens',
        functionArgs,
        network: this.network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Deny,
        postConditions
      };

      this.logger.log(`Prepared token issuance: ${request.amount} tokens to ${request.recipient}`);
      
      return {
        success: true,
        txOptions,
        estimatedFee: 1000 // This should be calculated properly
      };
    } catch (error) {
      this.logger.error('Failed to prepare token issuance', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Prepare batch token issuance
   */
  async prepareBatchTokenIssuance(
    recipients: Array<{ recipient: string; amount: string }>,
    legalDocumentHash: string
  ): Promise<ContractCallResult> {
    try {
      const recipientList = listCV(
        recipients.map(item => 
          tupleCV({
            recipient: principalCV(item.recipient),
            amount: uintCV(item.amount)
          })
        )
      );

      const functionArgs = [
        recipientList,
        stringAsciiCV(legalDocumentHash)
      ];

      const txOptions = {
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'batch-issue-tokens',
        functionArgs,
        network: this.network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow // Batch operations are complex for post-conditions
      };

      this.logger.log(`Prepared batch token issuance for ${recipients.length} recipients`);
      
      return {
        success: true,
        txOptions,
        estimatedFee: 2000 + (recipients.length * 100) // Rough estimation
      };
    } catch (error) {
      this.logger.error('Failed to prepare batch token issuance', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Prepare KYC status update
   */
  async prepareKycUpdate(request: KycUpdateRequest): Promise<ContractCallResult> {
    try {
      const functionArgs = [
        principalCV(request.userAddress),
        stringAsciiCV(request.status),
        uintCV(request.tier),
        request.expiresAt ? someCV(uintCV(request.expiresAt)) : noneCV()
      ];

      const txOptions = {
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'update-kyc-status',
        functionArgs,
        network: this.network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow
      };

      this.logger.log(`Prepared KYC update for ${request.userAddress}: ${request.status}`);
      
      return {
        success: true,
        txOptions,
        estimatedFee: 500
      };
    } catch (error) {
      this.logger.error('Failed to prepare KYC update', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Prepare whitelist update
   */
  async prepareWhitelistUpdate(request: WhitelistRequest): Promise<ContractCallResult> {
    try {
      const functionName = request.approved ? 'add-to-whitelist' : 'remove-from-whitelist';
      const functionArgs = [principalCV(request.userAddress)];

      const txOptions = {
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName,
        functionArgs,
        network: this.network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow
      };

      this.logger.log(`Prepared whitelist update for ${request.userAddress}: ${request.approved}`);
      
      return {
        success: true,
        txOptions,
        estimatedFee: 500
      };
    } catch (error) {
      this.logger.error('Failed to prepare whitelist update', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Prepare dividend declaration
   */
  async prepareDividendDeclaration(request: DividendDeclarationRequest): Promise<ContractCallResult> {
    try {
      const functionArgs = [
        uintCV(request.totalAmount),
        uintCV(request.paymentDeadline)
      ];

      const txOptions = {
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'declare-dividend',
        functionArgs,
        network: this.network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow
      };

      this.logger.log(`Prepared dividend declaration: ${request.totalAmount} total`);
      
      return {
        success: true,
        txOptions,
        estimatedFee: 1000
      };
    } catch (error) {
      this.logger.error('Failed to prepare dividend declaration', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enable or disable token issuance
   */
  async prepareToggleIssuance(active: boolean): Promise<ContractCallResult> {
    try {
      const functionArgs = [boolCV(active)];

      const txOptions = {
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'toggle-issuance',
        functionArgs,
        network: this.network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow
      };

      this.logger.log(`Prepared issuance toggle: ${active}`);
      
      return {
        success: true,
        txOptions,
        estimatedFee: 500
      };
    } catch (error) {
      this.logger.error('Failed to prepare issuance toggle', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Helper method to call read-only functions
   */
  private async callReadOnlyFunction(functionName: string, functionArgs: any[]): Promise<any> {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName,
        functionArgs,
        network: this.network,
        senderAddress: this.contractAddress
      });

      return cvToJSON(result).value;
    } catch (error) {
      this.logger.error(`Failed to call read-only function ${functionName}`, error);
      throw error;
    }
  }

  /**
   * Validate transaction and get status
   */
  async getTransactionStatus(txId: string): Promise<any> {
    try {
      const transaction = await this.api.getTransactionById({ txId });
      return {
        txId,
        status: transaction.tx_status,
        result: transaction.tx_result,
        blockHeight: transaction.block_height,
        blockHash: transaction.block_hash,
        fee: transaction.fee_rate
      };
    } catch (error) {
      this.logger.error(`Failed to get transaction status for ${txId}`, error);
      throw new Error('Failed to retrieve transaction status');
    }
  }

  /**
   * Get account transactions related to the equity token
   */
  async getAccountTokenTransactions(address: string, limit: number = 50): Promise<any[]> {
    try {
      const transactions = await this.api.getAccountTransactions({
        principal: address,
        limit
      });

      // Filter for equity token related transactions
      return transactions.results.filter(tx => 
        tx.tx_type === 'contract_call' &&
        tx.contract_call?.contract_id === `${this.contractAddress}.${this.contractName}`
      );
    } catch (error) {
      this.logger.error(`Failed to get account transactions for ${address}`, error);
      return [];
    }
  }
}
