import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

/**
 * EquiLock Equity Token Contract Tests
 * Comprehensive test suite for the tokenized private equity platform
 */

Clarinet.test({
    name: "Ensure that contract deployment is successful",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('equity-token', 'get-contract-info', [], deployer.address)
        ]);
        
        block.receipts[0].result.expectOk();
        assertEquals(block.receipts[0].events.length, 0);
    },
});

Clarinet.test({
    name: "Test SIP-010 standard functions",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('equity-token', 'get-name', [], deployer.address),
            Tx.contractCall('equity-token', 'get-symbol', [], deployer.address),
            Tx.contractCall('equity-token', 'get-decimals', [], deployer.address),
            Tx.contractCall('equity-token', 'get-total-supply', [], deployer.address),
        ]);
        
        block.receipts[0].result.expectOk().expectAscii("EquiLock Equity Token");
        block.receipts[1].result.expectOk().expectAscii("EQT");
        block.receipts[2].result.expectOk().expectUint(6);
        block.receipts[3].result.expectOk().expectUint(0);
    },
});

Clarinet.test({
    name: "Test KYC status management by owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Add KYC approved status
        let block = chain.mineBlock([
            Tx.contractCall('equity-token', 'update-kyc-status', [
                types.principal(wallet1.address),
                types.ascii("approved"),
                types.uint(2), // accredited investor
                types.some(types.uint(1000)) // expires at block 1000
            ], deployer.address)
        ]);
        
        block.receipts[0].result.expectOk().expectBool(true);
        
        // Check KYC status
        let queryBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'get-kyc-status', [
                types.principal(wallet1.address)
            ], deployer.address)
        ]);
        
        const kycStatus = queryBlock.receipts[0].result.expectSome().expectTuple();
        assertEquals(kycStatus.status, '"approved"');
        assertEquals(kycStatus.tier, types.uint(2));
    },
});

Clarinet.test({
    name: "Test whitelist management by owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Add to whitelist
        let block = chain.mineBlock([
            Tx.contractCall('equity-token', 'add-to-whitelist', [
                types.principal(wallet1.address)
            ], deployer.address)
        ]);
        
        block.receipts[0].result.expectOk().expectBool(true);
        
        // Check whitelist status
        let queryBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'get-whitelist-status', [
                types.principal(wallet1.address)
            ], deployer.address)
        ]);
        
        const whitelistStatus = queryBlock.receipts[0].result.expectSome().expectTuple();
        assertEquals(whitelistStatus.approved, types.bool(true));
    },
});

Clarinet.test({
    name: "Test non-owner cannot manage KYC or whitelist",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        // Non-owner tries to update KYC
        let block = chain.mineBlock([
            Tx.contractCall('equity-token', 'update-kyc-status', [
                types.principal(wallet2.address),
                types.ascii("approved"),
                types.uint(1),
                types.none()
            ], wallet1.address)
        ]);
        
        block.receipts[0].result.expectErr().expectUint(100); // err-owner-only
        
        // Non-owner tries to add to whitelist
        let block2 = chain.mineBlock([
            Tx.contractCall('equity-token', 'add-to-whitelist', [
                types.principal(wallet2.address)
            ], wallet1.address)
        ]);
        
        block2.receipts[0].result.expectErr().expectUint(100); // err-owner-only
    },
});

Clarinet.test({
    name: "Test token issuance workflow",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const investor = accounts.get('wallet_1')!;
        
        // Enable issuance
        let enableBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'toggle-issuance', [
                types.bool(true)
            ], deployer.address)
        ]);
        enableBlock.receipts[0].result.expectOk().expectBool(true);
        
        // Setup investor - KYC and whitelist
        let setupBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'update-kyc-status', [
                types.principal(investor.address),
                types.ascii("approved"),
                types.uint(2),
                types.some(types.uint(2000))
            ], deployer.address),
            Tx.contractCall('equity-token', 'add-to-whitelist', [
                types.principal(investor.address)
            ], deployer.address)
        ]);
        
        setupBlock.receipts[0].result.expectOk().expectBool(true);
        setupBlock.receipts[1].result.expectOk().expectBool(true);
        
        // Issue tokens
        let issueBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'issue-tokens', [
                types.principal(investor.address),
                types.uint(1000000), // 1 token with 6 decimals
                types.ascii("legal-doc-hash-123")
            ], deployer.address)
        ]);
        
        issueBlock.receipts[0].result.expectOk().expectUint(1); // returns issuance ID
        
        // Check balance
        let balanceBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'get-balance', [
                types.principal(investor.address)
            ], deployer.address)
        ]);
        
        balanceBlock.receipts[0].result.expectOk().expectUint(1000000);
        
        // Check total supply
        let supplyBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'get-total-supply', [], deployer.address)
        ]);
        
        supplyBlock.receipts[0].result.expectOk().expectUint(1000000);
    },
});

