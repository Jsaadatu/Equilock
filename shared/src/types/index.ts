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