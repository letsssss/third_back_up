const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * 이 스크립트는 기존 Purchase 레코드에 관련 Post 데이터를 복사합니다.
 * 현재 Purchase 레코드에 ticketTitle, eventDate 등의 필드가 비어있는 경우
 * 관련 Post에서 해당 정보를 가져와 업데이트합니다.
 */
async function migratePurchaseData() {
  console.log('Purchase 데이터 마이그레이션 시작...');
  
  try {
    // 모든 Purchase 레코드 조회 (검색 조건 제거)
    const purchases = await prisma.purchase.findMany({
      include: {
        post: true, // Post 정보도 함께 가져오기
      },
    });
    
    console.log(`총 Purchase 레코드 수: ${purchases.length}`);
    
    let updatedCount = 0;
    
    // 각 Purchase 레코드 업데이트
    for (const purchase of purchases) {
      console.log(`Purchase ID ${purchase.id} 확인 중:`, {
        postId: purchase.postId,
        hasPost: !!purchase.post,
        hasTicketTitle: !!purchase.ticketTitle,
      });
      
      if (purchase.post && !purchase.ticketTitle) {
        // Post 정보가 있고 ticketTitle이 없는 경우에만 업데이트
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
        updatedCount++;
      } else if (!purchase.post && purchase.postId) {
        console.log(`Purchase ID ${purchase.id}는 postId(${purchase.postId})는 있지만 관련 Post 정보가 없습니다.`);
      } else if (!purchase.ticketTitle) {
        console.log(`Purchase ID ${purchase.id}는 ticketTitle이 없고 관련 Post도 없습니다.`);
      } else {
        console.log(`Purchase ID ${purchase.id}는 이미 ticketTitle(${purchase.ticketTitle})이 있습니다.`);
      }
    }
    
    console.log(`총 ${updatedCount}개의 레코드가 업데이트되었습니다.`);
    console.log('Purchase 데이터 마이그레이션 완료!');
  } catch (error) {
    console.error('마이그레이션 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
migratePurchaseData(); 