-- AlterTable: dodaj pole śledzące kiedy ostatnio zmieniono nazwę użytkownika
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "usernameChangedAt" TIMESTAMP(3);
