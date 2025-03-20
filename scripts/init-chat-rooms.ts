import { PrismaClient } from '@prisma/client';

// Prisma 클라이언트 초기화
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('기존 구매 정보로 채팅방 생성 시작...');
    
    // 기존 구매 정보 조회
    const purchases = await prisma.purchase.findMany({
      include: {
        buyer: true,
        seller: true,
      },
    });
    
    console.log(`총 ${purchases.length}개의 구매 정보를 찾았습니다.`);
    
    // 각 구매에 대해 채팅방 생성
    let roomCount = 0;
    for (const purchase of purchases) {
      try {
        // 이미 채팅방이 있는지 확인
        // @ts-ignore - Prisma 클라이언트 타입이 업데이트되지 않았을 가능성 있음
        const existingRoom = await prisma.room.findFirst({
          where: { purchaseId: purchase.id }
        });
        
        if (existingRoom) {
          console.log(`구매 ID ${purchase.id}에 대한 채팅방이 이미 존재합니다.`);
          continue;
        }
        
        // 채팅방 이름 생성 (고유한 채팅방 식별자)
        const roomName = `purchase_${purchase.id}`;
        
        // 채팅방 생성
        // @ts-ignore - Prisma 클라이언트 타입이 업데이트되지 않았을 가능성 있음
        const room = await prisma.room.create({
          data: {
            name: roomName,
            purchase: { connect: { id: purchase.id } },
            participants: {
              create: [
                { user: { connect: { id: purchase.buyerId } } },
                { user: { connect: { id: purchase.sellerId } } }
              ]
            }
          }
        });
        
        // 기존 메시지가 있으면 연결 (별도로 처리)
        const messages = await prisma.message.findMany({
          where: { purchaseId: purchase.id },
          select: { id: true }
        });
        
        if (messages.length > 0) {
          // @ts-ignore - Prisma 클라이언트 타입이 업데이트되지 않았을 가능성 있음
          await prisma.message.updateMany({
            where: { purchaseId: purchase.id },
            data: { roomId: room.id }
          });
          console.log(`${messages.length}개의 기존 메시지를 채팅방에 연결했습니다.`);
        }
        
        console.log(`구매 ID ${purchase.id}에 대한 채팅방 ${roomName}이 생성되었습니다.`);
        roomCount++;
      } catch (err) {
        console.error(`구매 ID ${purchase.id}에 대한 채팅방 생성 중 오류 발생:`, err);
      }
    }
    
    console.log(`총 ${roomCount}개의 채팅방이 성공적으로 생성되었습니다.`);
  } catch (error) {
    console.error('채팅방 생성 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
main()
  .then(() => console.log('채팅방 초기화 완료'))
  .catch(e => console.error(e)); 