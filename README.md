# EquiLock

A blockchain-based platform for tokenized private equity trading on the Stacks blockchain, enabling compliant secondary market trading within the EU DLT Pilot Regime framework.

## Overview

EquiLock bridges traditional private equity with decentralized markets by providing:

- **Tokenized Equity Issuance**: Smart contract-based equity tokens representing real ownership
- **Compliant Secondary Trading**: Regulated trading within DLT market infrastructure frameworks
- **End-to-End Compliance**: KYC/AML integration and market abuse prevention
- **Governance Integration**: On-chain voting and dividend distribution

## Architecture

This is a monorepo containing:

- **`/contracts`** - Clarity smart contracts for the Stacks blockchain
- **`/backend`** - NestJS API server with PostgreSQL database
- **`/frontend`** - Next.js web application with TailwindCSS
- **`/shared`** - Shared TypeScript types and utilities
- **`/docs`** - Additional project documentation

## Development Setup

### Prerequisites

- Node.js 18+ and npm/yarn
- [Clarinet](https://github.com/hirosystems/clarinet) for smart contract development
- PostgreSQL database (or Supabase account)

### Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd equilock
   npm install
   ```

2. **Smart Contracts Development:**
   ```bash
   cd contracts
   clarinet console
   ```

3. **Backend API Server:**
   ```bash
   cd backend
   npm run dev
   ```

4. **Frontend Application:**
   ```bash
   cd frontend
   npm run dev
   ```

### Environment Configuration

Copy the environment template files and configure:
- `backend/.env.example` → `backend/.env`
- `frontend/.env.example` → `frontend/.env`

## Testing

```bash
# Run all tests
npm run test

# Test smart contracts
npm run test:contracts

# Test backend
npm run test:backend

# Test frontend
npm run test:frontend
```

## Deployment

- **Frontend**: Deployed on Vercel
- **Backend**: Deployed on AWS Fargate
- **Smart Contracts**: Deployed on Stacks Mainnet

## Documentation

For detailed product specifications and requirements, refer to the [Product Requirements Document](./EquiLock_PRD.md).

## Regulatory Compliance

This platform is designed to comply with:
- EU DLT Pilot Regime
- MiCA (Markets in Crypto-Assets Regulation)
- DORA (Digital Operational Resilience Act)
- KYC/AML requirements
- GDPR data protection standards

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Contributing

Please read our contributing guidelines and ensure all commits follow conventional commit standards.