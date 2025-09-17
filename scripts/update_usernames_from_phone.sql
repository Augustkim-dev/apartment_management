-- users 테이블의 username을 phone 번호 기반으로 업데이트
-- phone에서 010과 하이픈(-)을 제외한 8자리 숫자로 username 생성
-- admin 계정은 제외
-- Created: 2025-01-17

-- 1. 먼저 현재 상태 백업 (선택사항)
-- CREATE TABLE users_backup AS SELECT * FROM users;

-- 2. 변경 전 데이터 확인
SELECT '=== 변경 전 데이터 ===' AS '';
SELECT
    id,
    username,
    phone,
    role
FROM users
WHERE role != 'admin'
ORDER BY id
LIMIT 10;

-- 3. 중복 체크를 위한 준비
-- phone에서 8자리 숫자 추출하여 확인
SELECT '=== 생성될 username 미리보기 ===' AS '';
SELECT
    id,
    username AS '현재_username',
    phone AS '전화번호',
    REPLACE(REPLACE(phone, '010-', ''), '-', '') AS '새_username_예정',
    role
FROM users
WHERE role != 'admin'
  AND phone IS NOT NULL
  AND phone != ''
ORDER BY id
LIMIT 20;

-- 4. 중복되는 전화번호 패턴 확인
SELECT '=== 중복 전화번호 패턴 확인 ===' AS '';
SELECT
    REPLACE(REPLACE(phone, '010-', ''), '-', '') AS phone_pattern,
    COUNT(*) as count
FROM users
WHERE role != 'admin'
  AND phone IS NOT NULL
GROUP BY REPLACE(REPLACE(phone, '010-', ''), '-', '')
HAVING COUNT(*) > 1;

-- 5. 실제 업데이트 수행 (간단한 방식)
-- 각 사용자의 phone에서 8자리 숫자를 추출하여 username으로 설정
-- 중복이 있을 경우 id를 suffix로 추가
UPDATE users
SET username = CASE
    WHEN phone IS NULL OR phone = '' THEN username
    WHEN EXISTS (
        SELECT 1 FROM (
            SELECT id, REPLACE(REPLACE(phone, '010-', ''), '-', '') AS extracted
            FROM users
            WHERE role != 'admin'
        ) AS t
        WHERE t.extracted = REPLACE(REPLACE(users.phone, '010-', ''), '-', '')
          AND t.id < users.id
    )
    THEN CONCAT(REPLACE(REPLACE(phone, '010-', ''), '-', ''), '_', id)
    ELSE REPLACE(REPLACE(phone, '010-', ''), '-', '')
END
WHERE role != 'admin'
  AND phone IS NOT NULL
  AND phone != '';

-- 6. 업데이트 결과 확인
SELECT '=== 변경 후 데이터 ===' AS '';
SELECT
    id,
    username,
    phone,
    role
FROM users
WHERE role != 'admin'
ORDER BY id
LIMIT 20;

-- 7. 중복 확인 (중복이 없어야 함)
SELECT '=== username 중복 체크 ===' AS '';
SELECT
    username,
    COUNT(*) as count
FROM users
GROUP BY username
HAVING COUNT(*) > 1;