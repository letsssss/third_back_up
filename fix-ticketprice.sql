-- 매우 큰 ticketPrice 값을 가진 레코드 찾기
SELECT id, title, ticketPrice FROM Post WHERE ticketPrice > 2000000000;

-- 매우 큰 티켓 가격을 정수 최대값으로 제한
UPDATE Post SET ticketPrice = 2000000000 WHERE ticketPrice > 2000000000;

-- 수정 후 확인
SELECT id, title, ticketPrice FROM Post WHERE ticketPrice > 1000000000; 