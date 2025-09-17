'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Unit {
  id: number;
  unit_number: string;
}

export default function NewUserPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    phone: '',
    password: '0000',
    confirmPassword: '0000',
    role: 'viewer' as 'admin' | 'viewer',
    status: 'pending' as 'active' | 'inactive' | 'pending',
    unit_id: '',
    move_in_date: '',
  });
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (session) {
      fetchAvailableUnits();
    }
  }, [session, status]);

  useEffect(() => {
    const checkUsername = async () => {
      if (!formData.username || formData.username.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      setCheckingUsername(true);
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        if (data.success) {
          const exists = data.users.some(
            (u: any) => u.username.toLowerCase() === formData.username.toLowerCase()
          );
          setUsernameAvailable(!exists);
        }
      } catch (error) {
        console.error('Error checking username:', error);
      } finally {
        setCheckingUsername(false);
      }
    };

    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [formData.username]);

  const fetchAvailableUnits = async () => {
    try {
      const response = await fetch('/api/units/available');
      const data = await response.json();
      if (data.success) {
        setAvailableUnits(data.units);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.username.trim()) {
      newErrors.username = '아이디를 입력해주세요';
    } else if (formData.username.length < 3) {
      newErrors.username = '아이디는 3자 이상이어야 합니다';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = '아이디는 영문, 숫자, 밑줄만 사용 가능합니다';
    } else if (usernameAvailable === false) {
      newErrors.username = '이미 사용 중인 아이디입니다';
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = '이름을 입력해주세요';
    }

    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
    }

    if (formData.phone && !/^[0-9-]+$/.test(formData.phone)) {
      newErrors.phone = '올바른 전화번호 형식이 아닙니다';
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else if (formData.password.length < 4) {
      newErrors.password = '비밀번호는 4자 이상이어야 합니다';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const createData = {
        username: formData.username,
        password: formData.password,
        full_name: formData.full_name,
        email: formData.email || null,
        phone: formData.phone || null,
        role: formData.role,
        status: formData.status,
        unit_id: formData.unit_id ? parseInt(formData.unit_id) : null,
        move_in_date: formData.move_in_date || null,
      };

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createData),
      });

      if (response.ok) {
        router.push('/dashboard/users');
      } else {
        const error = await response.json();
        if (error.error === 'Username already exists') {
          setErrors({ username: '이미 사용 중인 아이디입니다' });
        } else {
          alert(error.error || '생성 중 오류가 발생했습니다');
        }
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('생성 중 오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">새 사용자 추가</h1>
        <p className="text-gray-600 mt-1">새로운 사용자 계정을 생성합니다</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 계정 정보 */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4">계정 정보</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              아이디 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  errors.username ? 'border-red-500' :
                  usernameAvailable === false ? 'border-red-500' :
                  usernameAvailable === true ? 'border-green-500' :
                  'border-gray-300'
                }`}
                placeholder="user_301"
              />
              {checkingUsername && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {!checkingUsername && usernameAvailable === true && formData.username && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                  ✓
                </div>
              )}
              {!checkingUsername && usernameAvailable === false && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
                  ✗
                </div>
              )}
            </div>
            {errors.username && (
              <p className="text-red-500 text-sm mt-1">{errors.username}</p>
            )}
            {!errors.username && usernameAvailable === true && (
              <p className="text-green-500 text-sm mt-1">사용 가능한 아이디입니다</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                errors.full_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="홍길동"
            />
            {errors.full_name && (
              <p className="text-red-500 text-sm mt-1">{errors.full_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              초기 비밀번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">기본값: 0000</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호 확인 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* 연락처 정보 */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4">연락처 정보</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이메일
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="example@email.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              연락처
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="010-0000-0000"
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
            )}
          </div>

          {/* 권한 및 상태 */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4">권한 및 상태</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              권한
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'viewer' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="viewer">일반 사용자</option>
              <option value="admin">관리자</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              초기 상태
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'pending' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pending">대기</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">대기 상태로 생성 후 활성화하는 것을 권장합니다</p>
          </div>

          {/* 호실 정보 */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4">호실 정보</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              호실 배정
            </label>
            <select
              value={formData.unit_id}
              onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">호실 없음</option>
              {availableUnits.map((unit) => (
                <option key={unit.id} value={unit.id.toString()}>
                  {unit.unit_number}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">나중에 배정할 수 있습니다</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              입주일
            </label>
            <input
              type="date"
              value={formData.move_in_date}
              onChange={(e) => setFormData({ ...formData, move_in_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Link
            href="/dashboard/users"
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={saving || checkingUsername || usernameAvailable === false}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
          >
            {saving ? '생성 중...' : '사용자 생성'}
          </button>
        </div>
      </form>
    </div>
  );
}