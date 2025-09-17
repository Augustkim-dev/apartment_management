'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'admin' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  unit_id: number | null;
  unit_number: string | null;
  move_in_date: string | null;
  move_out_date: string | null;
}

interface Unit {
  id: number;
  unit_number: string;
}

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'viewer' as 'admin' | 'viewer',
    status: 'active' as 'active' | 'inactive' | 'pending',
    unit_id: '',
    move_in_date: '',
    move_out_date: '',
  });
  const [errors, setErrors] = useState<any>({});
  const [userId, setUserId] = useState<string>('');
  const [previewUsername, setPreviewUsername] = useState<string>(''); // username 미리보기

  useEffect(() => {
    const loadParams = async () => {
      const { id } = await params;
      setUserId(id);
    };
    loadParams();
  }, [params]);

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (session && userId) {
      fetchUser();
      fetchAvailableUnits();
    }
  }, [session, status, userId]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        setFormData({
          full_name: data.user.full_name || '',
          username: data.user.username || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          password: '',
          confirmPassword: '',
          role: data.user.role || 'viewer',
          status: data.user.status || 'active',
          unit_id: data.user.unit_id?.toString() || '',
          move_in_date: data.user.move_in_date ?
            new Date(data.user.move_in_date).toISOString().split('T')[0] : '',
          move_out_date: data.user.move_out_date ?
            new Date(data.user.move_out_date).toISOString().split('T')[0] : '',
        });
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

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

    if (!formData.full_name.trim()) {
      newErrors.full_name = '이름을 입력해주세요';
    }

    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
    }

    if (formData.phone && !/^[0-9-]+$/.test(formData.phone)) {
      newErrors.phone = '올바른 전화번호 형식이 아닙니다';
    }

    if (formData.password || formData.confirmPassword) {
      if (formData.password.length < 4) {
        newErrors.password = '비밀번호는 4자 이상이어야 합니다';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
      }
    }

    if (formData.move_out_date && formData.move_in_date) {
      if (new Date(formData.move_out_date) <= new Date(formData.move_in_date)) {
        newErrors.move_out_date = '퇴거일은 입주일 이후여야 합니다';
      }
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
      const updateData: any = {
        full_name: formData.full_name,
        email: formData.email || null,
        phone: formData.phone || null,
        role: formData.role,
        status: formData.status,
        unit_id: formData.unit_id ? parseInt(formData.unit_id) : null,
        move_in_date: formData.move_in_date || null,
        move_out_date: formData.move_out_date || null,
      };

      // 비밀번호가 입력된 경우에만 포함
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        router.push('/dashboard/users');
      } else {
        const error = await response.json();
        alert(error.error || '수정 중 오류가 발생했습니다');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('수정 중 오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">로딩 중...</div>;
  }

  if (!user) {
    return <div className="text-center">사용자를 찾을 수 없습니다</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">사용자 정보 수정</h1>
        <p className="text-gray-600 mt-1">@{user.username}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 기본 정보 */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4">기본 정보</h3>
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
            />
            {errors.full_name && (
              <p className="text-red-500 text-sm mt-1">{errors.full_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              아이디
            </label>
            <input
              type="text"
              value={previewUsername || formData.username}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            />
            {user?.username !== 'admin' && formData.phone && previewUsername && previewUsername !== formData.username && (
              <p className="text-xs text-blue-600 mt-1">
                연락처 변경 시 아이디가 "{previewUsername}"로 자동 변경됩니다.
              </p>
            )}
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
              onChange={(e) => {
                const newPhone = e.target.value;
                setFormData({ ...formData, phone: newPhone });

                // admin이 아닌 경우 username 미리보기 생성
                if (user?.username !== 'admin' && newPhone) {
                  const phoneDigits = newPhone.replace(/[^0-9]/g, '');
                  let baseUsername = phoneDigits;
                  if (phoneDigits.startsWith('010')) {
                    baseUsername = phoneDigits.substring(3);
                  }
                  if (baseUsername.length === 8) {
                    setPreviewUsername(baseUsername);
                  } else {
                    setPreviewUsername('');
                  }
                } else {
                  setPreviewUsername('');
                }
              }}
              className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="010-0000-0000"
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
            )}
            {user?.username !== 'admin' && (
              <p className="text-xs text-gray-500 mt-1">
                연락처 변경 시 아이디가 자동으로 변경됩니다.
              </p>
            )}
          </div>

          {/* 비밀번호 변경 */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4">비밀번호 변경</h3>
            <p className="text-sm text-gray-500 mb-4">비밀번호를 변경하지 않으려면 비워두세요</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              새 비밀번호
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호 확인
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
              disabled={user.username === 'admin'}
            >
              <option value="viewer">일반 사용자</option>
              <option value="admin">관리자</option>
            </select>
            {user.username === 'admin' && (
              <p className="text-sm text-gray-500 mt-1">admin 계정의 권한은 변경할 수 없습니다</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상태
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'pending' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
              <option value="pending">대기</option>
            </select>
          </div>

          {/* 호실 정보 */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4">호실 정보</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              호실
            </label>
            <select
              value={formData.unit_id}
              onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">호실 없음</option>
              {user.unit_id && (
                <option value={user.unit_id.toString()}>
                  {user.unit_number} (현재)
                </option>
              )}
              {availableUnits.map((unit) => (
                <option key={unit.id} value={unit.id.toString()}>
                  {unit.unit_number}
                </option>
              ))}
            </select>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              퇴거일
            </label>
            <input
              type="date"
              value={formData.move_out_date}
              onChange={(e) => {
                const newDate = e.target.value;
                setFormData({
                  ...formData,
                  move_out_date: newDate,
                  unit_id: newDate ? '' : formData.unit_id // 퇴거일 입력시 호실 없음으로 변경
                });
              }}
              className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                errors.move_out_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.move_out_date && (
              <p className="text-red-500 text-sm mt-1">{errors.move_out_date}</p>
            )}
            {formData.move_out_date && (
              <p className="text-amber-600 text-sm mt-1">퇴거일이 설정되어 호실이 자동 해제됩니다</p>
            )}
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
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}