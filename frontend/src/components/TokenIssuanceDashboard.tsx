'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TokenInfo, KycStatus, WhitelistInfo } from '@/shared/types';
import { useStacksConnection } from '@/hooks/useStacksConnection';
import { useTokenContract } from '@/hooks/useTokenContract';

// Form validation schemas
const tokenIssuanceSchema = z.object({
  recipient: z.string().min(1, 'Recipient address is required'),
  amount: z.string().min(1, 'Amount is required').regex(/^\d+$/, 'Amount must be a number'),
  legalDocumentHash: z.string().min(1, 'Legal document hash is required'),
});

const kycUpdateSchema = z.object({
  userAddress: z.string().min(1, 'User address is required'),
  status: z.enum(['pending', 'approved', 'rejected', 'expired']),
  tier: z.string().min(1, 'Tier is required').regex(/^[1-3]$/, 'Tier must be 1, 2, or 3'),
  expiresAt: z.string().optional(),
});

const whitelistSchema = z.object({
  userAddress: z.string().min(1, 'User address is required'),
  approved: z.boolean(),
});

type TokenIssuanceForm = z.infer<typeof tokenIssuanceSchema>;
type KycUpdateForm = z.infer<typeof kycUpdateSchema>;
type WhitelistForm = z.infer<typeof whitelistSchema>;

interface TokenIssuanceDashboardProps {
  className?: string;
}

