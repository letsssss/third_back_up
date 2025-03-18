// 데이터베이스 시드 스크립트
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('데이터베이스 시드 시작...');

    // 테스트 사용자 생성
    const adminPassword = await bcrypt.hash('admin123', 10);
    const userPassword = await bcrypt.hash('user123', 10);

    // Admin 사용자 생성
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        name: '관리자',
        password: adminPassword,
        role: 'ADMIN',
        phoneNumber: '010-1234-5678',
        bankInfo: JSON.stringify({
          bank: 'KB국민은행',
          accountNumber: '123-456-789',
          accountHolder: '관리자'
        }),
      },
    });

    // 일반 사용자 생성
    const user = await prisma.user.upsert({
      where: { email: 'user@example.com' },
      update: {},
      create: {
        email: 'user@example.com',
        name: '일반사용자',
        password: userPassword,
        role: 'USER',
        phoneNumber: '010-9876-5432',
        bankInfo: JSON.stringify({
          bank: '신한은행',
          accountNumber: '987-654-321',
          accountHolder: '일반사용자'
        }),
      },
    });

    // 판매자 사용자 생성
    const sellerPassword = await bcrypt.hash('seller123', 10);
    const seller = await prisma.user.upsert({
      where: { email: 'seller@example.com' },
      update: {},
      create: {
        email: 'seller@example.com',
        name: '판매자',
        password: sellerPassword,
        role: 'SELLER',
        phoneNumber: '010-5555-5555',
        bankInfo: JSON.stringify({
          bank: '우리은행',
          accountNumber: '555-555-555',
          accountHolder: '판매자'
        }),
      },
    });

    console.log('사용자 생성 완료:', { admin, user, seller });

    // 테스트 게시글 생성
    const posts = await Promise.all([
      prisma.post.create({
        data: {
          title: '세븐틴 FOLLOW 콘서트 티켓 취켓팅',
          content: '세븐틴 콘서트 티켓이 취소되어 양도합니다. 관심 있으신 분은 연락주세요.',
          category: 'TICKET_CANCELLATION',
          authorId: seller.id,
          eventName: '세븐틴 FOLLOW 콘서트',
          eventDate: '2025-03-20',
          eventVenue: '잠실종합운동장 주경기장',
          ticketPrice: 120000,
          contactInfo: '010-5555-5555',
        },
      }),
      prisma.post.create({
        data: {
          title: '아이유 콘서트 티켓 판매',
          content: '아이유 콘서트 티켓을 판매합니다. 좋은 자리입니다.',
          category: 'TICKET_CANCELLATION',
          authorId: seller.id,
          eventName: '아이유 콘서트',
          eventDate: '2025-05-01',
          eventVenue: '올림픽공원 체조경기장',
          ticketPrice: 99000,
          contactInfo: '010-5555-5555',
        },
      }),
    ]);

    console.log('게시글 생성 완료:', posts);

    console.log('데이터베이스 시드 완료');
  } catch (error) {
    console.error('데이터베이스 시드 오류:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 