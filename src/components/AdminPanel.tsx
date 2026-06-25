import React, { useState, useEffect } from 'react';
import { 
  SpreadsheetConfig, 
  AppMode, 
  ColumnMapping 
} from '../types';
import { 
  extractSpreadsheetId, 
  fetchSheetCsv 
} from '../utils/sheetParser';
import { 
  FileSpreadsheet, 
  Settings, 
  Sparkles, 
  Share2, 
  Link, 
  Check, 
  Copy, 
  HelpCircle, 
  Info, 
  AlertCircle, 
  ChevronRight, 
  RefreshCw, 
  Eye, 
  ArrowLeft,
  Grid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  onSaveConfig: (config: SpreadsheetConfig) => void;
  currentConfig: SpreadsheetConfig | null;
  onBackToLookup: () => void;
}

export default function AdminPanel({ onSaveConfig, currentConfig, onBackToLookup }: AdminPanelProps) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tabs in spreadsheet
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [selectedPlayersTab, setSelectedPlayersTab] = useState('');
  const [selectedMatchesTab, setSelectedMatchesTab] = useState('');
  
  // Headers for auto-mapping
  const [playersHeaders, setPlayersHeaders] = useState<string[]>([]);
  const [matchesHeaders, setMatchesHeaders] = useState<string[]>([]);
  
  // Config state
  const [mode, setMode] = useState<AppMode>(AppMode.SINGLE_SHEET_MATCHES);
  const [tournamentName, setTournamentName] = useState('Giải Pickleball Vô Địch CLB 2026');
  const [organizerName, setOrganizerName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [footerText, setFooterText] = useState('');
  const [manualPlayersCount, setManualPlayersCount] = useState('');
  const [manualRoundsCount, setManualRoundsCount] = useState('');
  const [mapping, setMapping] = useState<ColumnMapping>({
    playerName: '',
    playerPhone: '',
    playerAge: '',
    playerGroup: '',
    matchRound: '',
    matchTime: '',
    matchCourt: '',
    matchPlayer1Name: '',
    matchPlayer1Phone: '',
    matchPlayer2Name: '',
    matchPlayer2Phone: '',
    matchStatus: '',
    matchResult: '',
  });

  const [step, setStep] = useState(1);
  const [shareableUrl, setShareableUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Initialize config if edit mode
  useEffect(() => {
    if (currentConfig) {
      setSpreadsheetId(currentConfig.spreadsheetId);
      setSheetUrl(`https://docs.google.com/spreadsheets/d/${currentConfig.spreadsheetId}`);
      setSelectedPlayersTab(currentConfig.playersTabName);
      setSelectedMatchesTab(currentConfig.matchesTabName);
      setMode(currentConfig.mode);
      setTournamentName(currentConfig.tournamentName);
      setOrganizerName(currentConfig.organizerName);
      setMapping(currentConfig.mapping);
      setAdminPassword(currentConfig.adminPassword || '');
      setBannerUrl(currentConfig.bannerUrl || '');
      setFooterText(currentConfig.footerText || '');
      setManualPlayersCount(currentConfig.manualPlayersCount || '');
      setManualRoundsCount(currentConfig.manualRoundsCount || '');
      setStep(2); // Jump to mapping/details
    }
  }, [currentConfig]);

  // Handle Sheet connection
  const handleConnectSheet = async () => {
    setError(null);
    const id = extractSpreadsheetId(sheetUrl);
    if (!id) {
      setError('Đường dẫn Google Sheet không hợp lệ. Vui lòng nhập link đầy đủ.');
      return;
    }

    setIsLoading(true);
    setSpreadsheetId(id);

    try {
      // First, try to fetch the default sheet to verify access and get headers
      // If it works, the sheet is publicly accessible
      const firstTabRows = await fetchSheetCsv(id);
      if (firstTabRows.length === 0) {
        throw new Error('Spreadsheet trống hoặc không có dòng tiêu đề.');
      }
      
      const headers = Object.keys(firstTabRows[0]);
      setPlayersHeaders(headers);
      setMatchesHeaders(headers);
      
      // Attempt to guess tab names or let users write them
      // Since standard gviz/tq doesn't return tabs list easily without Auth,
      // we'll instruct the user to type/confirm tab names.
      // But we preload default common ones
      setAvailableTabs(['Sheet1', 'Danh sách', 'Lịch thi đấu', 'Trang tính1', 'Players', 'Matches']);
      
      // Auto-detect columns on the default sheet for Step 2
      autoDetectColumns(headers, mode);

      setStep(2);
    } catch (err: any) {
      console.error(err);
      setError(
        err.message || 
        'Không thể kết nối với Google Sheet. Vui lòng đảm bảo Sheet đã được cài đặt quyền: "Bất kỳ ai có liên kết đều có thể xem" (Anyone with the link can view).'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Run header fetch for custom tab selection
  const handleFetchTabHeaders = async (tabName: string, isPlayersTab: boolean) => {
    if (!spreadsheetId || !tabName) return;
    try {
      const rows = await fetchSheetCsv(spreadsheetId, tabName);
      if (rows.length > 0) {
        const headers = Object.keys(rows[0]);
        if (isPlayersTab) {
          setPlayersHeaders(headers);
          // Auto fill fields
          autoDetectPlayersColumns(headers);
        } else {
          setMatchesHeaders(headers);
          autoDetectMatchesColumns(headers);
        }
      }
    } catch (err) {
      console.error('Fetch headers error', err);
    }
  };

  // Auto detect columns helper
  const autoDetectColumns = (headers: string[], currentMode: AppMode) => {
    const newMapping = { ...mapping };
    
    const findMatch = (keys: string[]) => {
      return headers.find(h => {
        const lower = h.toLowerCase().trim();
        return keys.some(k => lower.includes(k));
      }) || '';
    };

    newMapping.playerName = findMatch(['tên bé', 'họ và tên của bé', 'tên vđv', 'họ tên', 'tên', 'vđv', 'vdv', 'player']);
    newMapping.playerPhone = findMatch(['số điện thoại của ba/mẹ', 'sđt', 'sdt', 'điện thoại', 'số điện thoại', 'ba/mẹ', 'ba mẹ', 'zalo', 'phone']);
    newMapping.playerAge = findMatch(['tháng tuổi', 'tuổi', 'tuoi', 'độ tuổi', 'age', 'năm sinh', 'ns']);
    newMapping.playerGroup = findMatch(['bảng đấu', 'bảng', 'bang', 'group']);
    newMapping.playerSbd = findMatch(['sbd', 'mã số', 'số báo danh', 'báo danh']);
    newMapping.playerParentName = findMatch(['ba/ mẹ', 'ba mẹ', 'bố mẹ', 'phụ huynh', 'tên bố', 'tên mẹ', 'họ và tên ba', 'ba/mẹ']);
    newMapping.playerAddress = findMatch(['địa chỉ', 'nơi ở', 'thường trú', 'tạm trú', 'địa chỉ hiện tại']);
    newMapping.playerSkill = findMatch(['kỹ năng', 'ghi chú', 'kỹ năng của bé']);

    if (currentMode === AppMode.SINGLE_SHEET_MATCHES || currentMode === AppMode.SINGLE_SHEET_PLAYERS) {
      newMapping.matchRound = findMatch(['lượt thi đấu', 'lượt đấu', 'lượt', 'vòng', 'vong', 'round']);
      newMapping.matchTime = findMatch(['giờ đấu', 'thời gian thi', 'giờ thi', 'giờ', 'gio', 'time', 'thời gian']);
      newMapping.matchCourt = findMatch(['sân', 'san', 'court', 'sân đấu', 'địa điểm']);
      newMapping.matchPlayer1Name = findMatch(['vđv 1', 'vdv 1', 'người 1', 'player 1', 'đội 1', 'team 1']);
      newMapping.matchPlayer1Phone = findMatch(['sđt 1', 'sdt 1', 'phone 1', 'điện thoại 1']);
      newMapping.matchPlayer2Name = findMatch(['vđv 2', 'vdv 2', 'người 2', 'player 2', 'đội 2', 'team 2']);
      newMapping.matchPlayer2Phone = findMatch(['sđt 2', 'sdt 2', 'phone 2', 'điện thoại 2']);
      newMapping.matchStatus = findMatch(['trạng thái', 'trang thai', 'status']);
      newMapping.matchResult = findMatch(['kết quả', 'ket qua', 'tỉ số', 'ti so', 'result', 'score']);
    }

    setMapping(newMapping);
  };

  const autoDetectPlayersColumns = (headers: string[]) => {
    setMapping(prev => {
      const findMatch = (keys: string[]) => {
        return headers.find(h => {
          const lower = h.toLowerCase().trim();
          return keys.some(k => lower.includes(k));
        }) || '';
      };
      return {
        ...prev,
        playerName: findMatch(['tên bé', 'họ và tên của bé', 'tên vđv', 'họ tên', 'tên', 'vđv', 'vdv', 'player']),
        playerPhone: findMatch(['số điện thoại của ba/mẹ', 'sđt', 'sdt', 'điện thoại', 'số điện thoại', 'ba/mẹ', 'ba mẹ', 'zalo', 'phone']),
        playerAge: findMatch(['tháng tuổi', 'tuổi', 'tuoi', 'độ tuổi', 'age', 'năm sinh', 'ns']),
        playerGroup: findMatch(['bảng đấu', 'bảng', 'bang', 'group']),
        playerSbd: findMatch(['sbd', 'mã số', 'số báo danh', 'báo danh']),
        playerParentName: findMatch(['ba/ mẹ', 'ba mẹ', 'bố mẹ', 'phụ huynh', 'tên bố', 'tên mẹ', 'họ và tên ba', 'ba/mẹ']),
        playerAddress: findMatch(['địa chỉ', 'nơi ở', 'thường trú', 'tạm trú', 'địa chỉ hiện tại']),
        playerSkill: findMatch(['kỹ năng', 'ghi chú', 'kỹ năng của bé']),
      };
    });
  };

  const autoDetectMatchesColumns = (headers: string[]) => {
    setMapping(prev => {
      const findMatch = (keys: string[]) => {
        return headers.find(h => {
          const lower = h.toLowerCase().trim();
          return keys.some(k => lower.includes(k));
        }) || '';
      };
      return {
        ...prev,
        matchRound: findMatch(['lượt thi đấu', 'lượt đấu', 'lượt', 'vòng', 'vong', 'round']),
        matchTime: findMatch(['giờ đấu', 'thời gian thi', 'giờ thi', 'giờ', 'gio', 'time', 'thời gian']),
        matchCourt: findMatch(['sân', 'san', 'court', 'sân đấu', 'địa điểm']),
        matchPlayer1Name: findMatch(['vđv 1', 'vdv 1', 'người 1', 'player 1', 'đối 1', 'đối thủ 1', 'player1']),
        matchPlayer2Name: findMatch(['vđv 2', 'vdv 2', 'người 2', 'player 2', 'đối 2', 'đối thủ 2', 'player2']),
        matchStatus: findMatch(['trạng thái', 'trang thai', 'status']),
        matchResult: findMatch(['kết quả', 'ket qua', 'tỉ số', 'ti so', 'result', 'score']),
      };
    });
  };

  // Save full configuration
  const handleSaveAndGenerate = () => {
    if (!tournamentName.trim()) {
      alert('Vui lòng nhập tên giải đấu.');
      return;
    }
    if (!mapping.playerName || !mapping.playerPhone) {
      alert('Cột Tên bé và Số điện thoại ba/mẹ là bắt buộc.');
      return;
    }

    const config: SpreadsheetConfig = {
      spreadsheetId,
      playersTabName: selectedPlayersTab,
      matchesTabName: selectedMatchesTab,
      mode,
      mapping,
      tournamentName,
      organizerName,
      adminPassword: adminPassword || undefined,
      bannerUrl: bannerUrl || undefined,
      footerText: footerText || undefined,
      manualPlayersCount: manualPlayersCount || undefined,
      manualRoundsCount: manualRoundsCount || undefined,
    };

    onSaveConfig(config);

    // Generate Shareable Link (Encode config as base64 in url)
    const stringified = JSON.stringify(config);
    // Use UTF-8 safe base64 encoding (btoa might fail with Unicode)
    const base64Config = btoa(encodeURIComponent(stringified));
    const cleanAppUrl = window.location.origin + window.location.pathname;
    const generatedUrl = `${cleanAppUrl}?t=${base64Config}`;
    
    setShareableUrl(generatedUrl);
    setStep(3);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareableUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
        <div>
          <h1 id="admin-title" className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600 animate-spin-slow" />
            Cấu Hình Hệ Thống Tra Cứu
          </h1>
          <p className="text-gray-500 text-sm mt-1">Thiết lập kết nối với Google Sheets của ban tổ chức</p>
        </div>
        <button 
          onClick={onBackToLookup}
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1 transition-all duration-200 cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại tra cứu
        </button>
      </div>

      {/* Steps Indicator */}
      <div className="grid grid-cols-3 gap-2 mb-8">
        {[1, 2, 3].map((num) => (
          <div key={num} className="flex flex-col gap-1">
            <div className={`h-2 rounded-full transition-all duration-300 ${
              step >= num ? 'bg-indigo-600' : 'bg-slate-100'
            }`} />
            <span className={`text-xs font-semibold ${
              step === num ? 'text-indigo-600' : 'text-slate-400'
            }`}>
              Bước {num}: {num === 1 ? 'Kết nối Sheet' : num === 2 ? 'Cấu hình & Ghép cột' : 'Nhận liên kết'}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Input URL */}
      {step === 1 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 md:p-8"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Nhập liên kết Google Sheets</h2>
              <p className="text-sm text-slate-500 mt-1">
                Tạo một bảng tính Google Sheets với danh sách vận động viên, lịch đấu, sau đó chia sẻ ở chế độ xem công khai.
              </p>
            </div>
          </div>

          {/* Quick instructions */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 mb-6 flex gap-3 text-slate-700 text-sm">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-800 block mb-1">Hướng dẫn chia sẻ Google Sheets:</span>
              <ol className="list-decimal list-inside space-y-1 text-slate-600">
                <li>Mở file Google Sheets của bạn.</li>
                <li>Nhấn nút <b>Chia sẻ</b> (Share) ở góc trên bên phải.</li>
                <li>Tại mục "Quyền truy cập chung" (General access), đổi thành <b>Bất kỳ ai có liên kết đều có thể xem</b> (Anyone with the link can view).</li>
                <li>Sao chép đường dẫn (link) và dán vào ô bên dưới.</li>
              </ol>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Đường dẫn Google Sheets</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl text-slate-800 text-sm shadow-sm"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-xs font-semibold mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleConnectSheet}
                disabled={isLoading || !sheetUrl}
                className={`px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-all duration-200 cursor-pointer shadow-md`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang kết nối...
                  </>
                ) : (
                  <>
                    Kết nối bảng tính
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step 2: Config Mode & Columns Mapping */}
      {step === 2 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Tournament metadata card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Thông tin giải đấu
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tên Giải Đấu</label>
                <input 
                  type="text"
                  placeholder="Ví dụ: Giải Pickleball Vô Địch CLB 2026"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg text-slate-800 text-sm shadow-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Đường Dẫn Ảnh Banner Giải Đấu (URL)</label>
                <input 
                  type="text"
                  placeholder="Ví dụ: https://example.com/banner.png (để trống nếu dùng ảnh mặc định)"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg text-slate-800 text-sm shadow-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nội Dung Chân Trang (Footer Custom Text)</label>
                <input 
                  type="text"
                  placeholder="Ví dụ: © 2026 CLB Pickleball - Giải Đấu Thành Viên Mùa Xuân (để trống để dùng chân trang mặc định)"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg text-slate-800 text-sm shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tự điền số bé đã đăng ký (Ghi đè số liệu)</label>
                <input 
                  type="text"
                  placeholder="Ví dụ: 120 (để trống để tự động lấy từ danh sách)"
                  value={manualPlayersCount}
                  onChange={(e) => setManualPlayersCount(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg text-slate-800 text-sm shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tự điền số lượt thi đấu (Ghi đè số liệu)</label>
                <input 
                  type="text"
                  placeholder="Ví dụ: 80 (để trống để tự động tính toán)"
                  value={manualRoundsCount}
                  onChange={(e) => setManualRoundsCount(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg text-slate-800 text-sm shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tên Đơn Vị Tổ Chức (Không bắt buộc)</label>
                <input 
                  type="text"
                  placeholder="Ví dụ: CLB Sài Gòn Pickleball"
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg text-slate-800 text-sm shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mật khẩu ban tổ chức (Truy cập quản trị)</label>
                <input 
                  type="text"
                  placeholder="Mặc định nếu để trống: goooalcup2026"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg text-slate-800 text-sm shadow-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Layout mode cards */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4">Cấu trúc dữ liệu trong Google Sheets</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option 1: Single Sheet Matches */}
              <div 
                onClick={() => {
                  setMode(AppMode.SINGLE_SHEET_MATCHES);
                  autoDetectColumns(playersHeaders, AppMode.SINGLE_SHEET_MATCHES);
                }}
                className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  mode === AppMode.SINGLE_SHEET_MATCHES 
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-600/20' 
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg ${mode === AppMode.SINGLE_SHEET_MATCHES ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Grid className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-slate-800">Một bảng duy nhất</span>
                  </div>
                  <span className="text-xs text-indigo-700 font-semibold uppercase tracking-wider block mb-1">Mỗi dòng là một TRẬN ĐẤU</span>
                  <p className="text-xs text-slate-500">Bảng chứa các cột: Tên VĐV 1, SĐT VĐV 1, Tên VĐV 2, SĐT VĐV 2, Giờ đấu, Sân đấu...</p>
                </div>
                <div className="flex justify-end mt-4">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mode === AppMode.SINGLE_SHEET_MATCHES ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                    {mode === AppMode.SINGLE_SHEET_MATCHES && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </div>

              {/* Option 2: Single Sheet Players */}
              <div 
                onClick={() => {
                  setMode(AppMode.SINGLE_SHEET_PLAYERS);
                  autoDetectColumns(playersHeaders, AppMode.SINGLE_SHEET_PLAYERS);
                }}
                className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  mode === AppMode.SINGLE_SHEET_PLAYERS 
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-600/20' 
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg ${mode === AppMode.SINGLE_SHEET_PLAYERS ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Grid className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-slate-800">Một bảng duy nhất</span>
                  </div>
                  <span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider block mb-1">Mỗi dòng là một VĐV</span>
                  <p className="text-xs text-slate-500">Bảng chứa thông tin VĐV, và các cột tiếp theo là Lịch Trận 1, Lịch Trận 2...</p>
                </div>
                <div className="flex justify-end mt-4">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mode === AppMode.SINGLE_SHEET_PLAYERS ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                    {mode === AppMode.SINGLE_SHEET_PLAYERS && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </div>

              {/* Option 3: Two Sheets Linked */}
              <div 
                onClick={() => {
                  setMode(AppMode.TWO_SHEETS_LINKED);
                  // Setup tab names
                  if (!selectedPlayersTab) setSelectedPlayersTab('Danh sách');
                  if (!selectedMatchesTab) setSelectedMatchesTab('Lịch thi đấu');
                }}
                className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  mode === AppMode.TWO_SHEETS_LINKED 
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-600/20' 
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg ${mode === AppMode.TWO_SHEETS_LINKED ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Grid className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-slate-800">Hai bảng riêng biệt</span>
                  </div>
                  <span className="text-xs text-blue-700 font-semibold uppercase tracking-wider block mb-1">Tab VĐV & Tab Lịch Đấu</span>
                  <p className="text-xs text-slate-500">Tab 1 lưu VĐV (Tên, SĐT, Bảng). Tab 2 lưu Lịch đấu (Vòng đấu, VĐV 1, VĐV 2...)</p>
                </div>
                <div className="flex justify-end mt-4">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mode === AppMode.TWO_SHEETS_LINKED ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                    {mode === AppMode.TWO_SHEETS_LINKED && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed mapping section */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-base font-bold text-slate-800">Ghép cột (Column Mapping)</h2>
              <p className="text-sm text-slate-500 mt-1">Chọn chính xác tên cột trong Google Sheet của bạn ứng với các trường dữ liệu</p>
            </div>

            {/* If 2-Sheets Mode: Select Tabs first */}
            {mode === AppMode.TWO_SHEETS_LINKED && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-150">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Tên Tab Danh Sách VĐV</label>
                  <input 
                    type="text"
                    placeholder="Ví dụ: Danh sách"
                    value={selectedPlayersTab}
                    onChange={(e) => {
                      setSelectedPlayersTab(e.target.value);
                      handleFetchTabHeaders(e.target.value, true);
                    }}
                    onBlur={() => handleFetchTabHeaders(selectedPlayersTab, true)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg text-slate-800 text-sm shadow-sm"
                  />
                  <p className="text-2xs text-slate-400 mt-1">Bấm ra ngoài hoặc Enter để cập nhật cột</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Tên Tab Lịch Thi Đấu</label>
                  <input 
                    type="text"
                    placeholder="Ví dụ: Lịch thi đấu"
                    value={selectedMatchesTab}
                    onChange={(e) => {
                      setSelectedMatchesTab(e.target.value);
                      handleFetchTabHeaders(e.target.value, false);
                    }}
                    onBlur={() => handleFetchTabHeaders(selectedMatchesTab, false)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg text-slate-800 text-sm shadow-sm"
                  />
                  <p className="text-2xs text-slate-400 mt-1">Bấm ra ngoài hoặc Enter để cập nhật cột</p>
                </div>
              </div>
            )}

            {/* Mappings Form */}
            <div className="space-y-6">
              {/* VĐV fields */}
              <div>
                <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-3 border-l-2 border-amber-500 pl-2">
                  {mode === AppMode.TWO_SHEETS_LINKED ? 'Thông tin bé & Phụ huynh (Tab Danh Sách)' : 'Thông tin bé & Phụ huynh'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tên bé */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Cột Họ Tên Bé <span className="text-red-500">*</span></label>
                    <select 
                      value={mapping.playerName}
                      onChange={(e) => setMapping(prev => ({ ...prev, playerName: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- Chọn cột --</option>
                      {playersHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* SĐT */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Cột Số Điện Thoại Ba/Mẹ (Tra cứu) <span className="text-red-500">*</span></label>
                    <select 
                      value={mapping.playerPhone}
                      onChange={(e) => setMapping(prev => ({ ...prev, playerPhone: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- Chọn cột --</option>
                      {playersHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* SBD */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Cột Số Báo Danh (SBD) (Tùy chọn)</label>
                    <select 
                      value={mapping.playerSbd || ''}
                      onChange={(e) => setMapping(prev => ({ ...prev, playerSbd: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- Tự động tìm kiếm / Chọn cột --</option>
                      {playersHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Họ tên Ba/mẹ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Cột Họ Tên Ba/Mẹ (Tùy chọn)</label>
                    <select 
                      value={mapping.playerParentName || ''}
                      onChange={(e) => setMapping(prev => ({ ...prev, playerParentName: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- Tự động tìm kiếm / Chọn cột --</option>
                      {playersHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Tuổi */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Cột Số Tháng Tuổi / Độ Tuổi (Tùy chọn)</label>
                    <select 
                      value={mapping.playerAge}
                      onChange={(e) => setMapping(prev => ({ ...prev, playerAge: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- Chọn cột (Bỏ qua nếu không có) --</option>
                      {playersHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Bảng đấu */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Cột Bảng Đấu (Tùy chọn)</label>
                    <select 
                      value={mapping.playerGroup}
                      onChange={(e) => setMapping(prev => ({ ...prev, playerGroup: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- Chọn cột (Bỏ qua nếu không có) --</option>
                      {playersHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Địa chỉ liên hệ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Cột Địa Chỉ Liên Hệ (Tùy chọn)</label>
                    <select 
                      value={mapping.playerAddress || ''}
                      onChange={(e) => setMapping(prev => ({ ...prev, playerAddress: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- Tự động tìm kiếm / Chọn cột --</option>
                      {playersHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Ghi chú / Kỹ năng */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Cột Kỹ Năng / Ghi Chú (Tùy chọn)</label>
                    <select 
                      value={mapping.playerSkill || ''}
                      onChange={(e) => setMapping(prev => ({ ...prev, playerSkill: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- Tự động tìm kiếm / Chọn cột --</option>
                      {playersHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* ID VĐV nếu là 2-sheets */}
                  {mode === AppMode.TWO_SHEETS_LINKED && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Cột Mã Định Danh Bé (Tùy chọn)</label>
                      <select 
                        value={mapping.playerId}
                        onChange={(e) => setMapping(prev => ({ ...prev, playerId: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none"
                      >
                        <option value="">-- Chọn cột (Mặc định sẽ liên kết qua Tên) --</option>
                        {playersHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Match fields (only show if not single player lists) */}
              {mode !== AppMode.SINGLE_SHEET_PLAYERS && (
                <div>
                  <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3 border-l-2 border-indigo-600 pl-2">
                    {mode === AppMode.TWO_SHEETS_LINKED ? 'Thông tin trận đấu (Tab Lịch Thi Đấu)' : 'Thông tin trận đấu'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* VĐV 1 */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Cột Họ Tên VĐV 1 / Đội 1</label>
                      <select 
                        value={mapping.matchPlayer1Name}
                        onChange={(e) => setMapping(prev => ({ ...prev, matchPlayer1Name: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Chọn cột --</option>
                        {matchesHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* SĐT VĐV 1 nếu không phải là 2-sheet */}
                    {mode === AppMode.SINGLE_SHEET_MATCHES && (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Cột SĐT VĐV 1 (Tùy chọn)</label>
                        <select 
                          value={mapping.matchPlayer1Phone}
                          onChange={(e) => setMapping(prev => ({ ...prev, matchPlayer1Phone: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Chọn cột --</option>
                          {matchesHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    )}

                    {/* VĐV 2 */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Cột Họ Tên VĐV 2 / Đội 2</label>
                      <select 
                        value={mapping.matchPlayer2Name}
                        onChange={(e) => setMapping(prev => ({ ...prev, matchPlayer2Name: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Chọn cột --</option>
                        {matchesHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* SĐT VĐV 2 nếu không phải là 2-sheet */}
                    {mode === AppMode.SINGLE_SHEET_MATCHES && (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Cột SĐT VĐV 2 (Tùy chọn)</label>
                        <select 
                          value={mapping.matchPlayer2Phone}
                          onChange={(e) => setMapping(prev => ({ ...prev, matchPlayer2Phone: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Chọn cột --</option>
                          {matchesHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Lượt/Vòng đấu */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Cột Lượt đấu / Vòng đấu</label>
                      <select 
                        value={mapping.matchRound}
                        onChange={(e) => setMapping(prev => ({ ...prev, matchRound: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Chọn cột (Ví dụ: Vòng Bảng, Bán kết) --</option>
                        {matchesHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Giờ đấu */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Cột Giờ thi đấu</label>
                      <select 
                        value={mapping.matchTime}
                        onChange={(e) => setMapping(prev => ({ ...prev, matchTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Chọn cột --</option>
                        {matchesHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Sân đấu */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Cột Sân thi đấu / Địa điểm</label>
                      <select 
                        value={mapping.matchCourt}
                        onChange={(e) => setMapping(prev => ({ ...prev, matchCourt: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Chọn cột --</option>
                        {matchesHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Kết quả tỉ số */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Cột Tỉ số / Kết quả (Tùy chọn)</label>
                      <select 
                        value={mapping.matchResult}
                        onChange={(e) => setMapping(prev => ({ ...prev, matchResult: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Chọn cột --</option>
                        {matchesHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Trạng thái trận đấu */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Cột Trạng thái (Ví dụ: Chưa đấu, Đang diễn ra, Đã xong)</label>
                      <select 
                        value={mapping.matchStatus}
                        onChange={(e) => setMapping(prev => ({ ...prev, matchStatus: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Chọn cột --</option>
                        {matchesHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between border-t border-gray-100 pt-6">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-1 transition-all"
              >
                Quay lại
              </button>
              <button
                onClick={handleSaveAndGenerate}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl flex items-center gap-1 shadow-md transition-all"
              >
                Hoàn tất & Tạo liên kết
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step 3: Success & Get Link */}
      {step === 3 && (
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center max-w-2xl mx-auto space-y-6"
        >
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-800">Cấu hình giải đấu thành công!</h2>
            <p className="text-slate-500 text-sm px-4">
              Website tra cứu trực tuyến dành riêng cho giải đấu <b>{tournamentName}</b> đã sẵn sàng. Hãy sao chép liên kết bên dưới để gửi cho vận động viên và cổ động viên!
            </p>
          </div>

          {/* Link box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-2">
            <div className="text-2xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5" />
              Đường dẫn chia sẻ tra cứu
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly
                value={shareableUrl}
                className="w-full bg-white px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs font-mono focus:outline-none"
              />
              <button
                onClick={copyToClipboard}
                className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all duration-200 ${
                  isCopied ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Đã chép
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Sao chép
                  </>
                )}
              </button>
            </div>
          </div>

          {/* QR info */}
          <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 flex items-center gap-4 text-left">
            <div className="w-20 h-20 bg-white border border-slate-200 rounded-lg flex items-center justify-center shrink-0 shadow-sm p-1">
              {/* Direct dynamic QR code using a free api */}
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareableUrl)}`} 
                alt="QR Code" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Quét mã QR Code tra cứu</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tải ảnh hoặc in mã QR này dán tại bảng tin giải đấu hoặc in lên thẻ đeo vận động viên để mọi người quét mã tra cứu lịch thi đấu nhanh chóng.
              </p>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all"
            >
              Chỉnh sửa cấu hình
            </button>
            <button
              onClick={() => {
                // Refresh window to load this shareable URL
                window.location.href = shareableUrl;
              }}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <Eye className="w-4 h-4" />
              Xem trang tra cứu ngay
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
