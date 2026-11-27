-- Initial migration for a NEW database. Existing installations require reviewed baselining.
CREATE TYPE "Tier" AS ENUM ('FREE','PRO','ELITE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE','EXPIRED','CANCELLED','TRIAL');
CREATE TYPE "PaymentMethod" AS ENUM ('BKASH','NAGAD','USDT','STRIPE','MANUAL');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','APPROVED','REJECTED','EXPIRED');
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING','CREDITED','EXPIRED','REJECTED');
CREATE TYPE "RadarRunStatus" AS ENUM ('RUNNING','SUCCEEDED','REFUNDED');

CREATE TABLE "User" (
 "id" TEXT PRIMARY KEY, "telegramId" TEXT NOT NULL, "username" TEXT, "firstName" TEXT, "lastName" TEXT,
 "languageCode" TEXT DEFAULT 'en', "tier" "Tier" NOT NULL DEFAULT 'FREE', "trialEndsAt" TIMESTAMP(3),
 "watchlist" TEXT[] DEFAULT ARRAY[]::TEXT[], "referralCode" TEXT NOT NULL, "referredBy" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "lastActiveAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
CREATE INDEX "User_tier_idx" ON "User"("tier");
CREATE INDEX "User_referralCode_idx" ON "User"("referralCode");

CREATE TABLE "Subscription" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "tier" "Tier" NOT NULL,
 "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE', "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "Subscription_valid_period" CHECK ("expiresAt" > "startsAt")
);
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_userId_status_expiresAt_idx" ON "Subscription"("userId","status","expiresAt");

CREATE TABLE "Payment" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "amount" INTEGER NOT NULL, "currency" TEXT NOT NULL DEFAULT 'USD',
 "method" "PaymentMethod" NOT NULL, "transactionId" TEXT, "screenshotUrl" TEXT, "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
 "verifiedAt" TIMESTAMP(3), "verifiedBy" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "Payment_positive_amount" CHECK ("amount" > 0)
);
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment"("transactionId");
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_transactionId_idx" ON "Payment"("transactionId");

CREATE TABLE "Referral" (
 "id" TEXT PRIMARY KEY, "referrerId" TEXT NOT NULL, "referredId" TEXT NOT NULL,
 "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING', "creditedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "Referral_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "Referral_no_self" CHECK ("referrerId" <> "referredId")
);
CREATE UNIQUE INDEX "Referral_referredId_key" ON "Referral"("referredId");
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

CREATE TABLE "AnalysisCache" (
 "id" TEXT PRIMARY KEY, "pair" TEXT NOT NULL, "session" TEXT NOT NULL, "date" DATE NOT NULL, "resultJson" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "AnalysisCache_pair_session_date_key" ON "AnalysisCache"("pair","session","date");
CREATE INDEX "AnalysisCache_date_idx" ON "AnalysisCache"("date");
CREATE INDEX "AnalysisCache_session_idx" ON "AnalysisCache"("session");

CREATE TABLE "FocusResult" (
 "id" TEXT PRIMARY KEY, "session" TEXT NOT NULL, "date" DATE NOT NULL, "focusPairs" JSONB NOT NULL,
 "watchPairs" JSONB, "avoidPairs" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "FocusResult_session_date_key" ON "FocusResult"("session","date");
CREATE INDEX "FocusResult_date_idx" ON "FocusResult"("date");

CREATE TABLE "CreditWallet" (
 "userId" TEXT PRIMARY KEY, "balance" BIGINT NOT NULL DEFAULT 0, "lastGrantDay" INTEGER NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CreditWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "CreditWallet_nonnegative" CHECK ("balance" >= 0)
);
CREATE TABLE "CreditEntry" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "delta" BIGINT NOT NULL, "kind" TEXT NOT NULL, "reference" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CreditEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "CreditEntry_nonzero" CHECK ("delta" <> 0)
);
CREATE UNIQUE INDEX "CreditEntry_userId_reference_key" ON "CreditEntry"("userId","reference");
CREATE INDEX "CreditEntry_userId_createdAt_idx" ON "CreditEntry"("userId","createdAt");
CREATE TABLE "LoginCode" (
 "digest" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "usedAt" TIMESTAMP(3),
 CONSTRAINT "LoginCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LoginCode_userId_expiresAt_idx" ON "LoginCode"("userId","expiresAt");
CREATE INDEX "LoginCode_expiresAt_idx" ON "LoginCode"("expiresAt");
CREATE TABLE "RadarRun" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "requestKey" TEXT NOT NULL, "fingerprint" TEXT NOT NULL,
 "status" "RadarRunStatus" NOT NULL DEFAULT 'RUNNING', "result" JSONB, "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMP(3) NOT NULL, "completedAt" TIMESTAMP(3),
 CONSTRAINT "RadarRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "RadarRun_lifecycle" CHECK (("status"='RUNNING' AND "completedAt" IS NULL AND "result" IS NULL) OR ("status"='SUCCEEDED' AND "completedAt" IS NOT NULL AND "result" IS NOT NULL) OR ("status"='REFUNDED' AND "completedAt" IS NOT NULL AND "result" IS NULL))
);
CREATE UNIQUE INDEX "RadarRun_userId_requestKey_key" ON "RadarRun"("userId","requestKey");
CREATE INDEX "RadarRun_status_expiresAt_idx" ON "RadarRun"("status","expiresAt");
CREATE INDEX "RadarRun_userId_startedAt_idx" ON "RadarRun"("userId","startedAt");
