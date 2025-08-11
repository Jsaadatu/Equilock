import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface KycProvider {
  verifyIdentity(documentData: any): Promise<KycVerificationResult>;
  getKycStatus(userId: string): Promise<KycStatusResponse>;
}

export interface KycVerificationResult {
  success: boolean;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  tier: number; // 1=retail, 2=accredited, 3=institutional
  expiresAt?: Date;
  reasons?: string[];
  score?: number;
}

export interface KycStatusResponse {
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  tier: number;
  approvedAt?: Date;
  expiresAt?: Date;
  lastUpdated: Date;
}

export interface DocumentUpload {
  type: 'passport' | 'driver_license' | 'national_id' | 'proof_of_address' | 'bank_statement';
  file: Buffer;
  fileName: string;
  mimeType: string;
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
  documents: DocumentUpload[];
  investorType: 'retail' | 'accredited' | 'institutional';
  financialInfo?: {
    annualIncome?: number;
    netWorth?: number;
    investmentExperience?: string;
    employmentStatus?: string;
  };
  complianceQuestions: {
    isPoliticallyExposed: boolean;
    hasCriminalHistory: boolean;
    isUSPerson: boolean;
    acceptsTerms: boolean;
  };
}

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  private readonly kycProvider: KycProvider;

  constructor(private configService: ConfigService) {
    // Initialize KYC provider based on configuration
    const providerName = this.configService.get('KYC_PROVIDER', 'mock');
    this.kycProvider = this.createKycProvider(providerName);
  }

  /**
   * Submit a new KYC application
   */
  async submitKycApplication(application: KycApplication): Promise<KycVerificationResult> {
    try {
      this.logger.log(`Submitting KYC application for user ${application.userId}`);
      
      // Validate application completeness
      this.validateKycApplication(application);
      
      // Process with KYC provider
      const result = await this.kycProvider.verifyIdentity(application);
      
      this.logger.log(`KYC application result for ${application.userId}: ${result.status}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to submit KYC application for ${application.userId}`, error);
      throw new Error('Failed to process KYC application');
    }
  }

  /**
   * Get KYC status for a user
   */
  async getKycStatus(userId: string): Promise<KycStatusResponse> {
    try {
      return await this.kycProvider.getKycStatus(userId);
    } catch (error) {
      this.logger.error(`Failed to get KYC status for ${userId}`, error);
      throw new Error('Failed to retrieve KYC status');
    }
  }

  /**
   * Determine investor tier based on application
   */
  determineInvestorTier(application: KycApplication): number {
    switch (application.investorType) {
      case 'retail':
        return 1;
      case 'accredited':
        // Verify accredited investor criteria
        if (this.meetsAccreditedCriteria(application.financialInfo)) {
          return 2;
        }
        return 1;
      case 'institutional':
        return 3;
      default:
        return 1;
    }
  }

  /**
   * Check if user meets accredited investor criteria
   */
  private meetsAccreditedCriteria(financialInfo?: KycApplication['financialInfo']): boolean {
    if (!financialInfo) return false;
    
    // SEC Accredited Investor criteria (simplified)
    const minNetWorth = 1000000; // $1M excluding primary residence
    const minIncome = 200000; // $200K annually
    
    return (financialInfo.netWorth || 0) >= minNetWorth || 
           (financialInfo.annualIncome || 0) >= minIncome;
  }

  /**
   * Validate KYC application completeness
   */
  private validateKycApplication(application: KycApplication): void {
    const required = [
      'userId',
      'walletAddress',
      'personalInfo',
      'documents',
      'investorType',
      'complianceQuestions'
    ];
    
    for (const field of required) {
      if (!application[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate personal info
    const personalRequired = ['firstName', 'lastName', 'dateOfBirth', 'nationality', 'address'];
    for (const field of personalRequired) {
      if (!application.personalInfo[field]) {
        throw new Error(`Missing required personal info: ${field}`);
      }
    }
    
    // Validate compliance questions
    if (!application.complianceQuestions.acceptsTerms) {
      throw new Error('Terms and conditions must be accepted');
    }
    
    // Validate documents
    if (application.documents.length < 2) {
      throw new Error('At least 2 documents required (ID and proof of address)');
    }
    
    const hasIdDoc = application.documents.some(doc => 
      ['passport', 'driver_license', 'national_id'].includes(doc.type)
    );
    const hasAddressDoc = application.documents.some(doc =>
      ['proof_of_address', 'bank_statement'].includes(doc.type)
    );
    
    if (!hasIdDoc) {
      throw new Error('Valid ID document required');
    }
    if (!hasAddressDoc) {
      throw new Error('Proof of address document required');
    }
  }

  /**
   * Calculate KYC expiration date based on tier
   */
  calculateExpirationDate(tier: number): Date {
    const now = new Date();
    switch (tier) {
      case 1: // Retail - 1 year
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      case 2: // Accredited - 2 years
        return new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);
      case 3: // Institutional - 3 years
        return new Date(now.getTime() + 3 * 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Check if KYC is expired
   */
  isKycExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Create KYC provider instance
   */
  private createKycProvider(providerName: string): KycProvider {
    switch (providerName) {
      case 'jumio':
        return new JumioKycProvider(this.configService);
      case 'onfido':
        return new OnfidoKycProvider(this.configService);
      case 'mock':
      default:
        return new MockKycProvider();
    }
  }
}

/**
 * Mock KYC Provider for development/testing
 */
class MockKycProvider implements KycProvider {
  private readonly logger = new Logger(MockKycProvider.name);
  private kycDatabase = new Map<string, KycStatusResponse>();

  async verifyIdentity(application: KycApplication): Promise<KycVerificationResult> {
    this.logger.log(`Mock KYC verification for ${application.userId}`);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock decision logic
    const isApproved = !application.complianceQuestions.hasCriminalHistory && 
                     !application.complianceQuestions.isPoliticallyExposed;
    
    const tier = this.determineTier(application.investorType);
    const status = isApproved ? 'approved' : 'rejected';
    const expiresAt = isApproved ? this.calculateExpiration(tier) : undefined;
    
    // Store in mock database
    this.kycDatabase.set(application.userId, {
      userId: application.userId,
      status,
      tier,
      approvedAt: isApproved ? new Date() : undefined,
      expiresAt,
      lastUpdated: new Date()
    });
    
    return {
      success: true,
      userId: application.userId,
      status,
      tier,
      expiresAt,
      score: isApproved ? 85 : 15,
      reasons: isApproved ? [] : ['Failed compliance checks']
    };
  }

  async getKycStatus(userId: string): Promise<KycStatusResponse> {
    const status = this.kycDatabase.get(userId);
    if (!status) {
      throw new Error(`KYC status not found for user ${userId}`);
    }
    
    // Check if expired
    if (status.expiresAt && status.expiresAt < new Date()) {
      status.status = 'expired';
    }
    
    return status;
  }

  private determineTier(investorType: string): number {
    switch (investorType) {
      case 'retail': return 1;
      case 'accredited': return 2;
      case 'institutional': return 3;
      default: return 1;
    }
  }

  private calculateExpiration(tier: number): Date {
    const now = new Date();
    const months = tier === 1 ? 12 : tier === 2 ? 24 : 36;
    return new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);
  }
}

/**
 * Jumio KYC Provider (placeholder implementation)
 */
class JumioKycProvider implements KycProvider {
  private readonly logger = new Logger(JumioKycProvider.name);

  constructor(private configService: ConfigService) {}

  async verifyIdentity(application: KycApplication): Promise<KycVerificationResult> {
    this.logger.log(`Jumio KYC verification for ${application.userId}`);
    // TODO: Implement Jumio API integration
    throw new Error('Jumio provider not implemented');
  }

  async getKycStatus(userId: string): Promise<KycStatusResponse> {
    this.logger.log(`Getting Jumio KYC status for ${userId}`);
    // TODO: Implement Jumio API integration
    throw new Error('Jumio provider not implemented');
  }
}

/**
 * Onfido KYC Provider (placeholder implementation)
 */
class OnfidoKycProvider implements KycProvider {
  private readonly logger = new Logger(OnfidoKycProvider.name);

  constructor(private configService: ConfigService) {}

  async verifyIdentity(application: KycApplication): Promise<KycVerificationResult> {
    this.logger.log(`Onfido KYC verification for ${application.userId}`);
    // TODO: Implement Onfido API integration
    throw new Error('Onfido provider not implemented');
  }

  async getKycStatus(userId: string): Promise<KycStatusResponse> {
    this.logger.log(`Getting Onfido KYC status for ${userId}`);
    // TODO: Implement Onfido API integration
    throw new Error('Onfido provider not implemented');
  }
}
