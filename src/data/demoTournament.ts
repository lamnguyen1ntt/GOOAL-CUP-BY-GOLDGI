import { PlayerInfo, MatchInfo, SpreadsheetConfig, AppMode } from '../types';

export const DEMO_CONFIG: SpreadsheetConfig = {
  spreadsheetId: 'demo_sheet_id',
  playersTabName: 'Danh sách Bé đăng ký',
  matchesTabName: 'Lịch thi đấu',
  mode: AppMode.SINGLE_SHEET_PLAYERS,
  tournamentName: 'GOOOAL CUP BY GOLDGI',
  organizerName: 'BỈM NHẬT BẢN GOLDGI',
  mapping: {
    playerName: 'Họ và tên của bé:',
    playerPhone: 'Số điện thoại của ba/mẹ (SĐT bắt buộc là số đã đăng ký Zalo)',
    playerAge: 'Bé hiện bao nhiêu tháng tuổi?',
    playerGroup: 'Bảng đấu',
  }
};

export const DEMO_PLAYERS: PlayerInfo[] = [
  {
    id: 'p1',
    name: 'Nguyễn Mộc Nghi',
    phone: '0974049545',
    age: '7 - 12 tháng',
    group: 'A1',
    customData: {
      'SBD': 'A1-001',
      'Họ và tên ba/ mẹ': 'Nguyễn Thị Phương Thuý',
      'Lượt thi đấu': '01',
      'Ngày': '11/07/2026',
      'Giờ đấu': '15:45',
      'Giờ check in': '15:30',
      'Địa chỉ hiện tại của bé': '133/69 Ni Sư Huỳnh Liên Phường 10 Tân bình TPHCM'
    }
  },
  {
    id: 'p2',
    name: 'Tôn Nữ Minh Châu',
    phone: '0765116616',
    age: '7 - 12 tháng',
    group: 'A1',
    customData: {
      'SBD': 'A1-002',
      'Họ và tên ba/ mẹ': 'Nguyễn Huỳnh Uyển Nhi',
      'Lượt thi đấu': '01',
      'Ngày': '11/07/2026',
      'Giờ đấu': '15:45',
      'Giờ check in': '15:30',
      'Địa chỉ hiện tại của bé': '500/117/21 Đoàn Văn Bơ Phường 14 Quận 4, HCM (Phường Khánh Hội)'
    }
  },
  {
    id: 'p3',
    name: 'Lê Cảnh Quân',
    phone: '0787077596',
    age: '7 - 12 tháng',
    group: 'A1',
    customData: {
      'SBD': 'A1-003',
      'Họ và tên ba/ mẹ': 'Nguyễn Thanh Huyền',
      'Lượt thi đấu': '01',
      'Ngày': '11/07/2026',
      'Giờ đấu': '15:45',
      'Giờ check in': '15:30',
      'Kỹ năng hiện tại của bé': 'Bé chưa biết đi',
      'Địa chỉ hiện tại của bé': '363/13 Chu Văn An phường Bình thạnh TP HCM'
    }
  },
  {
    id: 'p4',
    name: 'Đỗ Duy Khang',
    phone: '0813246773',
    age: '7 - 12 tháng',
    group: 'A1',
    customData: {
      'SBD': 'A1-004',
      'Họ và tên ba/ mẹ': 'Khổng Ngọc Huỳnh Châu',
      'Lượt thi đấu': '01',
      'Ngày': '11/07/2026',
      'Giờ đấu': '15:45',
      'Giờ check in': '15:30',
      'Kỹ năng hiện tại của bé': 'Bé chưa biết đi',
      'Địa chỉ hiện tại của bé': 'Phường An Hội Đông, TPHCM'
    }
  }
];

export const DEMO_MATCHES: MatchInfo[] = [
  {
    id: 'm1',
    round: 'Lượt thi đấu 01',
    time: '15:45 - 11/07/2026',
    group: 'A1',
    court: 'Khu vực thi đấu chính',
    player1Name: 'Nguyễn Mộc Nghi',
    player1Phone: '0974049545',
    player2Name: 'Tôn Nữ Minh Châu',
    player2Phone: '0765116616',
    status: 'Chuẩn bị diễn ra',
    customData: {
      'SBD của Bé 1': 'A1-001',
      'SBD của Bé 2': 'A1-002',
      'Giờ Check in': '15:30'
    }
  },
  {
    id: 'm2',
    round: 'Lượt thi đấu 01',
    time: '15:45 - 11/07/2026',
    group: 'A1',
    court: 'Khu vực thi đấu chính',
    player1Name: 'Lê Cảnh Quân',
    player1Phone: '0787077596',
    player2Name: 'Đỗ Duy Khang',
    player2Phone: '0813246773',
    status: 'Chuẩn bị diễn ra',
    customData: {
      'SBD của Bé 1': 'A1-003',
      'SBD của Bé 2': 'A1-004',
      'Giờ Check in': '15:30'
    }
  }
];
