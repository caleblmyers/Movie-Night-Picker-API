-- CreateTable
CREATE TABLE "SuggestMovieHistory" (
    "id" SERIAL NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "SuggestMovieHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SuggestMovieHistory_userId_idx" ON "SuggestMovieHistory"("userId");

-- CreateIndex
CREATE INDEX "SuggestMovieHistory_tmdbId_idx" ON "SuggestMovieHistory"("tmdbId");

-- CreateIndex
CREATE INDEX "SuggestMovieHistory_userId_createdAt_idx" ON "SuggestMovieHistory"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SuggestMovieHistory_userId_tmdbId_key" ON "SuggestMovieHistory"("userId", "tmdbId");

-- AddForeignKey
ALTER TABLE "SuggestMovieHistory" ADD CONSTRAINT "SuggestMovieHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
