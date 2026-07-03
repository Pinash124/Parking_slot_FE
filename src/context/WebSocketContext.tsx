import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface WebSocketContextType {
  isConnected: boolean;
  addToast: (message: string, type?: ToastMessage['type']) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const stompClientRef = useRef<Client | null>(null);

  // Helper to add toast notifications
  const addToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    // Setup STOMP client using SockJS
    const stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => {
        console.log('[WebSocket STOMP]', str);
      },
    });

    stompClient.onConnect = (frame) => {
      setIsConnected(true);
      console.log('Connected to WebSocket server:', frame);
      addToast('Đã thiết lập kết nối thời gian thực với máy chủ.', 'success');

      // 1. Subscribe to slots status topic
      stompClient.subscribe('/topic/parking-slots', (message) => {
        try {
          const data = JSON.parse(message.body);
          console.log('Received slot update:', data);

          // Invalidate slots queries immediately to refetch live grids
          queryClient.invalidateQueries({ queryKey: ['slots'] });
          queryClient.invalidateQueries({ queryKey: ['availableSlots'] });
          queryClient.invalidateQueries({ queryKey: ['managementSlotsList'] });
          queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] });
          queryClient.invalidateQueries({ queryKey: ['adminOverview'] });

          const slotCode = data.slotCode || data.code || `ID #${data.slotId || data.id || ''}`;
          let statusText = data.status || '';
          if (data.status === 'AVAILABLE') statusText = 'TRỐNG';
          if (data.status === 'OCCUPIED') statusText = 'BẬN';
          if (data.status === 'MAINTENANCE') statusText = 'BẢO TRÌ';
          if (data.status === 'LOCKED') statusText = 'KHÓA';

          addToast(`Vị trí đỗ ${slotCode} vừa chuyển sang trạng thái: ${statusText}`, 'info');
        } catch (err) {
          console.error('Failed to parse slot WebSocket body', err);
        }
      });

      // 2. Subscribe to sessions status topic
      stompClient.subscribe('/topic/parking-sessions', (message) => {
        try {
          const data = JSON.parse(message.body);
          console.log('Received session update:', data);

          // Invalidate active session, reservation list, and dashboard queries
          queryClient.invalidateQueries({ queryKey: ['currentSession'] });
          queryClient.invalidateQueries({ queryKey: ['reservationsList'] });
          queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] });
          queryClient.invalidateQueries({ queryKey: ['adminOverview'] });

          const plate = data.licensePlate || data.plateNumber || '';
          const actionType = data.status || data.action || '';
          let msg = data.message || `Cập nhật phiên đỗ xe: ${plate}`;

          if (actionType === 'CHECK_IN') msg = `Xe ${plate} đã cổng vào check-in thành công!`;
          if (actionType === 'CHECK_OUT') msg = `Xe ${plate} đã hoàn tất thanh toán check-out!`;
          if (actionType === 'COMPLETED') msg = `Thanh toán thành công cho biển số ${plate}!`;
          if (actionType === 'RESERVED') msg = `Đặt lịch đỗ trước mới vừa được ghi nhận!`;

          const toastType = (actionType === 'COMPLETED' || actionType === 'CHECK_OUT' || actionType === 'CHECK_IN') ? 'success' : 'info';
          addToast(msg, toastType);
        } catch (err) {
          console.error('Failed to parse session WebSocket body', err);
        }
      });
    };

    stompClient.onDisconnect = () => {
      setIsConnected(false);
      console.log('Disconnected from WebSocket server');
      addToast('Mất kết nối với máy chủ. Đang tự động kết nối lại...', 'warning');
    };

    stompClient.onStompError = (frame) => {
      console.error('STOMP error frame:', frame);
      addToast('Gặp lỗi giao thức kết nối thời gian thực.', 'error');
    };

    stompClient.onWebSocketClose = () => {
      setIsConnected(false);
      console.log('WebSocket connection closed');
    };

    stompClient.onWebSocketError = (error) => {
      setIsConnected(false);
      console.error('WebSocket connection error:', error);
    };

    stompClient.activate();
    stompClientRef.current = stompClient;

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, [queryClient]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, addToast }}>
      {children}

      {/* Floating Notifications Toasts Container Stack */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-3 max-w-sm w-full">
        {toasts.map((toast) => {
          let badgeColor = 'bg-indigo-500 border-indigo-600';
          if (toast.type === 'success') badgeColor = 'bg-emerald-500 border-emerald-600';
          if (toast.type === 'error') badgeColor = 'bg-rose-500 border-rose-600';
          if (toast.type === 'warning') badgeColor = 'bg-amber-500 border-amber-600';

          return (
            <div
              key={toast.id}
              className={`flex items-start justify-between gap-3 px-4.5 py-3.5 rounded-2xl shadow-2xl border text-white text-xs font-bold tracking-tight animate-in slide-in-from-right-5 fade-in duration-300 ${badgeColor}`}
            >
              <div className="flex items-start gap-2.5">
                {toast.type === 'success' && (
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {toast.type === 'error' && (
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                {toast.type === 'warning' && (
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                {toast.type === 'info' && (
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="leading-tight">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="hover:text-slate-100 transition cursor-pointer text-[10px] shrink-0 font-bold ml-1.5 opacity-80 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
