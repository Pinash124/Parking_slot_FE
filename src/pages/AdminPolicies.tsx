import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import { formatVehicleTypeName } from '../utils/vehicleDisplay';
import { parkingService } from '../services/parkingService';

export default function AdminPolicies() {
  const queryClient = useQueryClient();

  // Custom Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [policyName, setPolicyName] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [surcharge, setSurcharge] = useState('0');
  const [lostTicketFee, setLostTicketFee] = useState('50000');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Validations
  const [nameError, setNameError] = useState<string | null>(null);
  const [vehicleTypeError, setVehicleTypeError] = useState<string | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);

  // Trigger custom toast
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Queries
  const { data: policies = [], isLoading: isPoliciesLoading } = useQuery({
    queryKey: ['managementPolicies'],
    queryFn: () => parkingService.getManagementPolicies(),
  });

  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ['vehicleTypes'],
    queryFn: () => parkingService.getVehicleTypes(),
  });

  // Mutations
  const savePolicyMutation = useMutation({
    mutationFn: (payload: any) => parkingService.createManagementPolicy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managementPolicies'] });
      showToast(editingId ? 'Cập nhật biểu phí thành công!' : 'Thêm biểu phí mới thành công!', 'success');
      resetForm();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Lỗi lưu biểu phí.', 'error');
    },
  });

  const deletePolicyMutation = useMutation({
    mutationFn: (id: number) => parkingService.deleteManagementPolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managementPolicies'] });
      showToast('Đã xóa biểu phí thành công.', 'success');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Lỗi xóa biểu phí.', 'error');
    },
  });

  // Handlers
  const resetForm = () => {
    setEditingId(null);
    setVehicleTypeId('');
    setPolicyName('');
    setHourlyRate('');
    setDailyRate('');
    setSurcharge('0');
    setLostTicketFee('50000');
    setStartDate('');
    setEndDate('');
    setNameError(null);
    setVehicleTypeError(null);
    setRateError(null);
  };

  const handleEditClick = (p: any) => {
    setEditingId(p.id);
    setVehicleTypeId(p.vehicleTypeId?.toString() || '');
    setPolicyName(p.policyName || p.name || '');
    setHourlyRate(p.hourlyRate?.toString() || '');
    setDailyRate(p.dailyRate?.toString() || '');
    setSurcharge(p.surcharge?.toString() || '0');
    setLostTicketFee(p.lostTicketFee?.toString() || '50000');
    setStartDate(p.startDate ? p.startDate.split('T')[0] : '');
    setEndDate(p.endDate ? p.endDate.split('T')[0] : '');
  };

  const handleDeleteClick = (id: number, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa biểu phí "${name}"?`)) {
      deletePolicyMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let isValid = true;

    if (!policyName.trim()) {
      setNameError('Vui lòng nhập tên biểu phí.');
      isValid = false;
    } else {
      setNameError(null);
    }

    if (!vehicleTypeId) {
      setVehicleTypeError('Vui lòng chọn loại xe áp dụng.');
      isValid = false;
    } else {
      setVehicleTypeError(null);
    }

    if (!hourlyRate || !dailyRate) {
      setRateError('Vui lòng điền đầy đủ phí qua đêm và lượt ban ngày.');
      isValid = false;
    } else {
      setRateError(null);
    }

    if (!isValid) return;

    savePolicyMutation.mutate({
      id: editingId || undefined,
      vehicleTypeId: parseInt(vehicleTypeId, 10),
      policyName: policyName.trim(),
      name: policyName.trim(), // fallback
      hourlyRate: parseFloat(hourlyRate),
      dailyRate: parseFloat(dailyRate),
      surcharge: parseFloat(surcharge),
      lostTicketFee: parseFloat(lostTicketFee),
      overtimeFee: 0,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased flex flex-col relative">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Cấu Hình Biểu Phí Gửi Xe (Pricing Policies)</h1>
          <p className="text-slate-450 text-xs mt-1">Điều chỉnh giá cước gửi xe theo lượt ban ngày / qua đêm theo giờ, phí phạt mất vé và thời gian áp dụng biểu phí</p>
        </div>

        {/* Grid Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Column 1: Policy Form */}
          <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100 flex justify-between items-center">
              <span>{editingId ? 'Cập nhật biểu phí' : 'Thêm biểu phí mới'}</span>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold"
                >
                  Hủy chỉnh sửa
                </button>
              )}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-semibold" noValidate>
              {/* Policy Name */}
              <div>
                <label className="block text-slate-450 mb-1 uppercase tracking-wide">Tên biểu phí *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Giá Ngày Thường Ô Tô"
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  className={`w-full bg-slate-50 border ${
                    nameError ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500'
                  } rounded-xl px-4 py-2.5 text-xs focus:outline-none`}
                />
                {nameError && <p className="mt-1 text-[10px] text-rose-500 font-medium">{nameError}</p>}
              </div>

              {/* Vehicle Type Selection */}
              <div>
                <label className="block text-slate-450 mb-1 uppercase tracking-wide">Loại xe áp dụng *</label>
                <select
                  value={vehicleTypeId}
                  onChange={(e) => setVehicleTypeId(e.target.value)}
                  className={`w-full bg-slate-50 border ${
                    vehicleTypeError ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500'
                  } rounded-xl px-4 py-2.5 text-xs focus:outline-none`}
                  required
                >
                  <option value="">-- Chọn loại xe --</option>
                  {vehicleTypes.map((vt) => (
                    <option key={vt.id} value={vt.id}>{formatVehicleTypeName(vt.name)}</option>
                  ))}
                </select>
                {vehicleTypeError && <p className="mt-1 text-[10px] text-rose-500 font-medium">{vehicleTypeError}</p>}
              </div>

              {/* Rates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-455 mb-1 uppercase tracking-wide">Qua đêm / giờ (VND) *</label>
                  <input
                    type="number"
                    required
                    placeholder="VD: 10000"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-455 mb-1 uppercase tracking-wide">Lượt ban ngày (VND) *</label>
                  <input
                    type="number"
                    required
                    placeholder="VD: 100000"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                  />
                </div>
              </div>
              {rateError && <p className="text-[10px] text-rose-500 font-medium">{rateError}</p>}

              {/* Penalty and Services */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-450 mb-1 uppercase text-[9px]">Phí phạt vé (VND)</label>
                  <input
                    type="number"
                    value={lostTicketFee}
                    onChange={(e) => setLostTicketFee(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-2 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-455 mb-1 uppercase text-[9px]">Phụ thu (VND)</label>
                  <input
                    type="number"
                    value={surcharge}
                    onChange={(e) => setSurcharge(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-2 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Effective Dates */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-450 mb-1 uppercase tracking-wide">Ngày có hiệu lực</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-450 mb-1 uppercase tracking-wide">Ngày hết hạn</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savePolicyMutation.isPending}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-sm mt-4 active:scale-98"
              >
                {savePolicyMutation.isPending ? 'Đang lưu...' : editingId ? 'Cập Nhật Biểu Phí' : 'Tạo Biểu Phí Mới'}
              </button>
            </form>
          </div>

          {/* Column 2 & 3: Policies List */}
          <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm min-h-[450px]">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100 mb-6">
              Danh sách biểu phí cước gửi xe
            </h3>

            {isPoliciesLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <span className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
                <p className="text-xs text-slate-400 font-semibold mt-3">Đang tải biểu phí...</p>
              </div>
            ) : (
              policies.length === 0 ? (
                <div className="text-slate-400 text-center py-20 text-xs">Chưa có cấu hình biểu phí nào được tạo.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="pb-3.5 pr-4">Biểu phí</th>
                        <th className="pb-3.5 px-4 text-right">Qua đêm / giờ</th>
                        <th className="pb-3.5 px-4 text-right">Lượt ban ngày</th>
                        <th className="pb-3.5 px-4 text-right">Phí phạt mất vé</th>
                        <th className="pb-3.5 px-4">Ngày áp dụng</th>
                        <th className="pb-3.5 pl-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                      {policies.map((p) => {
                        const name = p.policyName || p.name || 'Biểu phí';
                        const startStr = p.startDate ? new Date(p.startDate).toLocaleDateString('vi-VN') : 'Mở';
                        const endStr = p.endDate ? new Date(p.endDate).toLocaleDateString('vi-VN') : 'Vô hạn';
                        
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-4 pr-4">
                              <p className="font-bold text-slate-900">{name}</p>
                              <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded uppercase block w-max mt-1">
                                Loại xe ID: #{p.vehicleTypeId}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right text-indigo-600 font-mono font-bold">
                              {Number(p.hourlyRate).toLocaleString('vi-VN')}đ
                            </td>
                            <td className="py-4 px-4 text-right text-indigo-600 font-mono font-bold">
                              {Number(p.dailyRate).toLocaleString('vi-VN')}đ
                            </td>
                            <td className="py-4 px-4 text-right text-rose-600 font-mono">
                              {Number(p.lostTicketFee).toLocaleString('vi-VN')}đ
                            </td>
                            <td className="py-4 px-4 text-slate-450 text-[10px] font-mono leading-relaxed">
                              <div>Từ: {startStr}</div>
                              <div>Đến: {endStr}</div>
                            </td>
                            <td className="py-4 pl-4 text-right space-x-2">
                              <button
                                onClick={() => handleEditClick(p)}
                                className="text-indigo-600 hover:bg-indigo-50 border border-transparent px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                              >
                                Sửa
                              </button>
                              <button
                                onClick={() => handleDeleteClick(p.id, name)}
                                className="text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                              >
                                Xóa
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
        </div>
      </main>

      {/* Toast popup */}
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
