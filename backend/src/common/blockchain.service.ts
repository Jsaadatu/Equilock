import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  StacksNetwork, 
  StacksTestnet, 
  StacksMainnet 
} from '@stacks/network';
import { StacksApi } from '@stacks/blockchain-api-client';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly network: StacksNetwork;
  private readonly api: StacksApi;

  constructor(private configService: ConfigService) {
    const environment = this.configService.get('NODE_ENV', 'development');
    this.network = environment === 'production' 
      ? new StacksMainnet() 
      : new StacksTestnet();
    
    this.api = new StacksApi({ url: this.network.coreApiUrl });
    this.logger.log(`Blockchain service initialized for ${environment} network`);
  }

  getNetwork(): StacksNetwork {
    return this.network;
  }

  getApi(): StacksApi {
    return this.api;
  }

  async getCurrentBlockHeight(): Promise<number> {
    try {
      const info = await this.api.getBlockList({ limit: 1 });
      return info.results[0]?.height || 0;
    } catch (error) {
      this.logger.error('Failed to get current block height', error);
      return 0;
    }
  }

  async getAccountInfo(address: string): Promise<any> {
    try {
      return await this.api.getAccountInfo({ principal: address });
    } catch (error) {
      this.logger.error(`Failed to get account info for ${address}`, error);
      throw error;
    }
  }

  async getContractInfo(contractAddress: string, contractName: string): Promise<any> {
    try {
      return await this.api.getContractById({ 
        contractId: `${contractAddress}.${contractName}` 
      });
    } catch (error) {
      this.logger.error(`Failed to get contract info for ${contractAddress}.${contractName}`, error);
      throw error;
    }
  }
}
