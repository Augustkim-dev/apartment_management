'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  UserCircleIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

interface UserProfile {
  id: number;
  username: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  unit_number: string | null;
  move_in_date: string | null;
  move_out_date: string | null;
}

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewUsername, setPreviewUsername] = useState<string>(''); // username 미리보기

  // 폼 데이터
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/users/profile');
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
        email: data.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError('프로필을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // 비밀번호 확인
    if (isChangingPassword) {
      if (!formData.currentPassword) {
        setError('현재 비밀번호를 입력해주세요.');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setError('새 비밀번호가 일치하지 않습니다.');
        return;
      }
      if (formData.newPassword.length < 4) {
        setError('새 비밀번호는 최소 4자 이상이어야 합니다.');
        return;
      }
    }

    setSaving(true);

    try {
      const updateData: any = {
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email
      };

      if (isChangingPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '프로필 업데이트에 실패했습니다.');
      }

      setProfile(data.user);
      setSuccess('프로필이 성공적으로 업데이트되었습니다.');
      setIsEditing(false);
      setIsChangingPassword(false);
      setPreviewUsername('');
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      // 세션 업데이트 (이름 변경 시)
      if (data.user.full_name !== session?.user?.name) {
        await update({
          ...session,
          user: {
            ...session?.user,
            name: data.user.full_name
          }
        });
      }
    } catch (err: any) {
      setError(err.message || '프로필 업데이트에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsChangingPassword(false);
    setError(null);
    setPreviewUsername('');
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        email: profile.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">프로필을 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">프로필 관리</h1>
        <p className="text-gray-600 mt-1">계정 정보를 확인하고 수정할 수 있습니다.</p>
      </div>

      {/* 알림 메시지 */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center">
          <ExclamationCircleIcon className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg flex items-center">
          <CheckIcon className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <UserCircleIcon className="h-5 w-5 mr-2" />
              기본 정보
            </h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                수정
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 아이디 (읽기 전용) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                아이디
              </label>
              <input
                type="text"
                value={previewUsername || profile.username}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
              {isEditing && profile.username !== 'admin' && formData.phone && previewUsername && previewUsername !== profile.username && (
                <p className="text-xs text-blue-600 mt-1">
                  연락처 변경 시 아이디가 "{previewUsername}"로 자동 변경됩니다.
                </p>
              )}
            </div>

            {/* 호실 (읽기 전용) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                호실
              </label>
              <input
                type="text"
                value={profile.unit_number || '미배정'}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>

            {/* 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                disabled={!isEditing}
                required
                className={`w-full px-3 py-2 border rounded-md ${
                  isEditing
                    ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    : 'border-gray-300 bg-gray-50 text-gray-500'
                }`}
              />
            </div>

            {/* 전화번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                전화번호
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  const newPhone = e.target.value;
                  setFormData({ ...formData, phone: newPhone });

                  // admin이 아닌 경우 username 미리보기 생성
                  if (profile?.username !== 'admin' && newPhone) {
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
                disabled={!isEditing}
                placeholder="010-0000-0000"
                className={`w-full px-3 py-2 border rounded-md ${
                  isEditing
                    ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    : 'border-gray-300 bg-gray-50 text-gray-500'
                }`}
              />
              {isEditing && profile?.username !== 'admin' && (
                <p className="text-xs text-gray-500 mt-1">
                  연락처 변경 시 아이디가 자동으로 변경됩니다.
                </p>
              )}
            </div>

            {/* 이메일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이메일
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
                placeholder="example@email.com"
                className={`w-full px-3 py-2 border rounded-md ${
                  isEditing
                    ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    : 'border-gray-300 bg-gray-50 text-gray-500'
                }`}
              />
            </div>

            {/* 입주일 (읽기 전용) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                입주일
              </label>
              <input
                type="text"
                value={
                  profile.move_in_date
                    ? new Date(profile.move_in_date).toLocaleDateString()
                    : '미설정'
                }
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>
          </div>

          {/* 비밀번호 변경 섹션 */}
          {isEditing && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center mb-4">
                <LockClosedIcon className="h-5 w-5 mr-2 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">비밀번호 변경</h3>
                <label className="ml-4 flex items-center">
                  <input
                    type="checkbox"
                    checked={isChangingPassword}
                    onChange={(e) => {
                      setIsChangingPassword(e.target.checked);
                      if (!e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        }));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">비밀번호 변경하기</span>
                </label>
              </div>

              {isChangingPassword && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      현재 비밀번호 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      새 비밀번호 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      placeholder="최소 4자 이상"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      새 비밀번호 확인 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 버튼 */}
          {isEditing && (
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <XMarkIcon className="h-4 w-4 inline mr-1" />
                취소
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`px-4 py-2 border border-transparent rounded-md text-white ${
                  saving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-1"></div>
                    저장 중...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4 inline mr-1" />
                    저장
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}