Clarinet.test({
    name: "Test token issuance requires KYC and whitelist",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const investor = accounts.get('wallet_1')!;
        
        // Enable issuance
        let enableBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'toggle-issuance', [
                types.bool(true)
            ], deployer.address)
        ]);
        
        // Try to issue without KYC/whitelist
        let issueBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'issue-tokens', [
                types.principal(investor.address),
                types.uint(1000000),
                types.ascii("legal-doc-hash")
            ], deployer.address)
        ]);
        
        issueBlock.receipts[0].result.expectErr().expectUint(103); // err-kyc-not-approved
        
        // Add KYC but not whitelist
        let kycBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'update-kyc-status', [
                types.principal(investor.address),
                types.ascii("approved"),
                types.uint(1),
                types.none()
            ], deployer.address)
        ]);
        
        let issueBlock2 = chain.mineBlock([
            Tx.contractCall('equity-token', 'issue-tokens', [
                types.principal(investor.address),
                types.uint(1000000),
                types.ascii("legal-doc-hash")
            ], deployer.address)
        ]);
        
        issueBlock2.receipts[0].result.expectErr().expectUint(102); // err-not-whitelisted
    },
});

Clarinet.test({
    name: "Test transfer restrictions and compliance",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const investor1 = accounts.get('wallet_1')!;
        const investor2 = accounts.get('wallet_2')!;
        
        // Setup both investors
        let setupBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'toggle-issuance', [types.bool(true)], deployer.address),
            // Investor 1
            Tx.contractCall('equity-token', 'update-kyc-status', [
                types.principal(investor1.address),
                types.ascii("approved"),
                types.uint(2),
                types.some(types.uint(3000))
            ], deployer.address),
            Tx.contractCall('equity-token', 'add-to-whitelist', [
                types.principal(investor1.address)
            ], deployer.address),
            // Investor 2
            Tx.contractCall('equity-token', 'update-kyc-status', [
                types.principal(investor2.address),
                types.ascii("approved"),
                types.uint(2),
                types.some(types.uint(3000))
            ], deployer.address),
            Tx.contractCall('equity-token', 'add-to-whitelist', [
                types.principal(investor2.address)
            ], deployer.address)
        ]);
        
        // Issue tokens to investor1
        let issueBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'issue-tokens', [
                types.principal(investor1.address),
                types.uint(2000000), // 2 tokens
                types.ascii("legal-doc-hash")
            ], deployer.address)
        ]);
        
        issueBlock.receipts[0].result.expectOk().expectUint(1);
        
        // Try transfer (should fail due to holding period)
        let transferBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'transfer', [
                types.uint(1000000), // 1 token
                types.principal(investor1.address),
                types.principal(investor2.address),
                types.none()
            ], investor1.address)
        ]);
        
        transferBlock.receipts[0].result.expectErr().expectUint(106); // err-holding-period-active
    },
});

Clarinet.test({
    name: "Test batch token issuance",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const investor1 = accounts.get('wallet_1')!;
        const investor2 = accounts.get('wallet_2')!;
        
        // Setup
        let setupBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'toggle-issuance', [types.bool(true)], deployer.address),
            // Setup both investors
            Tx.contractCall('equity-token', 'update-kyc-status', [
                types.principal(investor1.address),
                types.ascii("approved"),
                types.uint(2),
                types.some(types.uint(3000))
            ], deployer.address),
            Tx.contractCall('equity-token', 'add-to-whitelist', [
                types.principal(investor1.address)
            ], deployer.address),
            Tx.contractCall('equity-token', 'update-kyc-status', [
                types.principal(investor2.address),
                types.ascii("approved"),
                types.uint(2),
                types.some(types.uint(3000))
            ], deployer.address),
            Tx.contractCall('equity-token', 'add-to-whitelist', [
                types.principal(investor2.address)
            ], deployer.address)
        ]);
        
        // Batch issue
        let batchBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'batch-issue-tokens', [
                types.list([
                    types.tuple({
                        recipient: types.principal(investor1.address),
                        amount: types.uint(1000000)
                    }),
                    types.tuple({
                        recipient: types.principal(investor2.address),
                        amount: types.uint(2000000)
                    })
                ]),
                types.ascii("batch-legal-doc-hash")
            ], deployer.address)
        ]);
        
        batchBlock.receipts[0].result.expectOk();
        
        // Check balances
        let balanceBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'get-balance', [
                types.principal(investor1.address)
            ], deployer.address),
            Tx.contractCall('equity-token', 'get-balance', [
                types.principal(investor2.address)
            ], deployer.address),
            Tx.contractCall('equity-token', 'get-total-supply', [], deployer.address)
        ]);
        
        balanceBlock.receipts[0].result.expectOk().expectUint(1000000);
        balanceBlock.receipts[1].result.expectOk().expectUint(2000000);
        balanceBlock.receipts[2].result.expectOk().expectUint(3000000);
    },
});

