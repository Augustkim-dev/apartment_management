-- 아르노빌리지 전기료 관리 시스템 Database Reset Script
-- 모든 테이블을 삭제하고 새로 생성합니다 (더미 데이터 없음)
-- Created: 2025-01-16

-- 외래 키 체크 비활성화
SET FOREIGN_KEY_CHECKS = 0;

-- 기존 테이블 삭제 (종속성 순서대로)
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

-- ========================================
-- 1. 사용자 테이블
-- ========================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'viewer') DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 2. 호실 정보 테이블
-- ========================================
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

-- ========================================
-- 3. 납부 정보 테이블
-- ========================================
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

-- ========================================
-- 4. 월별 청구서 (건물 전체)
-- ========================================
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

    -- 납부 정보
    due_date DATE,
    payment_info_id INT,

    -- 파일 정보
    pdf_file_name VARCHAR(255),
    excel_file_name VARCHAR(255),

    -- 메타 정보
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_bill_period (bill_year, bill_month),
    FOREIGN KEY (payment_info_id) REFERENCES payment_info(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_bill_period (bill_year, bill_month),
    INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 5. 호실별 청구서
-- ========================================
CREATE TABLE unit_bills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    monthly_bill_id INT NOT NULL,
    unit_id INT NOT NULL,

    -- 검침 정보
    previous_reading DECIMAL(10, 2),
    current_reading DECIMAL(10, 2),
    usage_amount DECIMAL(10, 2) NOT NULL,
    usage_rate DECIMAL(10, 4) NOT NULL,

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

    -- 전월 대비 정보
    previous_month_total DECIMAL(10, 2),

    -- 미납 정보
    unpaid_amount DECIMAL(10, 2) DEFAULT 0,

    -- 납부 정보
    due_date DATE,
    payment_status ENUM('pending', 'paid', 'overdue') DEFAULT 'pending',
    payment_date DATE,
    payment_method VARCHAR(50),

    -- 기타
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_unit_bill (monthly_bill_id, unit_id),
    FOREIGN KEY (monthly_bill_id) REFERENCES monthly_bills(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    INDEX idx_unit_id (unit_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 6. 미납 이력
-- ========================================
CREATE TABLE unpaid_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    unit_id INT NOT NULL,
    unit_bill_id INT,
    bill_year INT NOT NULL,
    bill_month INT NOT NULL,
    unpaid_amount DECIMAL(10, 2) NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_bill_id) REFERENCES unit_bills(id) ON DELETE SET NULL,
    INDEX idx_unit_id (unit_id),
    INDEX idx_is_paid (is_paid),
    INDEX idx_bill_period (bill_year, bill_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 7. 청구서 안내사항
-- ========================================
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

-- ========================================
-- 8. 청구서 변경 이력
-- ========================================
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

-- ========================================
-- 9. PDF 파싱 데이터
-- ========================================
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

-- ========================================
-- 10. Excel 파싱 데이터
-- ========================================
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

-- ========================================
-- 필수 초기 데이터 (최소한의 시스템 데이터만)
-- ========================================

-- 관리자 계정 생성 (비밀번호: admin123 - bcrypt 해시)
INSERT INTO users (username, password, role) VALUES
('admin', '$2a$10$8JQXxmPCH3MlE1Y8vGGKuOZPZFJ0RpNZBqYQlFvHhLHLYH3Y6qH3m', 'admin');

-- 기본 납부 정보 (관리사무소 계좌)
INSERT INTO payment_info (bank_name, account_number, account_holder) VALUES
('신한은행', '100-035-727568', '(주)코로코');

-- 호실 정보 (실제 건물 구조)
INSERT INTO units (unit_number, tenant_name, contact, status, meter_number) VALUES
-- 2층 (201-216호)
('201', '입주자201', '010-2222-0201', 'occupied', 'M201-2024'),
('202', '입주자202', '010-2222-0202', 'occupied', 'M202-2024'),
('203', null, null, 'vacant', 'M203-2024'),
('204', '입주자204', '010-2222-0204', 'occupied', 'M204-2024'),
('205', '입주자205', '010-2222-0205', 'occupied', 'M205-2024'),
('206', '입주자206', '010-2222-0206', 'occupied', 'M206-2024'),
('207', '입주자207', '010-2222-0207', 'occupied', 'M207-2024'),
('208', '입주자208', '010-2222-0208', 'occupied', 'M208-2024'),
('209', '입주자209', '010-2222-0209', 'occupied', 'M209-2024'),
('210', '입주자210', '010-2222-0210', 'occupied', 'M210-2024'),
('211', '입주자211', '010-2222-0211', 'occupied', 'M211-2024'),
('212', '입주자212', '010-2222-0212', 'occupied', 'M212-2024'),
('213', '입주자213', '010-2222-0213', 'occupied', 'M213-2024'),
('214', '입주자214', '010-2222-0214', 'occupied', 'M214-2024'),
('215', '입주자215', '010-2222-0215', 'occupied', 'M215-2024'),
('216', '입주자216', '010-2222-0216', 'occupied', 'M216-2024'),
-- 3층 (301-316호)
('301', '입주자301', '010-3333-0301', 'occupied', 'M301-2024'),
('302', '입주자302', '010-3333-0302', 'occupied', 'M302-2024'),
('303', '입주자303', '010-3333-0303', 'occupied', 'M303-2024'),
('304', '입주자304', '010-3333-0304', 'occupied', 'M304-2024'),
('305', '입주자305', '010-3333-0305', 'occupied', 'M305-2024'),
('306', '입주자306', '010-3333-0306', 'occupied', 'M306-2024'),
('307', '입주자307', '010-3333-0307', 'occupied', 'M307-2024'),
('308', '입주자308', '010-3333-0308', 'occupied', 'M308-2024'),
('309', '입주자309', '010-3333-0309', 'occupied', 'M309-2024'),
('310', '입주자310', '010-3333-0310', 'occupied', 'M310-2024'),
('311', '입주자311', '010-3333-0311', 'occupied', 'M311-2024'),
('312', '입주자312', '010-3333-0312', 'occupied', 'M312-2024'),
('313', '입주자313', '010-3333-0313', 'occupied', 'M313-2024'),
('314', '입주자314', '010-3333-0314', 'occupied', 'M314-2024'),
('315', '입주자315', '010-3333-0315', 'occupied', 'M315-2024'),
('316', '입주자316', '010-3333-0316', 'occupied', 'M316-2024'),  -- 공실
-- 4층 (401-416호)
('401', '입주자401', '010-4444-0401', 'occupied', 'M401-2024'),
('402', '입주자402', '010-4444-0402', 'occupied', 'M402-2024'),
('403', '입주자403', '010-4444-0403', 'occupied', 'M403-2024'),
('404', '입주자404', '010-4444-0404', 'occupied', 'M404-2024'),
('405', '입주자405', '010-4444-0405', 'occupied', 'M405-2024'),
('406', '입주자406', '010-4444-0406', 'occupied', 'M406-2024'),
('407', '입주자407', '010-4444-0407', 'occupied', 'M407-2024'),
('408', '입주자408', '010-4444-0408', 'occupied', 'M408-2024'),  -- 공실
('409', '입주자409', '010-4444-0409', 'occupied', 'M409-2024'),
('410', '입주자410', '010-4444-0410', 'occupied', 'M410-2024'),
('411', '입주자411', '010-4444-0411', 'occupied', 'M411-2024'),
('412', '입주자412', '010-4444-0412', 'occupied', 'M412-2024'),
('413', '입주자413', '010-4444-0413', 'occupied', 'M413-2024'),
('414', '입주자414', '010-4444-0414', 'occupied', 'M414-2024'),
('415', '입주자415', '010-4444-0415', 'occupied', 'M415-2024'),
('416', '입주자416', '010-4444-0416', 'occupied', 'M416-2024');

-- ========================================
-- 완료 메시지
-- ========================================
SELECT '데이터베이스 초기화 완료' as message;
SELECT '관리자 계정: admin / admin123' as info;
SELECT '모든 테이블이 생성되었습니다. 실제 데이터는 업로드를 통해 입력하세요.' as notice;