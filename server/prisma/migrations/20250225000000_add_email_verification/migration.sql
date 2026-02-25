-- AlterTable: email verification + password reset fields
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "verificationCode" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationCodeExpiry" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resetCode" TEXT,
  ADD COLUMN IF NOT EXISTS "resetCodeExpiry" TIMESTAMP(3);

-- Istniejące konta (przed wprowadzeniem weryfikacji) uznajemy za zweryfikowane
UPDATE "users" SET "emailVerified" = true WHERE "emailVerified" = false AND "verificationCode" IS NULL;
