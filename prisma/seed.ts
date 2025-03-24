import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('데이터베이스 시드 실행 중...');

    // 기존 데이터 삭제 (주의: 프로덕션에서는 사용하지 마세요)
    await prisma.message.deleteMany({});
    await prisma.roomParticipant.deleteMany({});
    await prisma.room.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.purchase.deleteMany({});
    await prisma.post.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('기존 데이터 삭제 완료');

    // 사용자 생성
    const password = await bcrypt.hash('password123', 10);
    
    const user1 = await prisma.user.create({
      data: {
        email: 'user1@example.com',
        password,
        name: '사용자1',
        role: 'USER',
        phoneNumber: '010-1234-5678',
        profileImage: 'https://i.pravatar.cc/150?img=1',
      },
    });

    const user2 = await prisma.user.create({
      data: {
        email: 'user2@example.com',
        password,
        name: '사용자2',
        role: 'USER',
        phoneNumber: '010-2345-6789',
        profileImage: 'https://i.pravatar.cc/150?img=2',
      },
    });

    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password,
        name: '관리자',
        role: 'ADMIN',
        phoneNumber: '010-9876-5432',
        profileImage: 'https://i.pravatar.cc/150?img=3',
      },
    });

    console.log('사용자 생성 완료:', { user1, user2, admin });

    // 게시글 생성
    const post1 = await prisma.post.create({
      data: {
        title: 'BTS 콘서트 티켓 판매',
        content: 'BTS 콘서트 티켓 2장 판매합니다. 원가에 양도합니다.',
        category: 'TICKET_SALE',
        authorId: user1.id,
        eventName: 'BTS WORLD TOUR',
        eventDate: '2025-05-15',
        eventVenue: '올림픽 체조경기장',
        ticketPrice: BigInt(150000),
        contactInfo: 'user1@example.com',
        status: 'ACTIVE',
        viewCount: 120,
      },
    });

    const post2 = await prisma.post.create({
      data: {
        title: '아이유 콘서트 티켓 구해요',
        content: '아이유 콘서트 티켓 1장 구합니다. 어느 구역이든 상관없습니다.',
        category: 'TICKET_REQUEST',
        authorId: user2.id,
        eventName: '아이유 TOUR 2025',
        eventDate: '2025-06-20',
        eventVenue: '고척 스카이돔',
        ticketPrice: BigInt(130000),
        contactInfo: 'user2@example.com',
        status: 'ACTIVE',
        viewCount: 85,
      },
    });

    const post3 = await prisma.post.create({
      data: {
        title: '세븐틴 콘서트 티켓 판매합니다',
        content: '세븐틴 콘서트 티켓 2장 판매합니다. 일반석입니다.',
        category: 'TICKET_SALE',
        authorId: user1.id,
        eventName: '세븐틴 WORLD TOUR',
        eventDate: '2025-03-20',
        eventVenue: '잠실종합운동장 주경기장',
        ticketPrice: BigInt(140000),
        contactInfo: 'user1@example.com',
        status: 'ACTIVE',
        viewCount: 230,
      },
    });

    console.log('게시글 생성 완료');

    // 구매 내역 생성
    const purchase1 = await prisma.purchase.create({
      data: {
        buyerId: user2.id,
        sellerId: user1.id,
        postId: post1.id,
        quantity: 1,
        totalPrice: BigInt(150000),
        status: 'COMPLETED',
        paymentMethod: 'BANK_TRANSFER',
        ticketTitle: 'BTS WORLD TOUR',
        eventDate: '2025-05-15',
        eventVenue: '올림픽 체조경기장',
        ticketPrice: BigInt(150000),
      },
    });

    // 알림 생성
    await prisma.notification.create({
      data: {
        userId: user1.id,
        message: '티켓 판매가 완료되었습니다.',
        type: 'SALE_COMPLETED',
        postId: post1.id,
      },
    });

    await prisma.notification.create({
      data: {
        userId: user2.id,
        message: '티켓 구매가 완료되었습니다.',
        type: 'PURCHASE_COMPLETED',
        postId: post1.id,
      },
    });

    console.log('시드 데이터 생성 완료');
  } catch (error) {
    console.error('시드 실행 오류:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 