-- Saved posts
CREATE TABLE IF NOT EXISTS "saved_posts" (
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "saved_posts_pkey" PRIMARY KEY ("userId","postId")
);
ALTER TABLE "saved_posts" ADD CONSTRAINT "saved_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_posts" ADD CONSTRAINT "saved_posts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "meme_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NSFW flag
ALTER TABLE "meme_posts" ADD COLUMN IF NOT EXISTS "isNsfw" BOOLEAN NOT NULL DEFAULT false;

-- Comment image
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- Ban history
CREATE TABLE IF NOT EXISTS "ban_history" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ban_history_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ban_history" ADD CONSTRAINT "ban_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ban_history" ADD CONSTRAINT "ban_history_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
