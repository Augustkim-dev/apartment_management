import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, execute } from "@/lib/db-utils";
import bcrypt from "bcryptjs";

// GET: 유저 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const users = await query(`
      SELECT
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
      ORDER BY
        CASE WHEN units.unit_number IS NULL THEN 1 ELSE 0 END,
        CAST(units.unit_number AS UNSIGNED),
        u.username
    `);

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST: 새 유저 생성
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      username,
      password = "0000",
      full_name,
      email,
      phone,
      role = "viewer",
      status = "pending",
      unit_id,
      move_in_date
    } = body;

    // 유저명 중복 확인
    const existingUsers = await query(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 유저 생성
    const result = await execute(
      `INSERT INTO users (
        username, password, full_name, email, phone,
        role, status, unit_id, move_in_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
        hashedPassword,
        full_name,
        email,
        phone,
        role,
        status,
        unit_id || null,
        move_in_date || null
      ]
    );

    return NextResponse.json({
      success: true,
      userId: result.insertId,
      message: "User created successfully"
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}