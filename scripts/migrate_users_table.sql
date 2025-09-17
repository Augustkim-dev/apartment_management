-- 아르노빌리지 전기료 관리 시스템
-- Users 테이블 마이그레이션 스크립트
-- 작성일: 2025-01-17
-- 목적: 인증 시스템 구현을 위한 users 테이블 확장

-- ========================================
-- 1. users 테이블 변경
-- ========================================

-- 새로운 컬럼 추가
ALTER TABLE users
ADD COLUMN unit_id INT AFTER role,
ADD COLUMN status ENUM('active', 'inactive', 'pending') DEFAULT 'pending' AFTER unit_id,
ADD COLUMN full_name VARCHAR(100) AFTER status,
ADD COLUMN phone VARCHAR(20) AFTER full_name,
ADD COLUMN email VARCHAR(100) AFTER phone,
ADD COLUMN move_in_date DATE AFTER email,
ADD COLUMN move_out_date DATE AFTER move_in_date;

-- 외래 키 제약 추가
ALTER TABLE users
ADD CONSTRAINT fk_users_unit_id
FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL;

-- 인덱스 추가
ALTER TABLE users
ADD INDEX idx_unit_id (unit_id),
ADD INDEX idx_status (status),
ADD INDEX idx_move_in_date (move_in_date);

-- ========================================
-- 2. 기존 units 데이터를 users로 마이그레이션
-- ========================================

-- 입주자가 있는 호실들에 대해 사용자 계정 생성
INSERT INTO users (username, password, role, unit_id, status, full_name, phone, move_in_date, created_at)
SELECT
    CONCAT('user_', unit_number) as username,
    '$2a$10$kJQXxmPCH3MlE1Y8vGGKuOhI6K.0RpNZBqYQlFvHhLHLYH3Y6qH3m' as password, -- 기본 비밀번호: 0000
    'viewer' as role,
    id as unit_id,
    'active' as status,
    tenant_name as full_name,
    contact as phone,
    '2024-01-01' as move_in_date, -- 기본 입주일
    CURRENT_TIMESTAMP as created_at
FROM units
WHERE status = 'occupied'
AND tenant_name IS NOT NULL;

-- ========================================
-- 3. 관리자 계정 업데이트 (기본 비밀번호 0000으로 변경)
-- ========================================

-- admin 계정 비밀번호를 0000으로 변경
UPDATE users
SET password = '$2a$10$kJQXxmPCH3MlE1Y8vGGKuOhI6K.0RpNZBqYQlFvHhLHLYH3Y6qH3m',
    status = 'active',
    full_name = '시스템 관리자'
WHERE username = 'admin';

-- ========================================
-- 4. 데이터 검증
-- ========================================

-- 생성된 사용자 확인
SELECT
    u.id,
    u.username,
    u.role,
    u.status,
    u.full_name,
    u.phone,
    units.unit_number,
    u.move_in_date
FROM users u
LEFT JOIN units ON u.unit_id = units.id
ORDER BY u.role DESC, units.unit_number;

-- ========================================
-- 5. units 테이블에서 tenant_name, contact 컬럼 사용 중단 표시
-- (실제 삭제는 데이터 확인 후 별도로 진행)
-- ========================================

-- 주석으로 표시 (실제 삭제는 나중에)
-- ALTER TABLE units
-- DROP COLUMN tenant_name,
-- DROP COLUMN contact;

-- ========================================
-- 완료 메시지
-- ========================================
SELECT '사용자 테이블 마이그레이션 완료' as message;
SELECT CONCAT('생성된 사용자 계정 수: ', COUNT(*)) as info
FROM users WHERE role = 'viewer';
SELECT '모든 사용자의 기본 비밀번호는 0000 입니다.' as notice;