#!/bin/bash

# EquiLock Development Environment Setup Script

echo "🚀 Setting up EquiLock development environment..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup environment files
echo "🔧 Setting up environment files..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "📝 Created backend/.env from template"
fi

if [ ! -f frontend/.env.local ]; then
    cp frontend/.env.example frontend/.env.local
    echo "📝 Created frontend/.env.local from template"
fi

# Check for Clarinet installation
if ! command -v clarinet &> /dev/null; then
    echo "⚠️  Clarinet is not installed. Please install it for smart contract development:"
    echo "   Visit: https://github.com/hirosystems/clarinet"
else
    echo "✅ Clarinet is installed: $(clarinet --version)"
fi

echo ""
echo "🎉 Setup complete! Next steps:"
echo ""
echo "1. Configure your environment variables in:"
echo "   - backend/.env"
echo "   - frontend/.env.local"
echo ""
echo "2. Start development servers:"
echo "   npm run dev"
echo ""
echo "3. For smart contract development:"
echo "   cd contracts && clarinet console"
echo ""