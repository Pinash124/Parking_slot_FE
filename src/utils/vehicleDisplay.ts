export const vehicleGroupOf = (name?: string) => {
  const normalized = (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (
    normalized.includes('MOTOR') ||
    normalized.includes('BIKE') ||
    normalized.includes('MAY') ||
    normalized.includes('2 BANH') ||
    normalized.includes('TWO')
  ) {
    return 'TWO_WHEEL';
  }

  if (
    normalized.includes('CAR') ||
    normalized.includes('OTO') ||
    normalized.includes('O TO') ||
    normalized.includes('4 BANH') ||
    normalized.includes('AUTO')
  ) {
    return 'FOUR_WHEEL';
  }

  return 'OTHER';
};

export const formatVehicleTypeName = (name?: string) => {
  const group = vehicleGroupOf(name);
  if (group === 'TWO_WHEEL') return 'Xe 2 bánh';
  if (group === 'FOUR_WHEEL') return 'Ô tô';
  return name || 'Khác';
};

export const formatParkingZoneName = (name?: string) => {
  const rawName = name || '';
  const normalized = rawName.toUpperCase();
  const floor = normalized.match(/^F\d+/)?.[0] || '';

  if (normalized.includes('MOTORBIKE')) return floor ? `${floor} - Xe 2 bánh` : 'Xe 2 bánh';
  if (normalized.includes('CAR-MONTHLY')) return floor ? `${floor} - Ô tô tháng` : 'Ô tô tháng';
  if (normalized.includes('CAR-NORMAL')) return floor ? `${floor} - Ô tô thường` : 'Ô tô thường';
  if (normalized.includes('CAR')) return floor ? `${floor} - Ô tô` : 'Ô tô';

  return rawName || 'Chưa rõ phân khu';
};

export const formatParkingZoneOption = (zone: any) => formatParkingZoneName(zone.zoneName);

export const formatSlotStatusName = (status?: string) => {
  switch ((status || '').toUpperCase()) {
    case 'AVAILABLE': return 'Trống';
    case 'OCCUPIED': return 'Đang sử dụng';
    case 'RESERVED': return 'Đã đặt trước';
    case 'MAINTENANCE': return 'Bảo trì';
    case 'LOCKED': return 'Tạm khóa';
    case 'MONTHLY_HELD': return 'Giữ chỗ vé tháng';
    case 'MONTHLY_RESERVED': return 'Đã giữ vé tháng';
    case 'MONTHLY_OCCUPIED': return 'Xe tháng đang đỗ';
    default: return status || 'Chưa rõ';
  }
};

export const formatPricingPolicyName = (name?: string) => {
  const normalized = (name || '').toUpperCase();
  if (normalized.includes('MOTORBIKE') || normalized.includes('XE 2')) return 'Chính sách xe 2 bánh';
  if (normalized.includes('CAR') || normalized.includes('Ô TÔ')) return 'Chính sách ô tô';
  return name || 'Chính sách giá';
};

export const formatFeedbackTypeName = (type?: string) => {
  switch ((type || '').toUpperCase()) {
    case 'INCIDENT': return 'Báo cáo sự cố';
    case 'COMPLAINT': return 'Khiếu nại';
    case 'SUGGESTION': return 'Góp ý';
    case 'OTHER': return 'Khác';
    default: return type || 'Khác';
  }
};

export const formatIncidentTypeName = (type?: string) => {
  switch ((type || '').toUpperCase()) {
    case 'LOST_TICKET': return 'Mất vé';
    case 'WRONG_PLATE': return 'Sai biển số';
    case 'OVERTIME': return 'Quá hạn';
    case 'WRONG_ZONE': return 'Sai khu vực';
    case 'UNPAID': return 'Chưa thanh toán';
    case 'WRONG_VEHICLE_INFO': return 'Sai thông tin xe';
    case 'OCCUPIED_SLOT': return 'Ô đỗ bị chiếm';
    default: return formatFeedbackTypeName(type);
  }
};


export const formatSlotCodeName = (code?: string | null) => {
  if (!code) return '';
  return code
    .replace(/(^|-)MOTORBIKE(?=-|$)/gi, '$1XE 2 BÁNH')
    .replace(/(^|-)CAR(?=-|$)/gi, '$1Ô TÔ');
};
