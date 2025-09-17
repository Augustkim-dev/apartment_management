-- ============================================
-- 아르노빌리지 전기료 관리 시스템
-- 배포용 통합 데이터베이스 초기화 스크립트
-- Created: 2025-01-17
--
-- 이 스크립트는 다음 작업을 수행합니다:
-- 1. 모든 테이블 삭제 및 재생성
-- 2. 호실 정보 초기 데이터 입력 (48개 호실)
-- 3. 사용자 계정 생성 (admin + 입주자)
-- 4. 시스템 필수 데이터 설정
-- ============================================

-- 외래 키 체크 비활성화
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- STEP 1: 기존 테이블 삭제
-- ============================================
DROP TABLE IF EXISTS bill_history;
DROP TABLE IF EXISTS billing_notices;
DROP TABLE IF EXISTS unpaid_history;
DROP TABLE IF EXISTS unit_bills;
DROP TABLE IF EXISTS parsed_excel_data;
DROP TABLE IF EXISTS parsed_pdf_data;
DROP TABLE IF EXISTS monthly_bills;
DROP TABLE IF EXISTS payment_info;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS users;

-- 외래 키 체크 활성화
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- STEP 2: 테이블 생성
-- ============================================

-- 1. 사용자 테이블 (확장된 구조)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'viewer') DEFAULT 'viewer',
    unit_id INT,
    status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
    full_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    move_in_date DATE,
    move_out_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_unit_id (unit_id),
    INDEX idx_status (status),
    INDEX idx_move_in_date (move_in_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 호실 정보 테이블
CREATE TABLE units (
    id INT PRIMARY KEY AUTO_INCREMENT,
    unit_number VARCHAR(10) UNIQUE NOT NULL,
    tenant_name VARCHAR(100),
    contact VARCHAR(20),
    email VARCHAR(100),
    status ENUM('occupied', 'vacant') DEFAULT 'occupied',
    move_in_date DATE,
    move_out_date DATE,
    meter_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_unit_number (unit_number),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 납부 정보 테이블
CREATE TABLE payment_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bank_name VARCHAR(50) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_holder VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 월별 청구서 (건물 전체)
CREATE TABLE monthly_bills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bill_year INT NOT NULL,
    bill_month INT NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,

    -- 사용량 정보
    previous_reading DECIMAL(10, 2),
    current_reading DECIMAL(10, 2),
    total_usage DECIMAL(10, 2) NOT NULL,

    -- 요금 상세 (8개 항목)
    basic_fee DECIMAL(10, 2),
    power_fee DECIMAL(10, 2),
    climate_fee DECIMAL(10, 2),
    fuel_fee DECIMAL(10, 2),
    power_factor_fee DECIMAL(10, 2),
    vat DECIMAL(10, 2),
    power_fund DECIMAL(10, 2),
    tv_license_fee DECIMAL(10, 2),
    round_down DECIMAL(10, 2),
    total_amount DECIMAL(10, 2) NOT NULL,

    -- 계약 정보
    contract_type VARCHAR(100),
    contract_power INT,
    applied_power INT,

    -- 시간대별 사용량
    time_slots TEXT,

    -- 메타 정보
    invoice_number VARCHAR(50),
    due_date DATE,
    payment_date DATE,
    pdf_file_id INT,
    excel_file_id INT,
    status ENUM('draft', 'confirmed', 'paid') DEFAULT 'draft',
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_bill_period (bill_year, bill_month),
    INDEX idx_year_month (bill_year, bill_month),
    INDEX idx_due_date (due_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 호실별 청구서
CREATE TABLE unit_bills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    monthly_bill_id INT NOT NULL,
    unit_id INT NOT NULL,

    -- 사용량 정보
    unit_usage DECIMAL(10, 2),
    usage_ratio DECIMAL(5, 4),

    -- 계산된 요금 (8개 항목)
    basic_fee DECIMAL(10, 2),
    power_fee DECIMAL(10, 2),
    climate_fee DECIMAL(10, 2),
    fuel_fee DECIMAL(10, 2),
    power_factor_fee DECIMAL(10, 2),
    vat DECIMAL(10, 2),
    power_fund DECIMAL(10, 2),
    tv_license_fee DECIMAL(10, 2),
    round_adjustment DECIMAL(10, 2),
    total_amount DECIMAL(10, 2) NOT NULL,

    -- 납부 정보
    due_date DATE,
    payment_date DATE,
    payment_method VARCHAR(50),
    payment_amount DECIMAL(10, 2),
    payment_status ENUM('pending', 'partial', 'paid', 'overdue') DEFAULT 'pending',

    -- 기타
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (monthly_bill_id) REFERENCES monthly_bills(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    UNIQUE KEY unique_unit_bill (monthly_bill_id, unit_id),
    INDEX idx_monthly_bill (monthly_bill_id),
    INDEX idx_unit (unit_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 미납 이력
CREATE TABLE unpaid_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    unit_bill_id INT NOT NULL,
    unpaid_amount DECIMAL(10, 2) NOT NULL,
    unpaid_months INT DEFAULT 1,
    notice_sent_date DATE,
    notice_count INT DEFAULT 0,
    resolved_date DATE,
    resolution_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (unit_bill_id) REFERENCES unit_bills(id) ON DELETE CASCADE,
    INDEX idx_unit_bill (unit_bill_id),
    INDEX idx_resolved (resolved_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 청구서 공지사항
CREATE TABLE billing_notices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    monthly_bill_id INT NOT NULL,
    notice_content TEXT NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (monthly_bill_id) REFERENCES monthly_bills(id) ON DELETE CASCADE,
    INDEX idx_monthly_bill (monthly_bill_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. 청구서 변경 이력
CREATE TABLE bill_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    unit_bill_id INT NOT NULL,
    action ENUM('created', 'updated', 'paid', 'cancelled') NOT NULL,
    old_values TEXT,
    new_values TEXT,
    changed_by INT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (unit_bill_id) REFERENCES unit_bills(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_unit_bill (unit_bill_id),
    INDEX idx_action (action),
    INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. PDF 파싱 데이터
CREATE TABLE parsed_pdf_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    monthly_bill_id INT,
    file_name VARCHAR(255) NOT NULL,
    file_hash VARCHAR(64),

    -- 고객 정보
    customer_number VARCHAR(50),
    invoice_number VARCHAR(50),

    -- 청구 기간
    billing_period_start DATE,
    billing_period_end DATE,

    -- 검침 정보
    previous_reading DECIMAL(10, 2),
    current_reading DECIMAL(10, 2),
    total_usage DECIMAL(10, 2),

    -- 요금 상세
    basic_fee DECIMAL(10, 2),
    power_fee DECIMAL(10, 2),
    climate_fee DECIMAL(10, 2),
    fuel_fee DECIMAL(10, 2),
    power_factor_fee DECIMAL(10, 2),
    vat DECIMAL(10, 2),
    power_fund DECIMAL(10, 2),
    tv_license_fee DECIMAL(10, 2),
    round_down DECIMAL(10, 2),
    total_amount DECIMAL(10, 2),

    -- 계약 정보
    contract_type VARCHAR(100),
    contract_power INT,

    -- 기타 정보
    due_date DATE,
    raw_text TEXT,
    parsed_data TEXT,
    parse_warnings TEXT,

    -- 메타 정보
    parsed_by INT,
    parsed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (monthly_bill_id) REFERENCES monthly_bills(id) ON DELETE SET NULL,
    FOREIGN KEY (parsed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_file_hash (file_hash),
    INDEX idx_parsed_at (parsed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Excel 파싱 데이터
CREATE TABLE parsed_excel_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    monthly_bill_id INT,
    file_name VARCHAR(255) NOT NULL,
    file_hash VARCHAR(64),
    sheet_name VARCHAR(100),
    total_units INT,
    total_usage DECIMAL(10, 2),
    average_usage DECIMAL(10, 2),
    unit_data TEXT,
    column_mapping TEXT,
    parse_warnings TEXT,
    parsed_by INT,
    parsed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (monthly_bill_id) REFERENCES monthly_bills(id) ON DELETE SET NULL,
    FOREIGN KEY (parsed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_file_hash (file_hash),
    INDEX idx_parsed_at (parsed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 외래 키 제약 추가 (users.unit_id -> units.id)
ALTER TABLE users
ADD CONSTRAINT fk_users_unit_id
FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL;

-- ============================================
-- STEP 3: 필수 초기 데이터 입력
-- ============================================

-- 1. 납부 정보 (관리사무소 계좌)
INSERT INTO payment_info (bank_name, account_number, account_holder) VALUES
('신한은행', '100-035-727568', '(주)코로코');

-- 2. 호실 정보 입력 (총 48개)
INSERT INTO units (unit_number, tenant_name, contact, status, meter_number) VALUES
-- 2층 (201-216호) - 16개
('201', '김철수', '010-2222-0201', 'occupied', 'M201-2024'),
('202', '이영희', '010-2222-0202', 'occupied', 'M202-2024'),
('203', NULL, NULL, 'vacant', 'M203-2024'),  -- 공실
('204', '박민수', '010-2222-0204', 'occupied', 'M204-2024'),
('205', '최정아', '010-2222-0205', 'occupied', 'M205-2024'),
('206', '정대현', '010-2222-0206', 'occupied', 'M206-2024'),
('207', '강미영', '010-2222-0207', 'occupied', 'M207-2024'),
('208', '윤성호', '010-2222-0208', 'occupied', 'M208-2024'),
('209', '한지민', '010-2222-0209', 'occupied', 'M209-2024'),
('210', '송재욱', '010-2222-0210', 'occupied', 'M210-2024'),
('211', '김나연', '010-2222-0211', 'occupied', 'M211-2024'),
('212', '이준호', '010-2222-0212', 'occupied', 'M212-2024'),
('213', '박서연', '010-2222-0213', 'occupied', 'M213-2024'),
('214', '최동욱', '010-2222-0214', 'occupied', 'M214-2024'),
('215', '정유진', '010-2222-0215', 'occupied', 'M215-2024'),
('216', '강태영', '010-2222-0216', 'occupied', 'M216-2024'),

-- 3층 (301-316호) - 16개
('301', '윤미래', '010-3333-0301', 'occupied', 'M301-2024'),
('302', '한승우', '010-3333-0302', 'occupied', 'M302-2024'),
('303', '송하늘', '010-3333-0303', 'occupied', 'M303-2024'),
('304', '김예진', '010-3333-0304', 'occupied', 'M304-2024'),
('305', '이도현', '010-3333-0305', 'occupied', 'M305-2024'),
('306', '박주현', '010-3333-0306', 'occupied', 'M306-2024'),
('307', '최서준', '010-3333-0307', 'occupied', 'M307-2024'),
('308', '정민아', '010-3333-0308', 'occupied', 'M308-2024'),
('309', '강현수', '010-3333-0309', 'occupied', 'M309-2024'),
('310', '윤지호', '010-3333-0310', 'occupied', 'M310-2024'),
('311', '한소연', '010-3333-0311', 'occupied', 'M311-2024'),
('312', '송민재', '010-3333-0312', 'occupied', 'M312-2024'),
('313', '김수빈', '010-3333-0313', 'occupied', 'M313-2024'),
('314', '이재원', '010-3333-0314', 'occupied', 'M314-2024'),
('315', '박진영', '010-3333-0315', 'occupied', 'M315-2024'),
('316', NULL, NULL, 'vacant', 'M316-2024'),  -- 공실

-- 4층 (401-416호) - 16개
('401', '최유나', '010-4444-0401', 'occupied', 'M401-2024'),
('402', '정승현', '010-4444-0402', 'occupied', 'M402-2024'),
('403', '강다은', '010-4444-0403', 'occupied', 'M403-2024'),
('404', '윤태호', '010-4444-0404', 'occupied', 'M404-2024'),
('405', '한지우', '010-4444-0405', 'occupied', 'M405-2024'),
('406', '송은지', '010-4444-0406', 'occupied', 'M406-2024'),
('407', '김민준', '010-4444-0407', 'occupied', 'M407-2024'),
('408', NULL, NULL, 'vacant', 'M408-2024'),  -- 공실
('409', '이서윤', '010-4444-0409', 'occupied', 'M409-2024'),
('410', '박현우', '010-4444-0410', 'occupied', 'M410-2024'),
('411', '최지훈', '010-4444-0411', 'occupied', 'M411-2024'),
('412', '정예린', '010-4444-0412', 'occupied', 'M412-2024'),
('413', '강민서', '010-4444-0413', 'occupied', 'M413-2024'),
('414', '윤시우', '010-4444-0414', 'occupied', 'M414-2024'),
('415', '한도윤', '010-4444-0415', 'occupied', 'M415-2024'),
('416', '송하윤', '010-4444-0416', 'occupied', 'M416-2024');

-- 3. 관리자 계정 생성 (비밀번호: 0000)
-- $2a$10$kJQXxmPCH3MlE1Y8vGGKuOhI6K.0RpNZBqYQlFvHhLHLYH3Y6qH3m = bcrypt('0000')
INSERT INTO users (username, password, role, status, full_name) VALUES
('admin', '$2a$10$kJQXxmPCH3MlE1Y8vGGKuOhI6K.0RpNZBqYQlFvHhLHLYH3Y6qH3m', 'admin', 'active', '시스템 관리자');

-- 4. 입주자 계정 생성 (비밀번호: 0000)
-- username은 전화번호에서 010과 하이픈 제거한 8자리
INSERT INTO users (username, password, role, unit_id, status, full_name, phone, email, move_in_date)
SELECT
    REPLACE(REPLACE(contact, '010-', ''), '-', '') as username,
    '$2a$10$kJQXxmPCH3MlE1Y8vGGKuOhI6K.0RpNZBqYQlFvHhLHLYH3Y6qH3m' as password,
    'viewer' as role,
    id as unit_id,
    'active' as status,
    tenant_name as full_name,
    contact as phone,
    CONCAT(LOWER(REPLACE(tenant_name, ' ', '')), '@arnovillage.com') as email,
    '2024-01-01' as move_in_date
FROM units
WHERE status = 'occupied' AND tenant_name IS NOT NULL;

-- ============================================
-- STEP 4: 데이터 검증
-- ============================================

-- 생성된 호실 확인
SELECT
    COUNT(*) as total_units,
    SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
    SUM(CASE WHEN status = 'vacant' THEN 1 ELSE 0 END) as vacant
FROM units;

-- 생성된 사용자 확인
SELECT
    COUNT(*) as total_users,
    SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
    SUM(CASE WHEN role = 'viewer' THEN 1 ELSE 0 END) as viewer_count
FROM users;

-- 사용자-호실 매핑 확인
SELECT
    u.username,
    u.full_name,
    u.role,
    units.unit_number,
    u.phone
FROM users u
LEFT JOIN units ON u.unit_id = units.id
ORDER BY u.role DESC, units.unit_number;

-- ============================================
-- 완료 메시지
-- ============================================
SELECT '===========================================' as '';
SELECT '✅ 데이터베이스 초기화 완료' as '상태';
SELECT '===========================================' as '';
SELECT CONCAT('총 ', COUNT(*), '개 호실 생성됨') as '호실 정보' FROM units;
SELECT CONCAT('입주: ', SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END), '개, 공실: ', SUM(CASE WHEN status = 'vacant' THEN 1 ELSE 0 END), '개') as '입주 현황' FROM units;
SELECT '===========================================' as '';
SELECT CONCAT('총 ', COUNT(*), '개 계정 생성됨') as '사용자 계정' FROM users;
SELECT '관리자: admin (비밀번호: 0000)' as '관리자 계정';
SELECT '입주자: 전화번호 끝 8자리 (비밀번호: 0000)' as '입주자 계정';
SELECT '===========================================' as '';
SELECT '납부계좌: 신한은행 100-035-727568 (주)코로코' as '시스템 설정';
SELECT '===========================================' as '';