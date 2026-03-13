-- Migration 013: 2월 청구서 입주자 스냅샷 수정
-- 원인: tenants 테이블의 이전 입주자 정보가 사용되어 잘못된 이름/연락처가 저장됨
-- 수정: units 테이블(현재 입주자 정보)을 기준으로 2월 regular 청구서만 업데이트

-- 수정 전 확인 (어떤 호실이 달라지는지 확인)
SELECT u.unit_number,
       ub.tenant_name_snapshot AS '기존_스냅샷',
       u.tenant_name AS 'units_현재입주자',
       ub.contact_snapshot AS '기존_연락처',
       u.contact AS 'units_연락처'
FROM unit_bills ub
JOIN units u ON ub.unit_id = u.id
WHERE ub.monthly_bill_id = 22
  AND ub.bill_type = 'regular'
  AND (ub.tenant_name_snapshot != u.tenant_name OR ub.contact_snapshot != u.contact)
ORDER BY u.unit_number;

-- 2월(monthly_bill_id=22) regular 타입 unit_bills만 units 테이블 기준으로 수정
UPDATE unit_bills ub
JOIN units u ON ub.unit_id = u.id
SET ub.tenant_name_snapshot = u.tenant_name,
    ub.contact_snapshot = u.contact
WHERE ub.monthly_bill_id = 22
  AND ub.bill_type = 'regular'
  AND u.tenant_name IS NOT NULL;

-- 수정 후 확인
SELECT u.unit_number,
       ub.tenant_name_snapshot AS '수정된_스냅샷',
       u.tenant_name AS 'units_현재입주자',
       ub.contact_snapshot AS '수정된_연락처'
FROM unit_bills ub
JOIN units u ON ub.unit_id = u.id
WHERE ub.monthly_bill_id = 22
  AND ub.bill_type = 'regular'
ORDER BY u.unit_number;
