-- Migration 011: unit_bills의 tenant_name_snapshot 백필
-- 기존 unit_bills에서 tenant_name_snapshot이 NULL인 레코드에
-- tenants 테이블에서 올바른 거주자명을 채워넣음
-- Created: 2026-03-05

-- 1차: tenant_id가 이미 설정되어 있지만 snapshot이 NULL인 경우
UPDATE unit_bills ub
JOIN tenants t ON ub.tenant_id = t.id
SET ub.tenant_name_snapshot = t.name
WHERE ub.tenant_name_snapshot IS NULL
  AND ub.tenant_id IS NOT NULL;

-- 2차: tenant_id도 NULL인 경우 → 해당 호실의 가장 먼저 입주한 tenant에서 매칭
UPDATE unit_bills ub
JOIN (
  SELECT ub2.id AS ubid,
    (SELECT t.name FROM tenants t
     WHERE t.unit_id = ub2.unit_id
     ORDER BY t.move_in_date ASC LIMIT 1) AS tname,
    (SELECT t.id FROM tenants t
     WHERE t.unit_id = ub2.unit_id
     ORDER BY t.move_in_date ASC LIMIT 1) AS tid
  FROM unit_bills ub2
  WHERE ub2.tenant_name_snapshot IS NULL AND ub2.tenant_id IS NULL
) sub ON ub.id = sub.ubid
SET ub.tenant_name_snapshot = sub.tname,
    ub.tenant_id = sub.tid
WHERE sub.tname IS NOT NULL;

-- 검증: NULL이 남아있는지 확인
SELECT
  COUNT(*) AS total_unit_bills,
  SUM(CASE WHEN tenant_name_snapshot IS NULL THEN 1 ELSE 0 END) AS still_null_snapshot
FROM unit_bills;
