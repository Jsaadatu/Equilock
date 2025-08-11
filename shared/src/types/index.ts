// Shared TypeScript types for EquiLock platform

export interface User {
  id: string;
  email: string;
  kycStatus: KycStatus;
  walletAddress?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export enum KycStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum UserRole {
  INVESTOR = 'investor',
  ISSUER = 'issuer',
  OPERATOR = 'operator',
  ADMIN = 'admin',
}

export interface EquityToken {
  id: string;
  contractAddress: string;
  symbol: string;
  name: string;
  totalSupply: number;
  issuerId: string;
  legalDocumentHash: string;
  complianceRules: ComplianceRule[];
  createdAt: Date;
}

export interface ComplianceRule {
  type: 'whitelist' | 'holding_period' | 'transfer_restriction';
  parameters: Record<string, any>;
}

export interface Trade {
  id: string;
  tokenId: string;
  sellerId: string;
  buyerId: string;
  amount: number;
  price: number;
  status: TradeStatus;
  transactionHash?: string;
  createdAt: Date;
  settledAt?: Date;
}

export enum TradeStatus {
  PENDING = 'pending',
  EXECUTED = 'executed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

// New types for token issuance workflow
export interface TokenIssuanceRequest {
  recipient: string;
  amount: string;
  legalDocumentHash: string;
}

export interface KycUpdateRequest {
  userAddress: string;
  status: string;
  tier: number;
  expiresAt?: number;
}

export interface WhitelistRequest {
  userAddress: string;
  approved: boolean;
}

export interface DividendDeclarationRequest {
  totalAmount: string;
  paymentDeadline: number;
}

export interface ContractCallResult {
  success: boolean;
  txOptions?: any;
  error?: string;
  estimatedFee?: number;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  maxSupply: string;
  issuanceActive: boolean;
  legalDocumentHash: string;
  issuerName: string;
  holdingPeriod: number;
  contractOwner: string;
  tokenUri?: string;
}

export interface IssuanceRecord {
  id: string;
  recipient: string;
  amount: string;
  issuedAt: Date;
  legalDocumentHash: string;
  vestingSchedule?: number;
}

export interface KycApplication {
  userId: string;
  walletAddress: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  investorType: 'retail' | 'accredited' | 'institutional';
  complianceQuestions: {
    isPoliticallyExposed: boolean;
    hasCriminalHistory: boolean;
    isUSPerson: boolean;
    acceptsTerms: boolean;
  };
}

export interface TransactionStatus {
  txId: string;
  status: string;
  result?: any;
  blockHeight?: number;
  blockHash?: string;
  fee?: number;
}