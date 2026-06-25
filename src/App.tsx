import React, { useState, useEffect } from 'react';
import { 
  AppMode, 
  SpreadsheetConfig, 
  PlayerInfo, 
  MatchInfo 
} from './types';
import { 
  fetchSheetCsv, 
  processSingleSheetMatches, 
  processSingleSheetPlayers, 
  processTwoSheetsLinked,
  searchPlayerAndMatches
} from './utils/sheetParser';
import { 
  DEMO_CONFIG, 
  DEMO_PLAYERS, 
  DEMO_MATCHES 
} from './data/demoTournament';
import { fetchTournamentConfigFromDb } from './lib/supabase';
import { fetchConfigFromZeroDb, saveConfigToZeroDb } from './lib/kvStorage';
import AdminPanel from './components/AdminPanel';
import LookupForm from './components/LookupForm';
import MatchSchedule from './components/MatchSchedule';
import TournamentDashboard from './components/TournamentDashboard';
import { 
  Trophy, 
  FileSpreadsheet, 
  Settings, 
  RefreshCw, 
  Sparkles, 
  Share2, 
  AlertCircle, 
  Info,
  Calendar,
  Search,
  BookOpen,
  ArrowRight,
  Database,
  Crown,
  Medal,
  Award,
  Shield,
  Target,
  Flame,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [config, setConfig] = useState<SpreadsheetConfig | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const renderHeaderIcon = () => {
    const icon = config?.tournamentIcon;
    if (!icon) {
      return <Trophy className="w-5 h-5" />;
    }

    if (icon.startsWith('http://') || icon.startsWith('https://')) {
      return (
        <img 
          src={icon} 
          alt="Tournament Icon" 
          referrerPolicy="no-referrer"
          className="w-7 h-7 object-contain rounded-lg"
        />
      );
    }

    const lowerIcon = icon.toLowerCase().trim();
    if (lowerIcon === 'trophy') return <Trophy className="w-5 h-5" />;
    if (lowerIcon === 'crown') return <Crown className="w-5 h-5" />;
    if (lowerIcon === 'medal') return <Medal className="w-5 h-5" />;
    if (lowerIcon === 'award') return <Award className="w-5 h-5" />;
    if (lowerIcon === 'shield') return <Shield className="w-5 h-5" />;
    if (lowerIcon === 'target') return <Target className="w-5 h-5" />;
    if (lowerIcon === 'flame') return <Flame className="w-5 h-5" />;
    if (lowerIcon === 'star') return <Star className="w-5 h-5" />;
    if (lowerIcon === 'sparkles') return <Sparkles className="w-5 h-5" />;

    return <span className="text-base font-black select-none leading-none">{icon}</span>;
  };

  // View state
  const [isAdminView, setIsAdminView] = useState(false);
  const [activeTab, setActiveTab] = useState<'lookup' | 'dashboard'>('lookup');
  const [selectedResults, setSelectedResults] = useState<{ player: PlayerInfo; matches: MatchInfo[] }[]>([]);

  // Admin authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem('is_admin_authenticated') === 'true';
  });
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Initialize: decode URL parameters, load from databases, or load default config
  useEffect(() => {
    const initializeApp = async () => {
      const params = new URLSearchParams(window.location.search);
      const encodedConfig = params.get('t');

      // 1. Check URL parameters first (explicit sharing/override)
      if (encodedConfig) {
        try {
          const decodedStr = decodeURIComponent(atob(encodedConfig));
          const parsedConfig: SpreadsheetConfig = JSON.parse(decodedStr);
          if (parsedConfig && parsedConfig.spreadsheetId) {
            setConfig(parsedConfig);
            setIsDemo(false);
            // Persist in localStorage as fallback
            localStorage.setItem('saved_tournament_config', decodedStr);
            loadTournamentData(parsedConfig);
            return;
          }
        } catch (e) {
          console.error("Failed to decode tournament configuration from URL parameter.", e);
        }
      }

      // 2. Try fetching from Zero-Setup Cloud Database (completely automatic and serverless)
      try {
        const zeroDbConfig = await fetchConfigFromZeroDb();
        if (zeroDbConfig && zeroDbConfig.spreadsheetId) {
          setConfig(zeroDbConfig);
          setIsDemo(false);
          // Sync to localStorage
          localStorage.setItem('saved_tournament_config', JSON.stringify(zeroDbConfig));
          loadTournamentData(zeroDbConfig);
          return;
        }
      } catch (zeroDbErr) {
        console.error("Failed to load tournament configuration from Zero-Setup Cloud DB.", zeroDbErr);
      }

      // 3. Try fetching from Supabase Database (if manual credentials are set up)
      try {
        const dbConfig = await fetchTournamentConfigFromDb();
        if (dbConfig && dbConfig.spreadsheetId) {
          setConfig(dbConfig);
          setIsDemo(false);
          // Sync to localStorage
          localStorage.setItem('saved_tournament_config', JSON.stringify(dbConfig));
          loadTournamentData(dbConfig);
          return;
        }
      } catch (dbError) {
        console.error("Failed to load tournament configuration from Supabase.", dbError);
      }

      // 4. Check localStorage fallback if no database config
      const savedConfigStr = localStorage.getItem('saved_tournament_config');
      if (savedConfigStr) {
        try {
          const parsedConfig: SpreadsheetConfig = JSON.parse(savedConfigStr);
          if (parsedConfig && parsedConfig.spreadsheetId) {
            setConfig(parsedConfig);
            setIsDemo(false);
            loadTournamentData(parsedConfig);
            return;
          }
        } catch (e) {
          console.error("Failed to load tournament configuration from localStorage.", e);
        }
      }

      // 5. Fallback/Default: Load from DEMO_CONFIG (now configured with the real Google Sheet ID)
      try {
        setConfig(DEMO_CONFIG);
        setIsDemo(false);
        // Sync to localStorage
        localStorage.setItem('saved_tournament_config', JSON.stringify(DEMO_CONFIG));
        await loadTournamentData(DEMO_CONFIG);
        
        // Also auto-save this configuration to the global Zero-Setup Cloud DB if we initialized from default
        // so that anyone else visiting sees the exact updated tournament
        try {
          await saveConfigToZeroDb(DEMO_CONFIG);
        } catch (e) {
          console.error("Auto save default to zero DB failed", e);
        }
        return;
      } catch (err) {
        console.error("Failed to load real data for default config, falling back to static demo data", err);
        setConfig(DEMO_CONFIG);
        setIsDemo(true);
        setPlayers(DEMO_PLAYERS);
        setMatches(DEMO_MATCHES);
      }
    };

    initializeApp();
  }, []);

  // Sync document title with tournament name
  useEffect(() => {
    if (config?.tournamentName) {
      document.title = config.tournamentName;
    } else {
      document.title = "THE GOOOAL CUP BY GOLDGI";
    }
  }, [config?.tournamentName]);

  // Fetch or reload tournament rows
  const loadTournamentData = async (cfg: SpreadsheetConfig) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      if (cfg.spreadsheetId === 'demo_sheet_id') {
        setPlayers(DEMO_PLAYERS);
        setMatches(DEMO_MATCHES);
        setIsDemo(true);
        return;
      }

      setIsDemo(false);
      
      let pList: PlayerInfo[] = [];
      let mList: MatchInfo[] = [];

      if (cfg.mode === AppMode.TWO_SHEETS_LINKED) {
        const playersRows = await fetchSheetCsv(cfg.spreadsheetId, cfg.playersTabName);
        const matchesRows = await fetchSheetCsv(cfg.spreadsheetId, cfg.matchesTabName);
        const result = processTwoSheetsLinked(playersRows, matchesRows, cfg.mapping);
        pList = result.players;
        mList = result.matches;
      } else if (cfg.mode === AppMode.SINGLE_SHEET_PLAYERS) {
        const rows = await fetchSheetCsv(cfg.spreadsheetId, cfg.playersTabName);
        const result = processSingleSheetPlayers(rows, cfg.mapping);
        pList = result.players;
        mList = result.matches;
      } else {
        // SINGLE_SHEET_MATCHES
        const rows = await fetchSheetCsv(cfg.spreadsheetId, cfg.playersTabName);
        const result = processSingleSheetMatches(rows, cfg.mapping);
        pList = result.players;
        mList = result.matches;
      }

      setPlayers(pList);
      setMatches(mList);
    } catch (err: any) {
      console.error(err);
      setFetchError(
        err.message || 
        'Không thể lấy dữ liệu từ Google Sheets. Hãy kiểm tra xem file đã được phân quyền công khai chưa.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async (newConfig: SpreadsheetConfig) => {
    setConfig(newConfig);
    // Save to localStorage so it stays persisted
    localStorage.setItem('saved_tournament_config', JSON.stringify(newConfig));
    
    // Auto sync to cloud database
    try {
      await saveConfigToZeroDb(newConfig);
    } catch (e) {
      console.error("Auto save to zero DB failed", e);
    }

    setIsAdminView(false);
    loadTournamentData(newConfig);
  };

  const handleRefreshData = () => {
    if (config) {
      loadTournamentData(config);
    }
  };

  const handleSelectPlayerFromList = (player: PlayerInfo) => {
    const results = searchPlayerAndMatches(player.phone, players, matches);
    if (results.length > 0) {
      setSelectedResults(results);
      setActiveTab('lookup');
    }
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expectedPassword = config?.adminPassword || 'goooalcup2026';
    if (enteredPassword.trim() === expectedPassword.trim()) {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('is_admin_authenticated', 'true');
      setPasswordError(null);
      setEnteredPassword('');
    } else {
      setPasswordError('Mật khẩu không chính xác. Vui lòng thử lại!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-amber-500/10 selection:text-amber-600">
      
      {/* Top Warning Banner for Demo Mode */}
      {isDemo && !isAdminView && (
        <div className="bg-linear-to-r from-amber-500 to-orange-500 text-white text-xs py-2 px-4 font-semibold text-center flex items-center justify-center gap-2 shadow-xs z-10">
          <Sparkles className="w-4 h-4 animate-bounce" />
          <span>Bạn đang xem Giải đấu mẫu. Để kết nối Google Sheets của riêng bạn:</span>
          <button 
            onClick={() => setIsAdminView(true)}
            className="bg-white text-amber-600 px-2.5 py-0.5 rounded-full text-2xs font-extrabold hover:bg-amber-50 transition-all cursor-pointer flex items-center gap-0.5"
          >
            Cài đặt ngay <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Header Nav */}
      <header className="bg-white border-b border-slate-100 shadow-xs sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-linear-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-md text-white overflow-hidden">
              {renderHeaderIcon()}
            </div>
            <div>
              <span className="font-black text-slate-800 text-sm tracking-tight block">
                {config?.tournamentName || "THE GOOOAL CUP BY GOLDGI"}
              </span>
              <span className="text-3xs font-extrabold text-emerald-600 uppercase tracking-wider block">
                {config?.organizerName ? `${config.organizerName} • Tra cứu` : "Tra cứu"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAdminView && config && config.spreadsheetId !== 'demo_sheet_id' && (
              <button
                onClick={handleRefreshData}
                disabled={isLoading}
                title="Đồng bộ lại"
                className="p-2 text-slate-500 hover:text-amber-600 hover:bg-slate-50 rounded-lg border border-slate-150 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            <button
              onClick={() => setIsAdminView(!isAdminView)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer shadow-2xs ${
                isAdminView 
                  ? 'bg-slate-100 text-slate-600 border-slate-200' 
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-100/80'
              }`}
            >
              <Settings className="w-4 h-4" />
              {isAdminView ? 'Xem tra cứu' : 'Ban Tổ Chức'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 pb-20">
        <AnimatePresence mode="wait">
          {isAdminView ? (
            <motion.div
              key={isAdminAuthenticated ? "admin" : "admin-login"}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {!isAdminAuthenticated ? (
                <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl border border-slate-150 p-6 md:p-8 space-y-6 text-center">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm animate-bounce-slow">
                    <Settings className="w-8 h-8 text-amber-600" />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-xl font-extrabold text-slate-800">Xác thực Ban tổ chức</h2>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Vui lòng nhập mật khẩu quản trị để truy cập cấu hình hệ thống kết nối Google Sheets và sơ đồ giải đấu.
                    </p>
                  </div>

                  <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                    <div className="relative">
                      <input 
                        type="password"
                        placeholder="Nhập mật khẩu..."
                        value={enteredPassword}
                        onChange={(e) => {
                          setEnteredPassword(e.target.value);
                          setPasswordError(null);
                        }}
                        autoFocus
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 rounded-xl text-center text-sm font-bold text-slate-800 tracking-widest"
                      />
                    </div>

                    {passwordError && (
                      <p className="text-xs font-bold text-rose-600 bg-rose-50 py-2 px-3 rounded-lg border border-rose-100 animate-pulse">
                        {passwordError}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setIsAdminView(false)}
                        className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/10 hover:shadow-lg hover:shadow-amber-500/20 cursor-pointer"
                      >
                        Xác nhận
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <AdminPanel 
                  currentConfig={isDemo ? null : config}
                  onSaveConfig={handleSaveConfig}
                  onBackToLookup={() => setIsAdminView(false)}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="lookup-dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Tournament Banner */}
              <div 
                className="w-full rounded-2xl overflow-hidden shadow-xs border border-slate-150 bg-slate-100 relative"
                style={{ aspectRatio: '1956 / 1168' }}
              >
                {config?.bannerUrl ? (
                  <img 
                    src={config.bannerUrl} 
                    alt={config.tournamentName || "Tournament Banner"} 
                    className="w-full h-full object-cover block"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-6 md:p-8 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute left-1/3 bottom-0 translate-y-12 w-32 h-32 bg-amber-400/20 rounded-full blur-xl animate-pulse"></div>
                    
                    <div className="flex items-center gap-2 text-amber-100 text-3xs font-black tracking-wider uppercase bg-white/15 px-2.5 py-1 rounded-full w-fit backdrop-blur-xs">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" /> {config?.organizerName || "BAN TỔ CHỨC"}
                    </div>
                    
                    <div className="mt-auto">
                      <h1 className="text-lg md:text-3xl font-black tracking-tight leading-tight uppercase drop-shadow-xs line-clamp-2">
                        {config?.tournamentName || "GIẢI ĐẤU TOÀN QUỐC 2026"}
                      </h1>
                      <p className="text-2xs md:text-sm text-amber-50/90 font-bold mt-2 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-amber-300" /> Chào mừng các Vận Động Viên Nhí & Phụ Huynh!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Tabs */}
              <div className="flex bg-slate-200/60 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('lookup')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'lookup' 
                      ? 'bg-white text-amber-700 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  Tra Cứu Cá Nhân
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'dashboard' 
                      ? 'bg-white text-amber-700 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Toàn Cảnh Giải Đấu
                </button>
              </div>

              {/* Loader */}
              {isLoading && (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-150 shadow-xs space-y-3">
                  <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-slate-500 text-sm font-semibold">Đang cập nhật bảng lịch thi đấu mới nhất...</p>
                </div>
              )}

              {/* Error State */}
              {!isLoading && fetchError && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-slate-700 space-y-4">
                  <div className="flex gap-3 items-start">
                    <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-red-800 text-base">Không thể đồng bộ dữ liệu</h3>
                      <p className="text-sm mt-1">{fetchError}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-xs space-y-1.5 text-slate-600 border border-red-50">
                    <span className="font-bold block text-red-700">Cách khắc phục dành cho Ban Tổ Chức:</span>
                    <ul className="list-disc list-inside space-y-1 text-2xs">
                      <li>Đảm bảo đã chia sẻ Google Sheet ở chế độ <b>"Bất kỳ ai có liên kết đều có thể xem"</b>.</li>
                      <li>Kiểm tra xem tên tab/trang tính đã khớp chính xác với cấu hình hay chưa.</li>
                      <li>Kiểm tra lại cột ghép xem có thay đổi tiêu đề trong Google Sheet không.</li>
                    </ul>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setIsAdminView(true)}
                      className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      Kiểm tra cấu hình
                    </button>
                  </div>
                </div>
              )}

              {/* Main Content Area */}
              {!isLoading && !fetchError && (
                <div>
                  {activeTab === 'lookup' ? (
                    <div className="space-y-6">
                      <LookupForm 
                        players={players}
                        matches={matches}
                        tournamentName={config?.tournamentName || 'Giải đấu chưa đặt tên'}
                        organizerName={config?.organizerName}
                        selectedResults={selectedResults}
                        onSelectResults={setSelectedResults}
                      />

                      {/* Display results */}
                      <AnimatePresence mode="wait">
                        {selectedResults && selectedResults.length > 0 && (
                          <motion.div
                            key={selectedResults.map(r => r.player.id).join(',')}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-8"
                          >
                            {selectedResults.map((result, rIdx) => (
                              <div key={result.player.id} className="relative pt-2">
                                {selectedResults.length > 1 && (
                                  <div className="absolute top-0 left-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-3xs font-extrabold px-3 py-1 rounded-full shadow-md z-10 uppercase tracking-wider">
                                    Bé {rIdx + 1}: {result.player.name}
                                  </div>
                                )}
                                <MatchSchedule 
                                  player={result.player}
                                  matches={result.matches}
                                />
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <TournamentDashboard 
                      players={players}
                      matches={matches}
                      onSelectPlayer={handleSelectPlayerFromList}
                      config={config}
                    />
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-3xs text-slate-400 mt-auto">
        <div className="max-w-4xl mx-auto px-4 space-y-1">
          {config?.footerText ? (
            <p className="text-2xs font-medium text-slate-500">{config.footerText}</p>
          ) : (
            <>
              <p>© 2026 SportLookup. Dữ liệu thời gian thực được đồng bộ trực tiếp qua Google Sheets API.</p>
              <p>Thiết kế dành riêng cho các giải đấu thể thao phong trào (Tennis, Pickleball, Cầu lông, Bóng đá, Bóng bàn).</p>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
