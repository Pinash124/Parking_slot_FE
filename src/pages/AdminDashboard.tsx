import React, { useState } from 'react';
import Header from '../components/Header';

interface UserAccountItem {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'CUSTOMER';
  status: 'ACTIVE' | 'LOCKED';
}

interface HardwareConfig {
  id: string;
  name: string;
  type: string;
  ipAddress: string;
  status: 'ONLINE' | 'OFFLINE';
}

interface AuditLogItem {
  id: string;
  timestamp: string;
  operator: string;
  action: string;
  details: string;
}

export default function AdminDashboard() {
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'hardware' | 'logs'>('accounts');

  // --- 1. ACCOUNTS STATE ---
  const [accounts, setAccounts] = useState<UserAccountItem[]>([
    { id: '1', username: 'admin', fullName: 'Quản trị viên', email: 'admin@building.com', role: 'ADMIN', status: 'ACTIVE' },
    { id: '2', username: 'manager1', fullName: 'Nguyễn Văn Quản Lý', email: 'manager@building.com', role: 'MANAGER', status: 'ACTIVE' },
    { id: '3', username: 'staff1', fullName: 'Trần Văn Nhân Viên', email: 'staff1@building.com', role: 'STAFF', status: 'ACTIVE' },
    { id: '4', username: 'customer1', fullName: 'Phạm Thị Khách Hàng', email: 'customer1@gmail.com', role: 'CUSTOMER', status: 'ACTIVE' },
    { id: '5', username: 'guest_locked', fullName: 'Tài Khoản Bị Khóa', email: 'locked@gmail.com', role: 'CUSTOMER', status: 'LOCKED' },
  ]);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'MANAGER' | 'STAFF' | 'CUSTOMER'>('STAFF');
  const [accSuccessMsg, setAccSuccessMsg] = useState<string | null>(null);

  // --- 2. HARDWARE STATE ---
  const [hardwareDevices, setHardwareDevices] = useState<HardwareConfig[]>([
    { id: '1', name: 'Camera Nhận Diện Làn Vào (IP)', type: 'Camera', ipAddress: '192.168.1.50', status: 'ONLINE' },
    { id: '2', name: 'Camera Nhận Diện Làn Ra (IP)', type: 'Camera', ipAddress: '192.168.1.51', status: 'ONLINE' },
    { id: '3', name: 'Đầu Đọc Thẻ RFID Cổng Vào', type: 'RFID Reader', ipAddress: '192.168.1.60', status: 'ONLINE' },
    { id: '4', name: 'Đầu Đọc Thẻ RFID Cổng Ra', type: 'RFID Reader', ipAddress: '192.168.1.61', status: 'ONLINE' },
    { id: '5', name: 'Bộ Điều Khiển Barrier 1 (Vào)', type: 'Barrier Controller', ipAddress: '192.168.1.70', status: 'ONLINE' },
    { id: '6', name: 'Bộ Điều Khiển Barrier 2 (Ra)', type: 'Barrier Controller', ipAddress: '192.168.1.71', status: 'ONLINE' },
    { id: '7', name: 'Máy Quét Vé QR Khách Vãng Lai', type: 'QR Scanner', ipAddress: '192.168.1.80', status: 'OFFLINE' },
  ]);

  // --- 3. AUDIT LOGS STATE ---
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([
    { id: '101', timestamp: '2026-06-25 21:40:02', operator: 'admin', action: 'TẠO MỚI TÀI KHOẢN', details: 'Tạo tài khoản staff1 (Trần Văn Nhân Viên)' },
    { id: '102', timestamp: '2026-06-25 21:45:15', operator: 'admin', action: 'CẤU HÌNH THIẾT BỊ', details: 'Thay đổi trạng thái Máy quét QR Cổng Ra thành ONLINE' },
    { id: '103', timestamp: '2026-06-25 21:50:30', operator: 'manager1', action: 'CẬP NHẬT BẢNG GIÁ', details: 'Thay đổi biểu phí đỗ xe Ô tô theo giờ thành 30.000 VNĐ' },
    { id: '104', timestamp: '2026-06-25 21:55:00', operator: 'staff1', action: 'CHECK-IN PHƯƠNG TIỆN', details: 'Xử lý xe 29A-123.45 vào slot A-102 hầm 1' },
    { id: '105', timestamp: '2026-06-25 22:00:12', operator: 'admin', action: 'KHÓA TÀI KHOẢN', details: 'Khóa tài khoản guest_locked do vi phạm đỗ xe quá hạn' },
  ]);

  // --- 4. CREATE ACCOUNT TRIGGER ---
  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newFullName || !newEmail) return;

    const newAcc: UserAccountItem = {
      id: String(Date.now()),
      username: newUsername.trim().toLowerCase(),
      fullName: newFullName.trim(),
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      status: 'ACTIVE'
    };

    setAccounts([...accounts, newAcc]);
    
    // Add audit log
    const newLog: AuditLogItem = {
      id: String(Date.now() + 1),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      operator: 'admin',
      action: 'TẠO MỚI TÀI KHOẢN',
      details: `Tạo tài khoản ${newAcc.username} (${newAcc.fullName}) vai trò ${newAcc.role}`
    };
    setAuditLogs([newLog, ...auditLogs]);

    setNewUsername('');
    setNewFullName('');
    setNewEmail('');
    setAccSuccessMsg('Đã tạo tài khoản thành công!');
    setTimeout(() => setAccSuccessMsg(null), 3000);
  };

  // --- 5. TOGGLE ACCOUNT LOCK ---
  const handleToggleLock = (id: string) => {
    setAccounts(accounts.map(acc => {
      if (acc.id === id) {
        const nextStatus = acc.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
        
        // Add audit log
        const newLog: AuditLogItem = {
          id: String(Date.now()),
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          operator: 'admin',
          action: nextStatus === 'LOCKED' ? 'KHÓA TÀI KHOẢN' : 'MỞ KHÓA TÀI KHOẢN',
          details: `${nextStatus === 'LOCKED' ? 'Khóa' : 'Mở khóa'} tài khoản người dùng: ${acc.username}`
        };
        setAuditLogs([newLog, ...auditLogs]);

        return { ...acc, status: nextStatus };
      }
      return acc;
    }));
  };

  // --- 6. RESET PASSWORD ---
  const handleResetPassword = (username: string) => {
    alert(`Mật khẩu tài khoản [${username}] đã được reset về mặc định: 12345678aA@ (Simulated)!`);
    // Add audit log
    const newLog: AuditLogItem = {
      id: String(Date.now()),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      operator: 'admin',
      action: 'RESET MẬT KHẨU',
      details: `Reset mật khẩu tài khoản ${username} về mặc định`
    };
    setAuditLogs([newLog, ...auditLogs]);
  };

  // --- 7. TOGGLE DEVICE STATUS ---
  const handleToggleDevice = (id: string) => {
    setHardwareDevices(hardwareDevices.map(dev => {
      if (dev.id === id) {
        const nextStatus = dev.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
        // Add audit log
        const newLog: AuditLogItem = {
          id: String(Date.now()),
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          operator: 'admin',
          action: 'CẤU HÌNH THIẾT BỊ',
          details: `Đổi trạng thái thiết bị [${dev.name}] sang ${nextStatus}`
        };
        setAuditLogs([newLog, ...auditLogs]);
        return { ...dev, status: nextStatus };
      }
      return dev;
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Title */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Kênh Quản Trị Hệ Thống (System Admin Panel)</h2>
            <p className="text-slate-400 text-sm mt-0.5">Quản lý tài khoản vận hành, phân vai trò, kiểm tra thiết bị phần cứng kết nối và theo dõi audit logs.</p>
          </div>
          <div className="bg-white border border-slate-200 px-4 py-2 rounded-2xl text-xs font-bold text-slate-650 flex items-center space-x-2.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            <span>Trạng thái máy chủ: <strong>Hoạt động (ONLINE)</strong></span>
          </div>
        </div>

        {/* Sub tabs nav */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto space-x-2 pb-1 scrollbar-none">
          <button
            onClick={() => setActiveSubTab('accounts')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'accounts' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Quản Lý Tài Khoản (4.4.1 & 4.4.2)
          </button>
          <button
            onClick={() => setActiveSubTab('hardware')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'hardware' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Cấu Hình Thiết Bị Barrier/Camera (4.4.3)
          </button>
          <button
            onClick={() => setActiveSubTab('logs')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'logs' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Nhật Ký Audit Logs Hệ Thống
          </button>
        </div>

        {/* Tab 1: Accounts Management */}
        {activeSubTab === 'accounts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Tạo Tài Khoản Mới</h3>
              
              {accSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs p-3.5 rounded-xl font-semibold">
                  {accSuccessMsg}
                </div>
              )}

              <form onSubmit={handleCreateAccount} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Tên đăng nhập (Username)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: staff_kieu"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Trần Văn Kiêu"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Địa chỉ Email</label>
                  <input
                    type="email"
                    required
                    placeholder="Ví dụ: staffkieu@building.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Vai trò hệ thống</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-805 focus:outline-none font-bold"
                  >
                    <option value="STAFF">Staff (Nhân viên trực cổng)</option>
                    <option value="MANAGER">Manager (Quản lý bãi xe)</option>
                    <option value="ADMIN">Administrator (Quản trị hệ thống)</option>
                    <option value="CUSTOMER">Customer / Driver (Người gửi xe)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition text-xs"
                >
                  Tạo tài khoản mới
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Danh Sách Người Dùng & Phân Quyền</h3>
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                      <th className="pb-3">Tài Khoản / Tên</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Vai Trò</th>
                      <th className="pb-3">Trạng Thái</th>
                      <th className="pb-3 text-center">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {accounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50 transition">
                        <td className="py-3">
                          <p className="font-bold text-slate-805">{acc.username}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{acc.fullName}</p>
                        </td>
                        <td className="py-3 font-semibold text-slate-500">{acc.email}</td>
                        <td className="py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            acc.role === 'ADMIN' ? 'bg-rose-50 border border-rose-100 text-rose-700' :
                            acc.role === 'MANAGER' ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' :
                            acc.role === 'STAFF' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' :
                            'bg-slate-100 border border-slate-200 text-slate-600'
                          }`}>
                            {acc.role}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            acc.status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-250 text-emerald-800' : 'bg-rose-50 border-rose-250 text-rose-800'
                          }`}>
                            {acc.status === 'ACTIVE' ? 'Kích hoạt' : 'Bị Khóa'}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex justify-center space-x-3 font-semibold">
                            <button
                              onClick={() => handleToggleLock(acc.id)}
                              className={`cursor-pointer ${acc.status === 'ACTIVE' ? 'text-rose-650 hover:text-rose-800' : 'text-emerald-600 hover:text-emerald-700'}`}
                            >
                              {acc.status === 'ACTIVE' ? 'Khóa' : 'Mở Khóa'}
                            </button>
                            <button
                              onClick={() => handleResetPassword(acc.username)}
                              className="text-slate-500 hover:text-slate-800 cursor-pointer"
                            >
                              Reset Pass
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Hardware Configuration */}
        {activeSubTab === 'hardware' && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Trạng Thái Thiết Bị & Kết Nối Phần Cứng (Barie / Camera)</h3>
              <span className="text-xs text-slate-400 font-semibold">{hardwareDevices.filter(d => d.status === 'ONLINE').length} / {hardwareDevices.length} thiết bị trực tuyến</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {hardwareDevices.map((dev) => (
                <div key={dev.id} className="border border-slate-150 p-4 rounded-2xl bg-slate-50/20 hover:border-indigo-200 transition space-y-3.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800">{dev.name}</h4>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Phân loại: {dev.type}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      dev.status === 'ONLINE' ? 'bg-emerald-50 border-emerald-250 text-emerald-800' : 'bg-rose-50 border-rose-250 text-rose-800'
                    }`}>
                      {dev.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] border-t border-slate-100 pt-3">
                    <span className="text-slate-450 font-bold uppercase tracking-wider">Địa chỉ IP: {dev.ipAddress}</span>
                    <button
                      onClick={() => handleToggleDevice(dev.id)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 font-bold rounded-lg cursor-pointer transition text-[10px]"
                    >
                      {dev.status === 'ONLINE' ? 'Ngắt Kết Nối' : 'Kết Nối'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: System Logs */}
        {activeSubTab === 'logs' && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Nhật Ký Thao Tác Audit Logs</h3>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="border-b border-slate-100 pb-3 flex items-start space-x-3 text-xs">
                  <div className="text-slate-400 font-semibold font-mono w-32">{log.timestamp}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800">@{log.operator}</span>
                      <span className="text-[9px] bg-slate-100 text-slate-650 border border-slate-200 rounded px-1.5 py-0.2 font-extrabold uppercase tracking-wider">{log.action}</span>
                    </div>
                    <p className="text-slate-500 font-medium">{log.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
