# 티켓 마켓플레이스 백엔드 설정

## 환경 설정

1. 환경 변수 파일 생성하기:
   `.env` 파일을 루트 디렉토리에 생성하고 다음 내용을 입력합니다:

   ```
   # 데이터베이스 연결 URL
   DATABASE_URL="postgresql://postgres:password@localhost:5432/ticket_marketplace"

   # JWT 시크릿 키
   JWT_SECRET="your-secret-key-change-in-production"
   JWT_REFRESH_SECRET="your-refresh-secret-key-change-in-production"

   # 환경 설정
   NODE_ENV="development"
   ```

   실제 환경에 맞게 데이터베이스 URL과 비밀 키를 수정하세요.

2. 필요한 패키지 설치:
   ```
   npm install @prisma/client bcrypt jsonwebtoken --legacy-peer-deps
   npm install -D @types/bcrypt @types/jsonwebtoken --legacy-peer-deps
   ```

## 데이터베이스 설정

1. PostgreSQL 데이터베이스 생성:
   - PostgreSQL이 설치되어 있어야 합니다.
   - 'ticket_marketplace'라는 이름의 데이터베이스를 생성합니다.

2. Prisma 마이그레이션 실행:
   ```
   npx prisma migrate dev --name init
   ```

3. Prisma 클라이언트 생성:
   ```
   npx prisma generate
   ```

## API 엔드포인트

구현된 API 엔드포인트:

1. 회원가입: `POST /api/auth/register`
   - 요청 본문: `{ "email": "user@example.com", "password": "Password123!", "name": "홍길동", "phoneNumber": "010-1234-5678" }`

2. 로그인: `POST /api/auth/login`
   - 요청 본문: `{ "email": "user@example.com", "password": "Password123!" }`

3. 로그아웃: `POST /api/auth/logout`
   - 요청 헤더: `Authorization: Bearer {액세스토큰}`

4. 현재 사용자 정보: `GET /api/auth/me`
   - 요청 헤더: `Authorization: Bearer {액세스토큰}`

## 보안 참고 사항

- 실제 배포 환경에서는 JWT 시크릿 키를 강력한 무작위 문자열로 변경하세요.
- 프로덕션 환경에서는 HTTPS를 사용하세요.
- 민감한 정보는 항상 암호화하여 저장하세요.

## 데이터 모델 리팩토링: Post와 Purchase 분리

### 목적
- 게시글(Post)이 삭제되어도 구매자와 판매자의 거래 정보(Purchase)는 유지되어야 함
- 채팅, 상세조회 등 모든 기능이 postId에 의존하지 않도록 Purchase 모델만으로도 작동하도록 함

### 변경 사항

1. **Prisma 스키마 변경**
   - Purchase 모델의 postId를 nullable로 변경
   - Post의 주요 정보를 Purchase 모델에 중복 저장
     - `ticketTitle`: 티켓 제목 (post.title)
     - `eventDate`: 이벤트 날짜 (post.eventDate)
     - `eventVenue`: 이벤트 장소 (post.eventVenue)
     - `ticketPrice`: 티켓 가격 (post.ticketPrice)
     - `imageUrl`: 이미지 URL (post.imageUrl)

2. **API 변경**
   - 구매 목록 API에서 Purchase 필드 우선 사용
   - 티켓 구매 API에서 Post 정보를 Purchase에 복제 저장
   - 구매 상세 정보 API에서 post 필드가 없을 때도 작동하도록 수정

3. **UI 변경**
   - 거래 상세 페이지에서 post 필드 대신 Purchase 필드 우선 사용
   - 마이페이지 구매 목록에서 post 필드 대신 Purchase 필드 우선 사용

### 이점
- 데이터 일관성 향상: 게시글 삭제 후에도 거래 정보 유지
- 쿼리 성능 향상: 중첩된 조인 감소
- 의존성 감소: Post 모델에 의존하지 않고 독립적으로 작동 