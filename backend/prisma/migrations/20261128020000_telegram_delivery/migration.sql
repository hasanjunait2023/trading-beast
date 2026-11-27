CREATE TABLE "TelegramDelivery" (
"id" TEXT PRIMARY KEY,"chatId" TEXT NOT NULL,"text" TEXT NOT NULL,"attempts" INTEGER NOT NULL DEFAULT 0,
"nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"leaseUntil" TIMESTAMP(3),"leaseToken" TEXT,
"sentAt" TIMESTAMP(3),"failedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "TelegramDelivery_sentAt_failedAt_nextAttemptAt_idx" ON "TelegramDelivery"("sentAt","failedAt","nextAttemptAt");
