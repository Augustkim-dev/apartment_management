import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, execute } from "@/lib/db-utils";
import bcrypt from "bcryptjs";
import { generateUsernameFromPhone, isAdminUser, hasPhoneChanged } from "@/lib/user-utils";

// GET: 특정 유저 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id);

    // 관리자가 아닌 경우 본인 정보만 조회 가능
    if (session.user.role !== 'admin' && session.user.id !== userId.toString()) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const users = await query(
      `SELECT
        u.id,
        u.username,
        u.full_name,
        u.email,
        u.phone,
        u.role,
        u.status,
        u.unit_id,
        units.unit_number,
        u.move_in_date,
        u.move_out_date,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN units ON u.unit_id = units.id
      WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user: users[0] });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PUT: 유저 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id);
    const body = await request.json();

    // 관리자가 아닌 경우 본인 정보만 수정 가능 (제한적)
    if (session.user.role !== 'admin') {
      if (session.user.id !== userId.toString()) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
      // 일반 사용자는 일부 필드만 수정 가능
      const { phone, email, password } = body;

      let updateQuery = "UPDATE users SET phone = ?, email = ?";
      let updateParams = [phone, email];

      // 전화번호가 변경되었고 admin이 아닌 경우 username 자동 생성
      const phoneChanged = await hasPhoneChanged(userId, phone);
      const isAdmin = await isAdminUser(userId);

      if (phoneChanged && !isAdmin) {
        const newUsername = await generateUsernameFromPhone(phone, userId);
        if (newUsername) {
          updateQuery += ", username = ?";
          updateParams.push(newUsername);
        }
      }

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateQuery += ", password = ?";
        updateParams.push(hashedPassword);
      }

      updateQuery += " WHERE id = ?";
      updateParams.push(userId);

      await execute(updateQuery, updateParams);
    } else {
      // 관리자는 모든 필드 수정 가능
      const {
        full_name,
        email,
        phone,
        role,
        status,
        unit_id,
        move_in_date,
        move_out_date,
        password
      } = body;

      // units 테이블 동기화를 위해 먼저 현재 사용자 정보 조회
      const currentUser = await query(
        "SELECT unit_id, full_name, phone, username FROM users WHERE id = ?",
        [userId]
      );
      const oldUnitId = currentUser[0]?.unit_id;
      const oldFullName = currentUser[0]?.full_name;
      const oldPhone = currentUser[0]?.phone;
      const oldUsername = currentUser[0]?.username;

      let updateQuery = `
        UPDATE users SET
          full_name = ?,
          email = ?,
          phone = ?,
          role = ?,
          status = ?,
          unit_id = ?,
          move_in_date = ?,
          move_out_date = ?
      `;
      let updateParams = [
        full_name,
        email,
        phone,
        role,
        status,
        unit_id || null,
        move_in_date || null,
        move_out_date || null
      ];

      // 전화번호가 변경되었고 admin이 아닌 경우 username 자동 생성
      const phoneChanged = await hasPhoneChanged(userId, phone);
      const isAdmin = oldUsername === 'admin';

      if (phoneChanged && !isAdmin) {
        const newUsername = await generateUsernameFromPhone(phone, userId);
        if (newUsername) {
          updateQuery += ", username = ?";
          updateParams.push(newUsername);
        }
      }

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateQuery += ", password = ?";
        updateParams.push(hashedPassword);
      }

      updateQuery += " WHERE id = ?";
      updateParams.push(userId);

      await execute(updateQuery, updateParams);

      // units 테이블 동기화
      // 케이스 1: 퇴거일이 입력된 경우 - 무조건 공실 처리
      if (move_out_date) {
        // 기존 호실이 있었다면 공실로 변경
        if (oldUnitId) {
          await execute(
            "UPDATE units SET tenant_name = NULL, contact = NULL, status = 'vacant' WHERE id = ?",
            [oldUnitId]
          );
        }
      }
      // 케이스 2: 퇴거일이 없고 호실 변경이 있는 경우
      else if (oldUnitId !== unit_id) {
        // 이전 호실이 있었다면 공실로 변경
        if (oldUnitId) {
          await execute(
            "UPDATE units SET tenant_name = NULL, contact = NULL, status = 'vacant' WHERE id = ?",
            [oldUnitId]
          );
        }

        // 새로운 호실이 지정되었다면 입주자 정보 업데이트
        if (unit_id) {
          await execute(
            "UPDATE units SET tenant_name = ?, contact = ?, status = 'occupied' WHERE id = ?",
            [full_name, phone || null, unit_id]
          );
        }
      }
      // 케이스 3: 퇴거일 없고, 호실 변경 없지만 사용자 정보가 변경된 경우
      else if (unit_id && !move_out_date) {
        // 이름이나 연락처가 변경되었을 때만 업데이트
        if (oldFullName !== full_name || oldPhone !== phone) {
          await execute(
            "UPDATE units SET tenant_name = ?, contact = ? WHERE id = ?",
            [full_name, phone || null, unit_id]
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "User updated successfully"
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE: 유저 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id);

    // admin 계정은 삭제 불가
    const users = await query(
      "SELECT role FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (users[0].role === 'admin') {
      return NextResponse.json(
        { error: "Cannot delete admin user" },
        { status: 400 }
      );
    }

    await execute("DELETE FROM users WHERE id = ?", [userId]);

    return NextResponse.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}