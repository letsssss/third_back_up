import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 12자리 랜덤 숫자 생성 함수
function generateRandomProductNumber(): string {
  // 12자리 랜덤 숫자 생성
  let result = '';
  // 첫 번째 자리는 0이 아닌 숫자로 시작하도록 함
  result += Math.floor(Math.random() * 9) + 1;
  // 나머지 11자리는 0-9 사이의 숫자
  for (let i = 0; i < 11; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

// 중복 검사를 통해 유니크한 productNumber 생성
async function generateUniqueProductNumber(): Promise<string> {
  // 최대 10번까지 시도
  const maxAttempts = 10;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    const productNumber = generateRandomProductNumber();
    
    // 중복 검사
    const existingPost = await prisma.post.findFirst({
      where: {
        productNumber: productNumber as any, // 타입 오류 우회
      }
    });
    
    // 중복이 없으면 해당 번호 반환
    if (!existingPost) {
      return productNumber;
    }
    
    console.log(`productNumber ${productNumber} 중복 발견. 재시도 (${attempts}/${maxAttempts})...`);
  }
  
  // 최대 시도 횟수를 초과하면 타임스탬프를 추가하여 유니크한 값 생성
  const timestamp = Date.now().toString().slice(-5);
  const randomPart = generateRandomProductNumber().slice(0, 7);
  return randomPart + timestamp;
}

async function migrateProductNumbers() {
  console.log('마이그레이션 시작: productNumber 추가');
  
  try {
    // productNumber가 없는 게시물 조회
    const postsWithoutProductNumber = await prisma.post.findMany({
      where: {
        productNumber: null as any, // 타입 오류 우회
      }
    });
    
    console.log(`productNumber가 없는 게시물 수: ${postsWithoutProductNumber.length}`);
    
    if (postsWithoutProductNumber.length === 0) {
      console.log('모든 게시물에 이미 productNumber가 설정되어 있습니다.');
      return;
    }
    
    // 각 게시물에 productNumber 추가
    const updatedPosts = [];
    for (const post of postsWithoutProductNumber) {
      const productNumber = await generateUniqueProductNumber();
      
      const updatedPost = await prisma.post.update({
        where: { id: post.id },
        data: {
          productNumber: productNumber as any, // 타입 오류 우회
        }
      });
      
      updatedPosts.push({
        id: updatedPost.id,
        productNumber: productNumber
      });
      
      console.log(`게시물 ID ${post.id}에 productNumber ${productNumber} 추가 완료`);
    }
    
    console.log(`마이그레이션 완료: ${updatedPosts.length}개의 게시물에 productNumber가 추가되었습니다.`);
    console.log('업데이트된 게시물:', updatedPosts);
    
  } catch (error) {
    console.error('마이그레이션 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 마이그레이션 실행
migrateProductNumbers()
  .then(() => console.log('마이그레이션 프로세스 완료'))
  .catch(e => console.error('마이그레이션 실패:', e)); 