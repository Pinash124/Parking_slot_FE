import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import { userPortalService } from '../services/userPortalService';
import type { VehicleRequest } from '../types/parking';

export default function MyVehicles() {
  const queryClient = useQueryClient();
  
  // Custom Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('');
  
  // Form validations
  const [plateError, setPlateError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);

  // Trigger custom toast
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Queries
  const { data: vehicles = [], isLoading, error: fetchError } = useQuery({
    queryKey: ['userPortalVehicles'],
    queryFn: () => userPortalService.getUserPortalVehicles(),
  });

  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ['vehicleTypes'],
    queryFn: () => userPortalService.getVehicleTypes(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: VehicleRequest) => userPortalService.createUserPortalVehicle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPortalVehicles'] });
      showToast('Thêm phương tiện mới thành công!', 'success');
      closeModal();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Lỗi khi thêm phương tiện.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userPortalService.deleteUserPortalVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPortalVehicles'] });
      showToast('Đã xóa phương tiện thành công.', 'success');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Lỗi khi xóa phương tiện.', 'error');
    },
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setPlateNumber('');
    setVehicleTypeId('');
    setBrand('');
    setColor('');
    setPlateError(null);
    setTypeError(null);
  };

  const handleValidatePlate = (val: string) => {
    if (!val.trim()) {
      setPlateError('Biển số xe là bắt buộc.');
      return false;
    }
    setPlateError(null);
    return true;
  };

  const handleValidateType = (val: string) => {
    if (!val) {
      setTypeError('Vui lòng chọn loại xe.');
      return false;
    }
    setTypeError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isPlateValid = handleValidatePlate(plateNumber);
    const isTypeValid = handleValidateType(vehicleTypeId);

    if (!isPlateValid || !isTypeValid) {
      return;
    }

    createMutation.mutate({
      plateNumber: plateNumber.trim().toUpperCase(),
      vehicleTypeId: parseInt(vehicleTypeId, 10),
      brand: brand.trim() || undefined,
      color: color.trim() || undefined,
    });
  };

  const handleDelete = (id: number, plate: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa xe biển số ${plate} khỏi hệ thống?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased flex flex-col relative">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Phương Tiện Của Tôi</h1>
            <p className="text-slate-450 text-xs mt-1">Danh sách xe đã đăng ký và sử dụng dịch vụ gửi xe của bạn</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-550 active:scale-98 transition text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Thêm phương tiện
          </button>
        </div>

        {/* Loading / Error States */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
            <p className="text-xs text-slate-400 font-semibold mt-3 animate-pulse">Đang tải danh sách xe...</p>
          </div>
        )}

        {fetchError && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl max-w-lg mx-auto">
            Không thể tải thông tin phương tiện. Vui lòng thử lại sau. (Chi tiết: {fetchError.message})
          </div>
        )}

        {/* Vehicle Card Grid */}
        {!isLoading && !fetchError && (
          vehicles.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center max-w-md mx-auto shadow-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-800">Chưa có phương tiện nào</h3>
              <p className="text-xs text-slate-400 mt-1 mb-6">Đăng ký biển số xe của bạn để thực hiện đặt lịch và theo dõi lịch sử gửi xe tự động.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition"
              >
                + Đăng ký ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition duration-200 flex flex-col justify-between relative overflow-hidden group"
                >
                  {/* Glowing card detail */}
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600 group-hover:bg-indigo-500 transition"></div>

                  <div className="space-y-4">
                    {/* Card Header: Plate number */}
                    <div className="flex items-center justify-between pl-2">
                      <div className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-800 font-extrabold text-sm tracking-wide font-mono uppercase">
                        {v.plateNumber}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                        v.status?.toUpperCase() === 'ACTIVE' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {v.status?.toUpperCase() === 'ACTIVE' ? 'Hoạt động' : (v.status || 'N/A')}
                      </span>
                    </div>

                    {/* Card Info Details */}
                    <div className="space-y-2 text-xs pl-2">
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-400">Phân loại xe:</span>
                        <span className="font-semibold text-slate-750">{v.vehicleTypeName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-400">Hãng xe (Hiệu):</span>
                        <span className="font-semibold text-slate-800">{v.brand || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Màu sơn xe:</span>
                        <span className="font-semibold text-slate-800">{v.color || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end pl-2">
                    <button
                      onClick={() => handleDelete(v.id, v.plateNumber)}
                      disabled={deleteMutation.isPending}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition duration-150"
                    >
                      Xóa xe
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>

      {/* Add Vehicle Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Modal Card Backdrop area to close */}
          <div className="absolute inset-0 cursor-default" onClick={closeModal}></div>

          {/* Modal Container */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6.5 max-w-md w-full shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-800">Đăng ký phương tiện mới</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-650 p-1.5 hover:bg-slate-100 rounded-lg transition cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form className="space-y-4 mt-4" onSubmit={handleSubmit} noValidate>
              {/* Plate Number */}
              <div>
                <label htmlFor="plate" className="block text-[10px] font-bold uppercase text-slate-450 mb-1.5">
                  Biển số xe *
                </label>
                <input
                  id="plate"
                  type="text"
                  value={plateNumber}
                  onChange={(e) => {
                    setPlateNumber(e.target.value);
                    if (plateError) handleValidatePlate(e.target.value);
                  }}
                  onBlur={() => handleValidatePlate(plateNumber)}
                  className={`w-full bg-slate-50 border ${
                    plateError ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                  } rounded-xl px-4 py-2.5 text-xs font-bold uppercase placeholder-slate-400 focus:outline-none focus:ring-4 transition duration-200`}
                  placeholder="30A-999.99"
                />
                {plateError && (
                  <p className="mt-1 text-[10px] text-rose-500 font-medium animate-in fade-in duration-150">
                    {plateError}
                  </p>
                )}
              </div>

              {/* Vehicle Type selection */}
              <div>
                <label htmlFor="type" className="block text-[10px] font-bold uppercase text-slate-455 mb-1.5">
                  Loại phương tiện *
                </label>
                <select
                  id="type"
                  value={vehicleTypeId}
                  onChange={(e) => {
                    setVehicleTypeId(e.target.value);
                    if (typeError) handleValidateType(e.target.value);
                  }}
                  onBlur={() => handleValidateType(vehicleTypeId)}
                  className={`w-full bg-slate-50 border ${
                    typeError ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                  } rounded-xl px-4 py-2.5 text-xs font-bold placeholder-slate-400 focus:outline-none focus:ring-4 transition duration-200`}
                >
                  <option value="">-- Chọn Loại Xe --</option>
                  {vehicleTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} {type.description ? `(${type.description})` : ''}
                    </option>
                  ))}
                </select>
                {typeError && (
                  <p className="mt-1 text-[10px] text-rose-500 font-medium animate-in fade-in duration-150">
                    {typeError}
                  </p>
                )}
              </div>

              {/* Brand (Hiệu xe) */}
              <div>
                <label htmlFor="brand" className="block text-[10px] font-bold uppercase text-slate-450 mb-1.5">
                  Hãng xe / Hiệu xe (Không bắt buộc)
                </label>
                <input
                  id="brand"
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 rounded-xl px-4 py-2.5 text-xs placeholder-slate-400 focus:outline-none focus:ring-4 transition duration-200"
                  placeholder="Toyota, Honda, VinFast..."
                />
              </div>

              {/* Color (Màu sắc) */}
              <div>
                <label htmlFor="color" className="block text-[10px] font-bold uppercase text-slate-450 mb-1.5">
                  Màu sơn xe (Không bắt buộc)
                </label>
                <input
                  id="color"
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 rounded-xl px-4 py-2.5 text-xs placeholder-slate-400 focus:outline-none focus:ring-4 transition duration-200"
                  placeholder="Trắng, Đen, Xanh..."
                />
              </div>

              {/* Actions submit */}
              <div className="flex space-x-3 pt-3 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-xl text-xs font-bold cursor-pointer transition active:scale-98"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-550 active:scale-98 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending ? 'Đang gửi...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating State Toast Notification */}
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
