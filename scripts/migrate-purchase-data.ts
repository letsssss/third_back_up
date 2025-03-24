import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 이 스크립트는 기존 Purchase 레코드에 관련 Post 데이터를 복사합니다.
 * 현재 Purchase 레코드에 ticketTitle, eventDate 등의 필드가 비어있는 경우
 * 관련 Post에서 해당 정보를 가져와 업데이트합니다.
 */
async function migratePurchaseData() {
  console.log('Purchase 데이터 마이그레이션 시작...');
  
  try {
    // 모든 Purchase 레코드 조회
    const purchases = await prisma.purchase.findMany({
      where: {
        postId: { not: null }, // postId가 있는 레코드만 조회
        ticketTitle: null, // ticketTitle이 없는 레코드만 조회
      },
      include: {
        post: true, // Post 정보도 함께 가져오기
      },
    });
    
    console.log(`마이그레이션이 필요한 Purchase 레코드 수: ${purchases.length}`);
    
    // 각 Purchase 레코드 업데이트
    for (const purchase of purchases) {
      if (purchase.post) {
        // Post 정보가 있는 경우에만 업데이트
        await prisma.purchase.update({
          where: { id: purchase.id },
          data: {
            ticketTitle: purchase.post.title,
            eventDate: purchase.post.eventDate,
            eventVenue: purchase.post.eventVenue,
            ticketPrice: purchase.post.ticketPrice,
            // 추가 필드도 필요에 따라 업데이트
          },
        });
        
        console.log(`Purchase ID ${purchase.id} 업데이트 완료: ${purchase.post.title}`);
      } else {
        console.log(`Purchase ID ${purchase.id}의 Post 정보 없음, 건너뜁니다.`);
      }
    }
    
    console.log('Purchase 데이터 마이그레이션 완료!');
  } catch (error) {
    console.error('마이그레이션 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
migratePurchaseData(); 