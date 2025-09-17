import { query } from './db-utils';

/**
 * 전화번호에서 username을 생성합니다.
 * 010과 하이픈을 제외한 8자리 숫자로 username을 생성하고,
 * 중복이 있을 경우 suffix를 추가합니다.
 *
 * @param phone - 전화번호 (예: "010-2222-0201")
 * @param userId - 현재 사용자 ID (자기 자신 제외용)
 * @returns 생성된 username 또는 null
 */
export async function generateUsernameFromPhone(
  phone: string | null | undefined,
  userId?: number
): Promise<string | null> {
  // phone이 없거나 빈 문자열인 경우
  if (!phone || phone.trim() === '') {
    return null;
  }

  // 전화번호에서 숫자만 추출
  const phoneDigits = phone.replace(/[^0-9]/g, '');

  // 010으로 시작하는 경우 010 제거
  let baseUsername = phoneDigits;
  if (phoneDigits.startsWith('010')) {
    baseUsername = phoneDigits.substring(3);
  }

  // 8자리가 아닌 경우 처리
  if (baseUsername.length !== 8) {
    console.warn(`Invalid phone number format for username generation: ${phone}`);
    return null;
  }

  // 중복 체크를 위한 쿼리
  let proposedUsername = baseUsername;
  let suffix = 1;

  while (true) {
    // 자기 자신은 제외하고 중복 체크
    const existingUsers = await query<{ id: number }[]>(
      `SELECT id FROM users WHERE username = ? ${userId ? 'AND id != ?' : ''}`,
      userId ? [proposedUsername, userId] : [proposedUsername]
    );

    // 중복이 없으면 현재 username 반환
    if (existingUsers.length === 0) {
      return proposedUsername;
    }

    // 중복이 있으면 suffix 추가
    suffix++;
    proposedUsername = `${baseUsername}_${suffix}`;

    // 무한 루프 방지
    if (suffix > 100) {
      console.error('Too many username collisions, aborting');
      return null;
    }
  }
}

/**
 * 사용자가 admin 계정인지 확인합니다.
 *
 * @param userId - 확인할 사용자 ID
 * @returns admin 여부
 */
export async function isAdminUser(userId: number): Promise<boolean> {
  const users = await query<{ username: string }[]>(
    'SELECT username FROM users WHERE id = ?',
    [userId]
  );

  return users.length > 0 && users[0].username === 'admin';
}

/**
 * 전화번호가 변경되었는지 확인합니다.
 *
 * @param userId - 사용자 ID
 * @param newPhone - 새로운 전화번호
 * @returns 변경 여부
 */
export async function hasPhoneChanged(
  userId: number,
  newPhone: string | null | undefined
): Promise<boolean> {
  const users = await query<{ phone: string | null }[]>(
    'SELECT phone FROM users WHERE id = ?',
    [userId]
  );

  if (users.length === 0) {
    return false;
  }

  const currentPhone = users[0].phone;

  // 둘 다 null이거나 빈 문자열인 경우
  if ((!currentPhone || currentPhone === '') && (!newPhone || newPhone === '')) {
    return false;
  }

  return currentPhone !== newPhone;
}