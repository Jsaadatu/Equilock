import { Resolver, Query, Mutation, Args, Field, ObjectType, InputType, Int } from '@nestjs/graphql';
import { TokenService } from './token.service';
import { KycService } from './kyc.service';
import { UseGuards } from '@nestjs/common';

// GraphQL Types
@ObjectType()
export class TokenInfo {
  @Field()
  name: string;

  @Field()
  symbol: string;

  @Field()
  decimals: number;

  @Field()
  totalSupply: string;

  @Field()
  maxSupply: string;

  @Field()
  issuanceActive: boolean;

  @Field()
  legalDocumentHash: string;

  @Field()
  issuerName: string;

  @Field()
  holdingPeriod: number;

  @Field()
  contractOwner: string;

  @Field({ nullable: true })
  tokenUri?: string;
}

@ObjectType()
export class KycStatusInfo {
  @Field()
  status: string;

  @Field({ nullable: true })
  approvedAt?: number;

  @Field({ nullable: true })
  expiresAt?: number;

  @Field()
  tier: number;
}

@ObjectType()
export class WhitelistInfo {
  @Field()
  approved: boolean;

  @Field()
  addedAt: number;

  @Field()
  addedBy: string;
}

@ObjectType()
export class TransferRestrictionInfo {
  @Field()
  canTransfer: boolean;

  @Field()
  holdingPeriodEnd: number;

  @Field()
  lastTransfer: number;
}

@ObjectType()
export class IssuanceInfo {
  @Field()
  id: string;

  @Field()
  recipient: string;

  @Field()
  amount: string;

  @Field()
  issuedAt: string;

  @Field()
  legalDocumentHash: string;

  @Field({ nullable: true })
  vestingSchedule?: number;
}

@ObjectType()
export class DividendInfo {
  @Field()
  id: number;

  @Field()
  totalAmount: string;

  @Field()
  perTokenAmount: string;

  @Field()
  declaredAt: number;

  @Field()
  paymentDeadline: number;

  @Field({ nullable: true })
  paymentToken?: string;
}

@ObjectType()
export class TransactionResult {
  @Field()
  success: boolean;

  @Field({ nullable: true })
  txId?: string;

  @Field({ nullable: true })
  error?: string;

  @Field({ nullable: true })
  estimatedFee?: number;
}

@ObjectType()
export class AccountSummary {
  @Field()
  address: string;

  @Field()
  balance: string;

  @Field({ nullable: true })
  kycStatus?: KycStatusInfo;

  @Field({ nullable: true })
  whitelistStatus?: WhitelistInfo;

  @Field({ nullable: true })
  transferRestrictions?: TransferRestrictionInfo;

  @Field()
  canTransferTokens: boolean;
}

// Input Types
@InputType()
export class TokenIssuanceInput {
  @Field()
  recipient: string;

  @Field()
  amount: string;

  @Field()
  legalDocumentHash: string;
}

@InputType()
export class BatchIssuanceRecipient {
  @Field()
  recipient: string;

  @Field()
  amount: string;
}

@InputType()
export class BatchTokenIssuanceInput {
  @Field(() => [BatchIssuanceRecipient])
  recipients: BatchIssuanceRecipient[];

  @Field()
  legalDocumentHash: string;
}

@InputType()
export class KycUpdateInput {
  @Field()
  userAddress: string;

  @Field()
  status: string;

  @Field()
  tier: number;

  @Field({ nullable: true })
  expiresAt?: number;
}

@InputType()
export class WhitelistUpdateInput {
  @Field()
  userAddress: string;

  @Field()
  approved: boolean;
}

@InputType()
export class DividendDeclarationInput {
  @Field()
  totalAmount: string;

  @Field()
  paymentDeadline: number;
}

@Resolver()
export class TokenResolver {
  constructor(
    private readonly tokenService: TokenService,
    private readonly kycService: KycService,
  ) {}

  // Queries
  @Query(() => TokenInfo)
  async tokenInfo(): Promise<TokenInfo> {
    return await this.tokenService.getTokenInfo();
  }

  @Query(() => String)
  async tokenBalance(@Args('address') address: string): Promise<string> {
    return await this.tokenService.getBalance(address);
  }

  @Query(() => Boolean)
  async canTransfer(
    @Args('sender') sender: string,
    @Args('recipient') recipient: string,
    @Args('amount') amount: string,
  ): Promise<boolean> {
    return await this.tokenService.canTransfer(sender, recipient, amount);
  }

  @Query(() => KycStatusInfo, { nullable: true })
  async kycStatus(@Args('address') address: string): Promise<KycStatusInfo | null> {
    const result = await this.tokenService.getKycStatus(address);
    return result ? {
      status: result.status,
      approvedAt: result['approved-at'],
      expiresAt: result['expires-at'],
      tier: result.tier
    } : null;
  }

  @Query(() => WhitelistInfo, { nullable: true })
  async whitelistStatus(@Args('address') address: string): Promise<WhitelistInfo | null> {
    const result = await this.tokenService.getWhitelistStatus(address);
    return result ? {
      approved: result.approved,
      addedAt: result['added-at'],
      addedBy: result['added-by']
    } : null;
  }

  @Query(() => TransferRestrictionInfo, { nullable: true })
  async transferRestrictions(@Args('address') address: string): Promise<TransferRestrictionInfo | null> {
    const result = await this.tokenService.getTransferRestrictions(address);
    return result ? {
      canTransfer: result['can-transfer'],
      holdingPeriodEnd: result['holding-period-end'],
      lastTransfer: result['last-transfer']
    } : null;
  }

