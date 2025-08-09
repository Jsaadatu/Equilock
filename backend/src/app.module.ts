import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: process.env.NODE_ENV !== 'production',
    }),
    // TODO: Add feature modules
    // - AuthModule (Supabase integration)
    // - KycModule (KYC/AML compliance)
    // - TokenModule (Equity token management)
    // - TradingModule (Secondary market)
    // - GovernanceModule (Voting and dividends)
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}