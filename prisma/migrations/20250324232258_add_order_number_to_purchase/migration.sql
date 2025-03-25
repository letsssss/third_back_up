/*
  Warnings:

  - Added the required column `orderNumber` to the `Purchase` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Purchase" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderNumber" TEXT NOT NULL,
    "buyerId" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "postId" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "selectedSeats" TEXT,
    "phoneNumber" TEXT,
    "ticketTitle" TEXT,
    "eventDate" TEXT,
    "eventVenue" TEXT,
    "ticketPrice" BIGINT,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Purchase_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Purchase_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Purchase_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Purchase" ("buyerId", "createdAt", "eventDate", "eventVenue", "id", "imageUrl", "paymentMethod", "phoneNumber", "postId", "quantity", "selectedSeats", "sellerId", "status", "ticketPrice", "ticketTitle", "totalPrice", "updatedAt", "orderNumber") 
SELECT 
    "buyerId", 
    "createdAt", 
    "eventDate", 
    "eventVenue", 
    "id", 
    "imageUrl", 
    "paymentMethod", 
    "phoneNumber", 
    "postId", 
    "quantity", 
    "selectedSeats", 
    "sellerId", 
    "status", 
    "ticketPrice", 
    "ticketTitle", 
    "totalPrice", 
    "updatedAt",
    'ORDER-' || printf('%06d', "id") -- 각 레코드의 id를 이용해 고유한 주문 번호 생성
FROM "Purchase";
DROP TABLE "Purchase";
ALTER TABLE "new_Purchase" RENAME TO "Purchase";
CREATE UNIQUE INDEX "Purchase_orderNumber_key" ON "Purchase"("orderNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