Clarinet.test({
    name: "Test dividend declaration and claiming",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const investor = accounts.get('wallet_1')!;
        
        // Setup and issue tokens
        let setupBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'toggle-issuance', [types.bool(true)], deployer.address),
            Tx.contractCall('equity-token', 'update-kyc-status', [
                types.principal(investor.address),
                types.ascii("approved"),
                types.uint(2),
                types.some(types.uint(3000))
            ], deployer.address),
            Tx.contractCall('equity-token', 'add-to-whitelist', [
                types.principal(investor.address)
            ], deployer.address),
            Tx.contractCall('equity-token', 'issue-tokens', [
                types.principal(investor.address),
                types.uint(1000000), // 1 token
                types.ascii("legal-doc-hash")
            ], deployer.address)
        ]);
        
        // Declare dividend
        let dividendBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'declare-dividend', [
                types.uint(100000), // 0.1 STX total
                types.uint(1000) // deadline at block 1000
            ], deployer.address)
        ]);
        
        dividendBlock.receipts[0].result.expectOk().expectUint(1); // dividend ID
        
        // Check dividend details
        let queryBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'get-dividend-distribution', [
                types.uint(1)
            ], deployer.address)
        ]);
        
        const dividend = queryBlock.receipts[0].result.expectSome().expectTuple();
        assertEquals(dividend['total-amount'], types.uint(100000));
    },
});

Clarinet.test({
    name: "Test can-transfer check function",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const investor1 = accounts.get('wallet_1')!;
        const investor2 = accounts.get('wallet_2')!;
        const nonKycUser = accounts.get('wallet_3')!;
        
        // Setup approved investors
        let setupBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'update-kyc-status', [
                types.principal(investor1.address),
                types.ascii("approved"),
                types.uint(2),
                types.some(types.uint(3000))
            ], deployer.address),
            Tx.contractCall('equity-token', 'add-to-whitelist', [
                types.principal(investor1.address)
            ], deployer.address),
            Tx.contractCall('equity-token', 'update-kyc-status', [
                types.principal(investor2.address),
                types.ascii("approved"),
                types.uint(2),
                types.some(types.uint(3000))
            ], deployer.address),
            Tx.contractCall('equity-token', 'add-to-whitelist', [
                types.principal(investor2.address)
            ], deployer.address)
        ]);
        
        // Test valid transfer check
        let validCheck = chain.mineBlock([
            Tx.contractCall('equity-token', 'can-transfer', [
                types.principal(investor1.address),
                types.principal(investor2.address),
                types.uint(1000000)
            ], deployer.address)
        ]);
        
        validCheck.receipts[0].result.expectOk().expectBool(false); // false because no tokens yet
        
        // Test invalid transfer (non-KYC user)
        let invalidCheck = chain.mineBlock([
            Tx.contractCall('equity-token', 'can-transfer', [
                types.principal(investor1.address),
                types.principal(nonKycUser.address),
                types.uint(1000000)
            ], deployer.address)
        ]);
        
        invalidCheck.receipts[0].result.expectOk().expectBool(false);
    },
});

Clarinet.test({
    name: "Test contract info and metadata updates",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        // Update metadata
        let updateBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'set-token-uri', [
                types.some(types.utf8("https://equilock.io/metadata/token.json"))
            ], deployer.address),
            Tx.contractCall('equity-token', 'update-legal-document', [
                types.ascii("0xabc123def456789")
            ], deployer.address),
            Tx.contractCall('equity-token', 'set-issuer-name', [
                types.ascii("EquiLock Holdings Ltd")
            ], deployer.address)
        ]);
        
        updateBlock.receipts[0].result.expectOk().expectBool(true);
        updateBlock.receipts[1].result.expectOk().expectBool(true);
        updateBlock.receipts[2].result.expectOk().expectBool(true);
        
        // Check contract info
        let infoBlock = chain.mineBlock([
            Tx.contractCall('equity-token', 'get-contract-info', [], deployer.address),
            Tx.contractCall('equity-token', 'get-token-uri', [], deployer.address)
        ]);
        
        const contractInfo = infoBlock.receipts[0].result.expectOk().expectTuple();
        assertEquals(contractInfo['issuer-name'], '"EquiLock Holdings Ltd"');
        assertEquals(contractInfo['legal-document-hash'], '"0xabc123def456789"');
        
        infoBlock.receipts[1].result.expectOk().expectSome().expectUtf8("https://equilock.io/metadata/token.json");
    },
});
