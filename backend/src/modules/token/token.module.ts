import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TokenService } from './token.service';
import { TokenResolver } from './token.resolver';
import { KycService } from './kyc.service';
import { BlockchainService } from '../common/blockchain.service';

@Module({
  imports: [ConfigModule],
  providers: [TokenService, TokenResolver, KycService, BlockchainService],
  exports: [TokenService, KycService],
})
export class TokenModule {}
