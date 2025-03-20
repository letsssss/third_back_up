-- 채팅방 테이블 생성
CREATE TABLE "Room" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "chatInvisibleTo" INTEGER,
    "lastChat" TEXT,
    "timeOfLastChat" DATETIME,
    "purchaseId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Room_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 채팅방 참여자 테이블 생성
CREATE TABLE "RoomParticipant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roomId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Message 테이블에 roomId 필드 추가는 프리즈마에서 이미 수행되어 있으므로 여기서는 생략합니다.
-- SQLite는 ALTER TABLE이 제한적으로 지원되어 문제가 될 수 있습니다.
-- 아래 코드는 실행하지 않습니다.
-- ALTER TABLE "Message" ADD COLUMN "roomId" INTEGER REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 인덱스 생성
CREATE UNIQUE INDEX "Room_name_key" ON "Room"("name");
CREATE UNIQUE INDEX "Room_purchaseId_key" ON "Room"("purchaseId");
CREATE UNIQUE INDEX "RoomParticipant_roomId_userId_key" ON "RoomParticipant"("roomId", "userId");

-- Message 테이블 관련 인덱스는 프리즈마에서 이미 처리되어 있으므로 여기서는 생략합니다.
-- CREATE INDEX IF NOT EXISTS "Message_roomId_idx" ON "Message"("roomId");
-- CREATE INDEX IF NOT EXISTS "Message_senderId_idx" ON "Message"("senderId");
-- CREATE INDEX IF NOT EXISTS "Message_receiverId_idx" ON "Message"("receiverId"); 