export default function TokenIssuanceDashboard({ className }: TokenIssuanceDashboardProps) {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { userSession, isConnected } = useStacksConnection();
  const { 
    issueTokens, 
    updateKycStatus, 
    updateWhitelist, 
    getTokenInfo,
    checkAccountSummary 
  } = useTokenContract();

  // Form instances
  const issuanceForm = useForm<TokenIssuanceForm>({
    resolver: zodResolver(tokenIssuanceSchema),
    defaultValues: {
      recipient: '',
      amount: '',
      legalDocumentHash: '',
    },
  });

  const kycForm = useForm<KycUpdateForm>({
    resolver: zodResolver(kycUpdateSchema),
    defaultValues: {
      userAddress: '',
      status: 'pending',
      tier: '1',
      expiresAt: '',
    },
  });

  const whitelistForm = useForm<WhitelistForm>({
    resolver: zodResolver(whitelistSchema),
    defaultValues: {
      userAddress: '',
      approved: true,
    },
  });

  // Load token info on component mount
  useEffect(() => {
    if (isConnected) {
      loadTokenInfo();
    }
  }, [isConnected]);

  const loadTokenInfo = async () => {
    try {
      setLoading(true);
      const info = await getTokenInfo();
      setTokenInfo(info);
    } catch (err) {
      setError('Failed to load token information');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTokenIssuance = async (data: TokenIssuanceForm) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const result = await issueTokens({
        recipient: data.recipient,
        amount: data.amount,
        legalDocumentHash: data.legalDocumentHash,
      });

      if (result.success) {
        setSuccess(`Token issuance transaction prepared. Estimated fee: ${result.estimatedFee} μSTX`);
        issuanceForm.reset();
        // Refresh token info
        await loadTokenInfo();
      } else {
        setError(result.error || 'Failed to prepare token issuance');
      }
    } catch (err) {
      setError('Failed to issue tokens');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKycUpdate = async (data: KycUpdateForm) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const expiresAt = data.expiresAt ? 
        Math.floor(new Date(data.expiresAt).getTime() / 1000) : 
        undefined;

      const result = await updateKycStatus({
        userAddress: data.userAddress,
        status: data.status,
        tier: parseInt(data.tier),
        expiresAt,
      });

      if (result.success) {
        setSuccess(`KYC update transaction prepared. Estimated fee: ${result.estimatedFee} μSTX`);
        kycForm.reset();
      } else {
        setError(result.error || 'Failed to prepare KYC update');
      }
    } catch (err) {
      setError('Failed to update KYC status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleWhitelistUpdate = async (data: WhitelistForm) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const result = await updateWhitelist({
        userAddress: data.userAddress,
        approved: data.approved,
      });

      if (result.success) {
        setSuccess(`Whitelist update transaction prepared. Estimated fee: ${result.estimatedFee} μSTX`);
        whitelistForm.reset();
      } else {
        setError(result.error || 'Failed to prepare whitelist update');
      }
    } catch (err) {
      setError('Failed to update whitelist');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
          <p className="text-gray-600 mb-4">
            Please connect your Stacks wallet to access the token issuance dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`container mx-auto p-6 space-y-6 ${className}`}>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Token Issuance Dashboard</h1>
        <Button onClick={loadTokenInfo} disabled={loading}>
          Refresh
        </Button>
      </div>

      {/* Alert Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Token Information Card */}
      {tokenInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Token Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Name</Label>
                <p className="font-medium">{tokenInfo.name}</p>
              </div>
              <div>
                <Label>Symbol</Label>
                <p className="font-medium">{tokenInfo.symbol}</p>
              </div>
              <div>
                <Label>Total Supply</Label>
                <p className="font-medium">{tokenInfo.totalSupply}</p>
              </div>
              <div>
                <Label>Max Supply</Label>
                <p className="font-medium">{tokenInfo.maxSupply}</p>
              </div>
              <div>
                <Label>Issuance Status</Label>
                <Badge variant={tokenInfo.issuanceActive ? 'default' : 'secondary'}>
                  {tokenInfo.issuanceActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div>
                <Label>Holding Period</Label>
                <p className="font-medium">{tokenInfo.holdingPeriod} blocks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Management Tabs */}
      <Tabs defaultValue="issuance" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="issuance">Token Issuance</TabsTrigger>
          <TabsTrigger value="kyc">KYC Management</TabsTrigger>
          <TabsTrigger value="whitelist">Whitelist Management</TabsTrigger>
        </TabsList>

        {/* Token Issuance Tab */}
        <TabsContent value="issuance">
          <Card>
            <CardHeader>
              <CardTitle>Issue New Tokens</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={issuanceForm.handleSubmit(handleTokenIssuance)} className="space-y-4">
                <div>
                  <Label htmlFor="recipient">Recipient Address</Label>
                  <Input
                    id="recipient"
                    placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
                    {...issuanceForm.register('recipient')}
                  />
                  {issuanceForm.formState.errors.recipient && (
                    <p className="text-sm text-red-500 mt-1">
                      {issuanceForm.formState.errors.recipient.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="amount">Amount (with decimals)</Label>
                  <Input
                    id="amount"
                    placeholder="1000000"
                    {...issuanceForm.register('amount')}
                  />
                  {issuanceForm.formState.errors.amount && (
                    <p className="text-sm text-red-500 mt-1">
                      {issuanceForm.formState.errors.amount.message}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Note: Amount includes decimals (1000000 = 1 token with 6 decimals)
                  </p>
                </div>

                <div>
                  <Label htmlFor="legalDocumentHash">Legal Document Hash</Label>
                  <Input
                    id="legalDocumentHash"
                    placeholder="0xabc123def456..."
                    {...issuanceForm.register('legalDocumentHash')}
                  />
                  {issuanceForm.formState.errors.legalDocumentHash && (
                    <p className="text-sm text-red-500 mt-1">
                      {issuanceForm.formState.errors.legalDocumentHash.message}
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Processing...' : 'Issue Tokens'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KYC Management Tab */}
        <TabsContent value="kyc">
          <Card>
            <CardHeader>
              <CardTitle>Update KYC Status</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={kycForm.handleSubmit(handleKycUpdate)} className="space-y-4">
                <div>
                  <Label htmlFor="userAddress">User Address</Label>
                  <Input
                    id="userAddress"
                    placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
                    {...kycForm.register('userAddress')}
                  />
                  {kycForm.formState.errors.userAddress && (
                    <p className="text-sm text-red-500 mt-1">
                      {kycForm.formState.errors.userAddress.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="status">KYC Status</Label>
                  <select
                    id="status"
                    className="w-full p-2 border rounded-md"
                    {...kycForm.register('status')}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="expired">Expired</option>
                  </select>
                  {kycForm.formState.errors.status && (
                    <p className="text-sm text-red-500 mt-1">
                      {kycForm.formState.errors.status.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="tier">Investor Tier</Label>
                  <select
                    id="tier"
                    className="w-full p-2 border rounded-md"
                    {...kycForm.register('tier')}
                  >
                    <option value="1">Tier 1 - Retail</option>
                    <option value="2">Tier 2 - Accredited</option>
                    <option value="3">Tier 3 - Institutional</option>
                  </select>
                  {kycForm.formState.errors.tier && (
                    <p className="text-sm text-red-500 mt-1">
                      {kycForm.formState.errors.tier.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    {...kycForm.register('expiresAt')}
                  />
                  {kycForm.formState.errors.expiresAt && (
                    <p className="text-sm text-red-500 mt-1">
                      {kycForm.formState.errors.expiresAt.message}
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Processing...' : 'Update KYC Status'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Whitelist Management Tab */}
        <TabsContent value="whitelist">
          <Card>
            <CardHeader>
              <CardTitle>Manage Whitelist</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={whitelistForm.handleSubmit(handleWhitelistUpdate)} className="space-y-4">
                <div>
                  <Label htmlFor="whitelistUserAddress">User Address</Label>
                  <Input
                    id="whitelistUserAddress"
                    placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
                    {...whitelistForm.register('userAddress')}
                  />
                  {whitelistForm.formState.errors.userAddress && (
                    <p className="text-sm text-red-500 mt-1">
                      {whitelistForm.formState.errors.userAddress.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="approved">Action</Label>
                  <select
                    id="approved"
                    className="w-full p-2 border rounded-md"
                    {...whitelistForm.register('approved', { valueAsBoolean: true })}
                  >
                    <option value="true">Add to Whitelist</option>
                    <option value="false">Remove from Whitelist</option>
                  </select>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Processing...' : 'Update Whitelist'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
