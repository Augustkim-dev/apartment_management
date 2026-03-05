-- Migration 012: unit_bills에 contact_snapshot 컬럼 추가
-- 거주자 전화번호도 청구서 생성 시점의 값을 보존
-- tenant_name_snapshot과 동일한 패턴
-- Created: 2026-03-05

-- 1. 컬럼 추가
ALTER TABLE unit_bills
  ADD COLUMN contact_snapshot VARCHAR(20) DEFAULT NULL AFTER tenant_name_snapshot;

-- 2. 백필: tenant_id가 있는 경우 tenants 테이블에서 채움
UPDATE unit_bills ub
JOIN tenants t ON ub.tenant_id = t.id
SET ub.contact_snapshot = t.contact
WHERE ub.contact_snapshot IS NULL
  AND ub.tenant_id IS NOT NULL
  AND t.contact IS NOT NULL;

-- 3. 백필: tenant_id가 NULL인 경우 → 해당 호실의 첫 번째 tenant에서 매칭
UPDATE unit_bills ub
JOIN (
  SELECT ub2.id AS ubid,
    (SELECT t.contact FROM tenants t
     WHERE t.unit_id = ub2.unit_id
     ORDER BY t.move_in_date ASC LIMIT 1) AS tcontact
  FROM unit_bills ub2
  WHERE ub2.contact_snapshot IS NULL AND ub2.tenant_id IS NULL
) sub ON ub.id = sub.ubid
SET ub.contact_snapshot = sub.tcontact
WHERE sub.tcontact IS NOT NULL;

-- 검증
SELECT
  COUNT(*) AS total_unit_bills,
  SUM(CASE WHEN contact_snapshot IS NULL THEN 1 ELSE 0 END) AS still_null_contact
FROM unit_bills;
