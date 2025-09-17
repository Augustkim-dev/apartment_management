-- admin 계정 비밀번호를 0000으로 재설정
-- bcryptjs로 생성한 올바른 해시값 사용

UPDATE users
SET password = '$2b$10$FonxG9.7dlhQRxJHDLQgou40h8GGHT3djj2MlbBGQJ6FVxPA3MDBm'
WHERE username = 'admin';

-- 확인
SELECT username, role, status, full_name
FROM users
WHERE username = 'admin';

SELECT '비밀번호가 0000으로 재설정되었습니다.' as message;