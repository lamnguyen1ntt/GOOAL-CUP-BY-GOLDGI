import React, { useState, useEffect, useRef } from 'react';
import { PlayerInfo, MatchInfo } from '../types';
import { searchPlayerAndMatches, normalizePhone } from '../utils/sheetParser';
import { 
  Search, 
  Phone, 
  User, 
  CheckCircle2, 
  Trophy, 
  MapPin, 
  Calendar, 
  Clock, 
  X, 
  UserCheck, 
  Bookmark,
  Sparkles,
  SearchCheck,
  ChevronRight,
  Info,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LookupFormProps {
  players: PlayerInfo[];
  matches: MatchInfo[];
  tournamentName: string;
  organizerName?: string;
  onSelectResult: (result: { player: PlayerInfo; matches: MatchInfo[] } | null) => void;
  selectedResult: { player: PlayerInfo; matches: MatchInfo[] } | null;
}

export default function LookupForm({
  players,
  matches,
  tournamentName,
  organizerName,
  onSelectResult,
  selectedResult
}: LookupFormProps) {
  const [query, setQuery] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [suggestions, setSuggestions] = useState<{ player: PlayerInfo; matches: MatchInfo[] }[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const maskPhone = (phone: string) => {
    if (!phone) return '';
    const clean = phone.trim();
    if (clean.length <= 3) return clean;
    return '*******' + clean.slice(-3);
  };

  const getParentName = (player: PlayerInfo) => {
    const keys = ['Họ và tên ba/ mẹ', 'Họ và tên ba mẹ', 'Tên bố mẹ', 'Tên phụ huynh', 'Ba mẹ', 'Bố mẹ', 'Phụ huynh'];
    for (const k of keys) {
      if (player.customData[k]) return player.customData[k];
      const foundKey = Object.keys(player.customData).find(ck => 
        k.toLowerCase().trim() === ck.toLowerCase().trim() || 
        ck.toLowerCase().includes(k.toLowerCase())
      );
      if (foundKey) return player.customData[foundKey];
    }
    return '';
  };

  // Load remembered phone/name on mount
  useEffect(() => {
    const savedQuery = localStorage.getItem('tournament_lookup_query');
    if (savedQuery) {
      setQuery(savedQuery);
      // Automatically trigger search if there are matches
      const results = searchPlayerAndMatches(savedQuery, players, matches);
      if (results.length === 1) {
        onSelectResult(results[0]);
      }
    }
  }, [players, matches]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update suggestions as user types
  const handleInputChange = (val: string) => {
    setQuery(val);
    if (val.trim().length >= 2) {
      const results = searchPlayerAndMatches(val, players, matches);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const results = searchPlayerAndMatches(query, players, matches);
    if (results.length > 0) {
      onSelectResult(results[0]); // Select first match
      setIsFocused(false);
      if (rememberMe) {
        localStorage.setItem('tournament_lookup_query', query);
      } else {
        localStorage.removeItem('tournament_lookup_query');
      }
    } else {
      alert('Không tìm thấy thông tin vận động viên khớp với từ khóa tìm kiếm.');
    }
  };

  const handleSelectSuggestion = (res: { player: PlayerInfo; matches: MatchInfo[] }) => {
    setQuery(res.player.phone); // Or name
    onSelectResult(res);
    setIsFocused(false);
    if (rememberMe) {
      localStorage.setItem('tournament_lookup_query', res.player.phone);
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setSuggestions([]);
    onSelectResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Banner / Intro */}
      <div className="text-center py-6 md:py-8 px-4 rounded-3xl bg-linear-to-br from-emerald-800 to-slate-900 text-white shadow-xl relative overflow-hidden">
        {/* Abstract background circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-600/15 rounded-full blur-3xl" />

        <div className="relative space-y-3 max-w-xl mx-auto">
          {organizerName && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 text-2xs font-extrabold uppercase tracking-widest rounded-full border border-amber-500/20">
              <Trophy className="w-3 h-3 text-amber-400" />
              {organizerName}
            </div>
          )}
          <h1 id="tournament-title" className="text-2xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-100 to-amber-300 drop-shadow-sm">
            {tournamentName}
          </h1>
          <p className="text-emerald-100/90 text-xs md:text-sm font-medium">
            Tra cứu thông tin cá nhân, Số báo danh (SBD), Lượt đấu, Giờ Check-in và Giờ thi đấu chính thức dành cho các bé.
          </p>
        </div>
      </div>

      {/* Lookup Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-150 p-5 md:p-6 space-y-4">
        <form onSubmit={handleSearchSubmit} className="relative" ref={searchContainerRef}>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex justify-between">
            <span>Tra cứu thông tin bé</span>
          </label>
          
          <div className="relative flex items-center">
            <div className="absolute left-4 text-slate-400">
              <Search className="w-5 h-5 text-emerald-600" />
            </div>
            
            <input
              type="text"
              placeholder="Nhập Số Điện Thoại của Ba Mẹ hoặc Họ Tên Bé..."
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              className="w-full pl-12 pr-10 py-3.5 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:bg-white rounded-xl text-slate-800 text-sm md:text-base font-bold shadow-inner transition-all duration-200"
            />

            {query && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Autocomplete suggestions dropdown */}
          <AnimatePresence>
            {isFocused && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100"
              >
                {suggestions.map((res) => {
                  const parentName = getParentName(res.player);
                  return (
                    <div
                      key={res.player.id}
                      onClick={() => handleSelectSuggestion(res)}
                      className="p-3.5 hover:bg-amber-50/50 cursor-pointer flex justify-between items-center transition-all duration-150"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-black text-xs uppercase shadow-xs">
                          {res.player.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 text-sm block">Bé: {res.player.name}</span>
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            {parentName && (
                              <span className="flex items-center gap-1 text-2xs text-slate-600 font-semibold">
                                <Users className="w-3 h-3 text-slate-400" />
                                Ba/Mẹ: {parentName}
                              </span>
                            )}
                            <div className="flex items-center gap-2 text-2xs text-slate-500">
                              <span className="flex items-center gap-0.5 font-semibold text-slate-600">
                                <Phone className="w-2.5 h-2.5 text-slate-400" />
                                SĐT: {maskPhone(res.player.phone)}
                              </span>
                              {res.player.group && (
                                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-extrabold uppercase">
                                  Bảng: {res.player.group}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
                        <span>{res.matches.length} lượt thi</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Options */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
          <label className="flex items-center gap-2 text-slate-500 font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 accent-emerald-600"
            />
            Ghi nhớ trên thiết bị này
          </label>
          <div className="flex items-center gap-1 text-slate-400">
            <Bookmark className="w-3.5 h-3.5" />
            <span>Tự động tải lịch đấu lần sau</span>
          </div>
        </div>
      </div>

      {/* No query tip */}
      {!query && !selectedResult && (
        <div className="bg-amber-50/40 rounded-2xl p-4 border border-amber-100/50 flex gap-3 text-slate-600 text-xs md:text-sm">
          <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p>
            <b>Hướng dẫn dành cho Ba Mẹ:</b> Hãy nhập chính xác <b>Số điện thoại</b> đã đăng ký tham gia chương trình. Hệ thống sẽ ngay lập tức kết xuất Họ tên Bé, Số báo danh (SBD), Giờ check-in và chi tiết Lượt thi đấu của con.
          </p>
        </div>
      )}
    </div>
  );
}
