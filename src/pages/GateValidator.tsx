import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { parkingService } from '../services/parkingService';
import { authService } from '../services/authService';

export default function GateValidator() {
  const currentUser = authService.getCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationResult(null);
    setErrorMsg(null);
    
    if (!searchQuery.trim()) {
      setErrorMsg('Vui lòng nhập mã vé hoặc ID lượt đỗ.');
      return;
    }

    setLoading(true);
    try {
      const sessions = await parkingService.getAllSessions();
      
      // Tìm lượt đỗ mới nhất khớp với mã vé, ID lượt đỗ hoặc ID xe
      const matchingSession = sessions
        .filter(s => 
          s.ticketCode?.toLowerCase() === searchQuery.trim().toLowerCase() || 
          s.sessionId?.toString() === searchQuery.trim() || 
          s.vehicleId?.toString() === searchQuery.trim()
        )
        .sort((a, b) => (b.sessionId || 0) - (a.sessionId || 0))[0];

      if (!matchingSession) {
        setErrorMsg('Không tìm thấy lượt đỗ tương ứng với từ khóa đã nhập.');
        setLoading(false);
        return;
      }

      const isCompleted = matchingSession.status === 'COMPLETED';
      setValidationResult({
        openBarrier: isCompleted,
        ticketCode: matchingSession.ticketCode,
        vehicleId: matchingSession.vehicleId,
        slotId: matchingSession.slotId,
        status: matchingSession.status,
        totalFee: matchingSession.totalFee || matchingSession.parkingFee || 0,
        entryTime: matchingSession.entryTime,
        exitTime: matchingSession.exitTime,
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Không thể kết nối đến máy chủ để xác thực.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-sm">
              P
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                Cổng Barie Cổng Ra
              </h1>
            </div>
          </div>
          <nav className="hidden md:flex space-x-6 text-sm font-semibold">
            <Link to="/" className="text-slate-500 hover:text-slate-800 transition">Tổng quan</Link>
            <Link to="/sessions" className="text-slate-500 hover:text-slate-800 transition">Cho xe ra/vào</Link>
            <Link to="/gate" className="text-indigo-600 border-b-2 border-indigo-500 pb-1">Cổng Barie</Link>
            <Link to="/logs" className="text-slate-500 hover:text-slate-800 transition">Lịch sử lượt đỗ</Link>
          </nav>
          <div className="text-right text-xs">
            <p className="text-slate-400 font-bold uppercase">Nhân viên cổng ra</p>
            <p className="font-bold text-slate-800">{currentUser?.username || 'User'}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Xác Thực Mở Cổng Barie</h2>
          <p className="text-slate-400 text-sm mt-0.5">Quét vé hoặc kiểm tra tình trạng thanh toán của xe để tự động mở cổng.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Column 1: Scanner Input Form */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5">
            <h3 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse"></span>
              <span>Đầu đọc kiểm soát cổng</span>
            </h3>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleValidate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nhập mã vé / ID lượt đỗ / ID Xe
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Ví dụ: TKT-1234 hoặc 1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none font-bold text-base text-center uppercase tracking-wider"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                {loading ? 'Đang xác thực...' : 'Quét & Xác thực barie'}
              </button>
            </form>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-500 leading-relaxed">
              <p className="font-bold text-slate-700 mb-1">Quy định xuất bãi:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Xe ra phải khớp với biển số / mã vé lúc vào.</li>
                <li>Lượt gửi xe phải ở trạng thái ĐÃ HOÀN THÀNH (COMPLETED) sau khi thanh toán và checkout tại quầy cashier.</li>
                <li>Cổng sẽ tự động mở nếu trạng thái hợp lệ.</li>
              </ul>
            </div>
          </div>

          {/* Column 2 & 3: Visual Gate Barrier & Log Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Visual Gate Element */}
            <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm flex flex-col items-center justify-center relative overflow-hidden h-72">
              {/* Gate Column */}
              <div className="w-12 h-36 bg-slate-200 border border-slate-300 rounded-lg relative flex flex-col justify-end items-center pb-4 shadow-sm z-20">
                {/* Status LED Lamp */}
                <div className={`w-5 h-5 rounded-full border-2 ${
                  validationResult?.openBarrier 
                    ? 'bg-emerald-500 border-emerald-400 shadow-md shadow-emerald-500/25' 
                    : 'bg-rose-500 border-rose-400 shadow-md shadow-rose-500/25'
                } mb-10 transition-all duration-300`}></div>
                <div className="w-2.5 h-12 bg-slate-400 rounded border border-slate-300"></div>
              </div>

              {/* Gate Arm (Rotates) */}
              <div 
                className={`absolute w-64 h-3.5 border rounded transition-all duration-1005 origin-left z-10 ${
                  validationResult?.openBarrier 
                    ? 'bg-emerald-500 border-emerald-400 -rotate-90 translate-x-16 -translate-y-8 shadow-sm' 
                    : 'bg-rose-600 border-rose-500 translate-x-28 translate-y-1 shadow-sm'
                }`}
                style={{
                  left: 'calc(50% - 90px)',
                  top: 'calc(50% + 20px)'
                }}
              >
                {/* Stripes */}
                <div className="w-full h-full flex justify-between px-2 overflow-hidden">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-5 h-full bg-white/30 transform skew-x-12"></div>
                  ))}
                </div>
              </div>

              {/* Barrier Text State */}
              <p className="text-base font-extrabold tracking-widest mt-6 z-20">
                TRẠNG THÁI CỔNG:{' '}
                <span className={validationResult?.openBarrier ? 'text-emerald-600' : 'text-rose-600'}>
                  {validationResult?.openBarrier ? 'CỔNG MỞ' : 'CỔNG KHÓA'}
                </span>
              </p>
            </div>

            {/* Validation Result Detail */}
            {validationResult && (
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100">
                  Nhật Ký Xác Minh Biển Số
                </h3>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 p-3 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Quyết định</span>
                    <span className={`font-mono text-xs font-bold ${
                      validationResult.openBarrier ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {validationResult.openBarrier ? 'CHO PHÉP XE RA' : 'TỪ CHỐI XE RA'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Mã vé xe</span>
                    <span className="font-bold text-slate-800 text-xs">{validationResult.ticketCode}</span>
                  </div>

                  <div className="bg-slate-50 p-3 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">ID Xe / ID Vị trí</span>
                    <span className="font-bold text-slate-800">Xe #{validationResult.vehicleId} • Slot #{validationResult.slotId}</span>
                  </div>

                  <div className="bg-slate-50 p-3 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Trạng thái lượt đỗ</span>
                    <span className="font-bold text-slate-800">
                      {validationResult.status}
                    </span>
                  </div>
                </div>

                {validationResult.openBarrier ? (
                  <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-800 text-xs">
                    <p className="font-bold">✓ CHO PHÉP XUẤT BÃI (BARIE TỰ ĐỘNG MỞ)</p>
                    <p className="text-slate-500 mt-1">
                      Lượt đỗ đã hoàn tất thanh toán. Xe được phép di chuyển ra ngoài tòa nhà.
                    </p>
                  </div>
                ) : (
                  <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-rose-700 text-xs">
                    <p className="font-bold">✗ TỪ CHỐI CHO XE QUA (YÊU CẦU KIỂM TRA LẠI)</p>
                    <p className="text-slate-500 mt-1">
                      Lý do: Lượt đỗ chưa được thực hiện thanh toán và checkout tại quầy. Vui lòng quay lại quầy thu ngân thực hiện thanh toán.
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </main>
    </div>
  );
}
