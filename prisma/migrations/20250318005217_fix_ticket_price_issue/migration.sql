/*
  Warnings:

  - You are about to alter the column `ticketPrice` on the `Post` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Post" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "authorId" INTEGER NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "eventName" TEXT,
    "eventDate" TEXT,
    "eventVenue" TEXT,
    "ticketPrice" BIGINT,
    "contactInfo" TEXT,
    "status" TEXT DEFAULT 'ACTIVE',
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("authorId", "category", "contactInfo", "content", "createdAt", "eventDate", "eventName", "eventVenue", "id", "isDeleted", "status", "ticketPrice", "title", "updatedAt", "viewCount") SELECT "authorId", "category", "contactInfo", "content", "createdAt", "eventDate", "eventName", "eventVenue", "id", "isDeleted", "status", "ticketPrice", "title", "updatedAt", "viewCount" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
