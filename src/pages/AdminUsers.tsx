import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import { adminService } from '../services/adminService';

export default function AdminUsers() {
  const queryClient = useQueryClient();

  // Custom Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('STAFF');
  const [status, setStatus] = useState('ACTIVE');
  const [password, setPassword] = useState(''); // Only for new users or if manual reset is checked

  // Form Errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Trigger custom toast
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Queries
  const { data: users = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ['adminUsersList'],
    queryFn: () => adminService.getUsers(),
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: (payload: any) => adminService.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
      showToast('Tạo tài khoản người dùng thành công!', 'success');
      resetForm();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Lỗi khi tạo người dùng.', 'error');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      adminService.updateUserPut(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
      showToast('Cập nhật tài khoản thành công!', 'success');
      resetForm();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Lỗi khi cập nhật người dùng.', 'error');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      adminService.updateUser(id, payload), // PATCH for partial updates
    onSuccess: () => {
      showToast('Mật khẩu tài khoản đã được đặt lại về mặc định!', 'success');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Lỗi đặt lại mật khẩu.', 'error');
    },
  });

  // Handlers
  const resetForm = () => {
    setEditingId(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setRole('STAFF');
    setStatus('ACTIVE');
    setPassword('');
    setNameError(null);
    setEmailError(null);
  };

  const handleEditClick = (u: any) => {
    setEditingId(u.id);
    setFullName(u.fullName || '');
    setEmail(u.email || '');
    setPhone(u.phone || '');
    setRole(u.role || 'STAFF');
    setStatus(u.status || 'ACTIVE');
    setPassword('');
  };

  const handleResetPassword = (id: number, name: string) => {
    const defaultPass = '12345678aA@';
    if (window.confirm(`Bạn có chắc chắn muốn đặt lại mật khẩu cho "${name}" về mật khẩu mặc định: ${defaultPass}?`)) {
      resetPasswordMutation.mutate({
        id,
        payload: { newPassword: defaultPass }
      });
    }
  };

  const handleToggleLock = (u: any) => {
    const nextStatus = u.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    updateUserMutation.mutate({
      id: u.id,
      payload: {
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: nextStatus
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let isValid = true;

    if (!fullName.trim()) {
      setNameError('Vui lòng điền họ và tên.');
      isValid = false;
    } else {
      setNameError(null);
    }

    if (!email.trim() || !email.includes('@')) {
      setEmailError('Vui lòng điền email hợp lệ.');
      isValid = false;
    } else {
      setEmailError(null);
    }

    if (!isValid) return;

    const payload: any = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      role: role.toUpperCase(),
      status: status.toUpperCase(),
    };

    if (editingId) {
      if (password) payload.password = password; // Only update password if filled
      updateUserMutation.mutate({ id: editingId, payload });
    } else {
      payload.password = password || '12345678aA@'; // Default password for new users if blank
      createUserMutation.mutate(payload);
    }
  };

  // Pagination logic
  const totalItems = users.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = users.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased flex flex-col relative">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Quản Lý Tài Khoản Người Dùng (User Management)</h1>
          <p className="text-slate-450 text-xs mt-1">Quản lý phân quyền và cập nhật hồ sơ thông tin cho các tài khoản Quản trị, Nhân viên trực cổng, và Khách hàng</p>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Column 1: User Form */}
          <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100 flex justify-between items-center">
              <span>{editingId ? 'Cập nhật tài khoản' : 'Tạo tài khoản mới'}</span>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[10px] text-indigo-650 hover:text-indigo-800 font-bold"
                >
                  Hủy chỉnh sửa
                </button>
              )}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold" noValidate>
              {/* Full Name */}
              <div>
                <label className="block text-slate-450 mb-1 uppercase tracking-wide">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full bg-slate-50 border ${
                    nameError ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500'
                  } rounded-xl px-4 py-2.5 text-xs focus:outline-none`}
                />
                {nameError && <p className="mt-1 text-[10px] text-rose-500 font-medium">{nameError}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-slate-450 mb-1 uppercase tracking-wide">Email đăng nhập *</label>
                <input
                  type="email"
                  required
                  placeholder="email@vidu.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-slate-50 border ${
                    emailError ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500'
                  } rounded-xl px-4 py-2.5 text-xs focus:outline-none`}
                />
                {emailError && <p className="mt-1 text-[10px] text-rose-500 font-medium">{emailError}</p>}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-slate-450 mb-1 uppercase tracking-wide">Số điện thoại</label>
                <input
                  type="tel"
                  placeholder="Ví dụ: 0987654321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-slate-450 mb-1 uppercase tracking-wide">Quyền hạn (Role)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                >
                  <option value="STAFF">Nhân viên trực cổng (STAFF)</option>
                  <option value="CUSTOMER">Khách hàng (CUSTOMER)</option>
                  <option value="MANAGER">Quản lý (MANAGER)</option>
                  <option value="ADMIN">Quản trị tối cao (ADMIN)</option>
                </select>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-slate-455 mb-1 uppercase tracking-wide">Trạng thái tài khoản</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                >
                  <option value="ACTIVE">Kích hoạt (ACTIVE)</option>
                  <option value="LOCKED">Khóa (LOCKED)</option>
                </select>
              </div>

              {/* Password setting */}
              <div>
                <label className="block text-slate-450 mb-1 uppercase tracking-wide">
                  {editingId ? 'Mật khẩu mới (Bỏ trống nếu không đổi)' : 'Mật khẩu khởi tạo (Mặc định: 12345678aA@)'}
                </label>
                <input
                  type="password"
                  placeholder={editingId ? 'Mật khẩu mới' : 'Nhập mật khẩu riêng'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={createUserMutation.isPending || updateUserMutation.isPending}
                className="w-full py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-sm mt-4 active:scale-98"
              >
                {createUserMutation.isPending || updateUserMutation.isPending ? 'Đang gửi...' : editingId ? 'Cập Nhật Tài Khoản' : 'Tạo Tài Khoản'}
              </button>
            </form>
          </div>

          {/* Column 2 & 3: Users List with Pagination */}
          <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col justify-between min-h-[450px]">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100 mb-6">
                Danh sách người dùng hệ thống
              </h3>

              {isUsersLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <span className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
                  <p className="text-xs text-slate-400 font-semibold mt-3">Đang tải tài khoản...</p>
                </div>
              ) : (
                users.length === 0 ? (
                  <div className="text-slate-400 text-center py-20 text-xs">Chưa có tài khoản nào được đăng ký.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                          <th className="pb-3.5 pr-4">Họ và tên</th>
                          <th className="pb-3.5 px-4">Email / SĐT</th>
                          <th className="pb-3.5 px-4">Quyền hạn</th>
                          <th className="pb-3.5 px-4">Trạng thái</th>
                          <th className="pb-3.5 pl-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                        {currentUsers.map((u: any) => {
                          const isActive = u.status?.toUpperCase() === 'ACTIVE';

                          return (
                            <tr key={u.id} className="hover:bg-slate-50/50 transition">
                              <td className="py-4 pr-4">
                                <p className="font-bold text-slate-900">{u.fullName}</p>
                                <span className="text-[9px] text-slate-400 font-mono">Mã số: #{u.id}</span>
                              </td>
                              <td className="py-4 px-4 font-mono text-[11px] leading-relaxed">
                                <div className="font-bold text-slate-800">{u.email}</div>
                                <div className="text-slate-400">{u.phone || 'Chưa gán SĐT'}</div>
                              </td>
                              <td className="py-4 px-4">
                                <span className="px-2 py-0.5 rounded-[5px] text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wide">
                                  {u.role}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`px-2 py-0.5 rounded-[5px] text-[9px] font-bold border uppercase ${
                                  isActive ? 'bg-emerald-50 text-emerald-705 border-emerald-100' : 'bg-rose-50 text-rose-705 border-rose-100'
                                }`}>
                                  {isActive ? 'Hoạt động' : 'Bị Khóa'}
                                </span>
                              </td>
                              <td className="py-4 pl-4 text-right space-x-2 shrink-0 whitespace-nowrap">
                                <button
                                  onClick={() => handleEditClick(u)}
                                  className="text-indigo-650 hover:bg-indigo-50 border border-transparent px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                                >
                                  Sửa
                                </button>
                                <button
                                  onClick={() => handleToggleLock(u)}
                                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                                    isActive
                                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-100'
                                  }`}
                                >
                                  {isActive ? 'Khóa' : 'Mở'}
                                </button>
                                <button
                                  onClick={() => handleResetPassword(u.id, u.fullName)}
                                  className="bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  Reset
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-6 border-t border-slate-100 mt-6 text-xs font-bold">
                <span className="text-slate-400">Trang {currentPage} trên {totalPages}</span>
                <div className="flex space-x-1">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Trước
                  </button>
                  {[...Array(totalPages)].map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => paginate(idx + 1)}
                      className={`w-8 h-8 rounded-xl border transition cursor-pointer ${
                        currentPage === idx + 1
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-650 font-extrabold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Toast Alert popup */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[60] flex items-center space-x-3 px-5 py-3 rounded-2xl shadow-xl border animate-in slide-in-from-bottom-5 duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-500 text-white border-emerald-600'
              : 'bg-rose-500 text-white border-rose-600'
          }`}
        >
          {toast.type === 'success' ? (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <span className="text-xs font-bold tracking-tight">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