  @Query(() => IssuanceInfo, { nullable: true })
  async issuanceDetails(@Args('issuanceId', { type: () => Int }) issuanceId: number): Promise<IssuanceInfo | null> {
    const result = await this.tokenService.getIssuanceDetails(issuanceId);
    return result ? {
      id: result.id,
      recipient: result.recipient,
      amount: result.amount,
      issuedAt: result.issuedAt.toISOString(),
      legalDocumentHash: result.legalDocumentHash,
      vestingSchedule: result.vestingSchedule
    } : null;
  }

  @Query(() => DividendInfo, { nullable: true })
  async dividendDistribution(@Args('distributionId', { type: () => Int }) distributionId: number): Promise<DividendInfo | null> {
    const result = await this.tokenService.getDividendDistribution(distributionId);
    return result ? {
      id: distributionId,
      totalAmount: result['total-amount'].toString(),
      perTokenAmount: result['per-token-amount'].toString(),
      declaredAt: result['declared-at'],
      paymentDeadline: result['payment-deadline'],
      paymentToken: result['payment-token']
    } : null;
  }

  @Query(() => AccountSummary)
  async accountSummary(@Args('address') address: string): Promise<AccountSummary> {
    const [balance, kycStatus, whitelistStatus, transferRestrictions] = await Promise.all([
      this.tokenService.getBalance(address),
      this.tokenService.getKycStatus(address),
      this.tokenService.getWhitelistStatus(address),
      this.tokenService.getTransferRestrictions(address)
    ]);

    // Check if user can transfer tokens (basic check)
    const canTransferTokens = await this.tokenService.canTransfer(address, address, '1');

    return {
      address,
      balance,
      kycStatus: kycStatus ? {
        status: kycStatus.status,
        approvedAt: kycStatus['approved-at'],
        expiresAt: kycStatus['expires-at'],
        tier: kycStatus.tier
      } : null,
      whitelistStatus: whitelistStatus ? {
        approved: whitelistStatus.approved,
        addedAt: whitelistStatus['added-at'],
        addedBy: whitelistStatus['added-by']
      } : null,
      transferRestrictions: transferRestrictions ? {
        canTransfer: transferRestrictions['can-transfer'],
        holdingPeriodEnd: transferRestrictions['holding-period-end'],
        lastTransfer: transferRestrictions['last-transfer']
      } : null,
      canTransferTokens
    };
  }

  // Mutations (Administrative functions)
  @Mutation(() => TransactionResult)
  async issueTokens(@Args('input') input: TokenIssuanceInput): Promise<TransactionResult> {
    const result = await this.tokenService.prepareTokenIssuance({
      recipient: input.recipient,
      amount: input.amount,
      legalDocumentHash: input.legalDocumentHash
    });

    return {
      success: result.success,
      error: result.error,
      estimatedFee: result.estimatedFee
    };
  }

  @Mutation(() => TransactionResult)
  async batchIssueTokens(@Args('input') input: BatchTokenIssuanceInput): Promise<TransactionResult> {
    const result = await this.tokenService.prepareBatchTokenIssuance(
      input.recipients,
      input.legalDocumentHash
    );

    return {
      success: result.success,
      error: result.error,
      estimatedFee: result.estimatedFee
    };
  }

  @Mutation(() => TransactionResult)
  async updateKycStatus(@Args('input') input: KycUpdateInput): Promise<TransactionResult> {
    const result = await this.tokenService.prepareKycUpdate({
      userAddress: input.userAddress,
      status: input.status,
      tier: input.tier,
      expiresAt: input.expiresAt
    });

    return {
      success: result.success,
      error: result.error,
      estimatedFee: result.estimatedFee
    };
  }

  @Mutation(() => TransactionResult)
  async updateWhitelist(@Args('input') input: WhitelistUpdateInput): Promise<TransactionResult> {
    const result = await this.tokenService.prepareWhitelistUpdate({
      userAddress: input.userAddress,
      approved: input.approved
    });

    return {
      success: result.success,
      error: result.error,
      estimatedFee: result.estimatedFee
    };
  }

  @Mutation(() => TransactionResult)
  async declareDividend(@Args('input') input: DividendDeclarationInput): Promise<TransactionResult> {
    const result = await this.tokenService.prepareDividendDeclaration({
      totalAmount: input.totalAmount,
      paymentDeadline: input.paymentDeadline
    });

    return {
      success: result.success,
      error: result.error,
      estimatedFee: result.estimatedFee
    };
  }

  @Mutation(() => TransactionResult)
  async toggleIssuance(@Args('active') active: boolean): Promise<TransactionResult> {
    const result = await this.tokenService.prepareToggleIssuance(active);

    return {
      success: result.success,
      error: result.error,
      estimatedFee: result.estimatedFee
    };
  }

  @Query(() => String)
  async transactionStatus(@Args('txId') txId: string): Promise<string> {
    const status = await this.tokenService.getTransactionStatus(txId);
    return JSON.stringify(status);
  }

  @Query(() => [String])
  async accountTransactions(
    @Args('address') address: string,
    @Args('limit', { type: () => Int, defaultValue: 50 }) limit: number
  ): Promise<string[]> {
    const transactions = await this.tokenService.getAccountTokenTransactions(address, limit);
    return transactions.map(tx => JSON.stringify(tx));
  }
}
