import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db-utils";
import bcrypt from "bcryptjs";
import { generateUsernameFromPhone, isAdminUser, hasPhoneChanged } from "@/lib/user-utils";

interface UserProfile {
  id: number;
  username: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  unit_number: string | null;
  move_in_date: Date | null;
  move_out_date: Date | null;
}

// GET: 현재 사용자 프로필 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const users = await query<UserProfile[]>(`
      SELECT
        u.id,
        u.username,
        u.full_name,
        u.phone,
        u.email,
        u.move_in_date,
        u.move_out_date,
        units.unit_number
      FROM users u
      LEFT JOIN units ON u.unit_id = units.id
      WHERE u.id = ?
    `, [session.user.id]);

    if (users.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(users[0]);
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: 프로필 업데이트
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { full_name, phone, email, currentPassword, newPassword } = body;

    // 입력값 검증
    if (!full_name || full_name.trim().length === 0) {
      return NextResponse.json(
        { error: "이름을 입력해주세요" },
        { status: 400 }
      );
    }

    // 전화번호 형식 검증 (선택사항)
    if (phone && !/^[0-9-]+$/.test(phone)) {
      return NextResponse.json(
        { error: "올바른 전화번호 형식이 아닙니다" },
        { status: 400 }
      );
    }

    // 이메일 형식 검증 (선택사항)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "올바른 이메일 형식이 아닙니다" },
        { status: 400 }
      );
    }

    // 비밀번호 변경을 원하는 경우
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "현재 비밀번호를 입력해주세요" },
          { status: 400 }
        );
      }

      if (newPassword.length < 4) {
        return NextResponse.json(
          { error: "새 비밀번호는 최소 4자 이상이어야 합니다" },
          { status: 400 }
        );
      }

      // 현재 비밀번호 확인
      const users = await query<{ password: string }[]>(
        `SELECT password FROM users WHERE id = ?`,
        [session.user.id]
      );

      if (users.length === 0) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: "현재 비밀번호가 일치하지 않습니다" },
          { status: 400 }
        );
      }

      // 새 비밀번호 해싱 후 업데이트
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // 전화번호 변경 체크 및 username 생성
      const phoneChanged = await hasPhoneChanged(Number(session.user.id), phone);
      const isAdmin = await isAdminUser(Number(session.user.id));
      let newUsername = null;

      if (phoneChanged && !isAdmin) {
        newUsername = await generateUsernameFromPhone(phone, Number(session.user.id));
      }

      if (newUsername) {
        await query(
          `UPDATE users
           SET full_name = ?, phone = ?, email = ?, password = ?, username = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [full_name.trim(), phone || null, email || null, hashedPassword, newUsername, session.user.id]
        );
      } else {
        await query(
          `UPDATE users
           SET full_name = ?, phone = ?, email = ?, password = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [full_name.trim(), phone || null, email || null, hashedPassword, session.user.id]
        );
      }
    } else {
      // 비밀번호 변경 없이 다른 정보만 업데이트

      // 전화번호 변경 체크 및 username 생성
      const phoneChanged = await hasPhoneChanged(Number(session.user.id), phone);
      const isAdmin = await isAdminUser(Number(session.user.id));
      let newUsername = null;

      if (phoneChanged && !isAdmin) {
        newUsername = await generateUsernameFromPhone(phone, Number(session.user.id));
      }

      if (newUsername) {
        await query(
          `UPDATE users
           SET full_name = ?, phone = ?, email = ?, username = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [full_name.trim(), phone || null, email || null, newUsername, session.user.id]
        );
      } else {
        await query(
          `UPDATE users
           SET full_name = ?, phone = ?, email = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [full_name.trim(), phone || null, email || null, session.user.id]
        );
      }
    }

    // 업데이트된 프로필 정보 반환
    const updatedUsers = await query<UserProfile[]>(`
      SELECT
        u.id,
        u.username,
        u.full_name,
        u.phone,
        u.email,
        u.move_in_date,
        u.move_out_date,
        units.unit_number
      FROM users u
      LEFT JOIN units ON u.unit_id = units.id
      WHERE u.id = ?
    `, [session.user.id]);

    return NextResponse.json({
      success: true,
      user: updatedUsers[0]
    });

  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "프로필 업데이트 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}