import React from 'react';
import { PlayerInfo, MatchInfo } from '../types';
import { 
  User, 
  Phone, 
  Calendar, 
  MapPin, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  Award, 
  Hash, 
  CalendarCheck,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  Sparkles,
  Zap,
  CheckCircle2,
  XCircle,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';

interface MatchScheduleProps {
  player: PlayerInfo;
  matches: MatchInfo[];
}

export default function MatchSchedule({ player, matches }: MatchScheduleProps) {
  
  const maskPhone = (phone: string) => {
    if (!phone) return '';
    const clean = phone.trim();
    if (clean.length <= 3) return clean;
    return '*******' + clean.slice(-3);
  };

  const getCheckInTime = (m: MatchInfo) => {
    const keys = ['Giờ check in', 'Giờ check-in', 'Check in', 'Check-in', 'Giờ điểm danh', 'Điểm danh', 'Checkin'];
    for (const k of keys) {
      if (m.customData[k]) return m.customData[k];
      const foundKey = Object.keys(m.customData).find(ck => 
        k.toLowerCase().trim() === ck.toLowerCase().trim() || 
        ck.toLowerCase().includes(k.toLowerCase())
      );
      if (foundKey) return m.customData[foundKey];
    }
    return '';
  };
  // Group matches by status or rounds if needed, but standard sequential chronological order is best
  const sortedMatches = [...matches].sort((a, b) => {
    const timeA = a.time || '';
    const timeB = b.time || '';
    return timeA.localeCompare(timeB);
  });

  const getStatusBadgeClass = (status?: string) => {
    if (!status) return 'bg-slate-100 text-slate-600 border border-slate-200';
    const s = status.toLowerCase();
    if (s.includes('đang') || s.includes('live') || s.includes('trực tiếp')) {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse font-bold flex items-center gap-1';
    }
    if (s.includes('đã xong') || s.includes('hoàn thành') || s.includes('xong') || s.includes('kết thúc')) {
      return 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold';
    }
    if (s.includes('hủy') || s.includes('hoãn')) {
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    }
    return 'bg-amber-50 text-amber-700 border border-amber-200';
  };

  const getResultBadgeClass = (result?: string, isWinner?: boolean) => {
    if (!result) return '';
    return isWinner 
      ? 'bg-emerald-500 text-white font-bold px-2.5 py-1 rounded-lg text-xs md:text-sm' 
      : 'bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs md:text-sm';
  };

  // Determine if this player won (highly custom, but we can do a smart guess if result contains "thắng" or similar or scores)
  const isMatchWinner = (match: MatchInfo, playerName: string) => {
    if (!match.result) return false;
    const resLower = match.result.toLowerCase();
    
    // Pattern 1: Explicitly mentions player name + thắng
    if (resLower.includes(playerName.toLowerCase()) && (resLower.includes('thắng') || resLower.includes('win'))) {
      return true;
    }
    
    // Pattern 2: Result has scores and player 1 or 2 is us
    // (e.g. P1 name matches us, score says 1st value is greater)
    return false; // Fallback to neutral rendering if we can't reliably guess
  };

  const getCustomValue = (keys: string[]) => {
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

  const sbd = getCustomValue(['SBD', 'Số báo danh', 'Mã số', 'Mã số của bé']) || '';
  const parentName = getCustomValue(['Họ và tên ba/ mẹ', 'Họ và tên ba mẹ', 'Tên bố mẹ', 'Tên phụ huynh', 'Ba mẹ', 'Bố mẹ', 'Phụ huynh']) || '';
  const address = getCustomValue(['Địa chỉ hiện tại của bé', 'Địa chỉ', 'Địa chỉ hiện tại', 'Nơi ở']) || '';
  const skill = getCustomValue(['Kỹ năng hiện tại của bé', 'Kỹ năng', 'Kỹ năng của bé', 'Nếu bé trong độ tuổi']) || '';

  // Filter out extracted keys from dynamic customData mapping to prevent duplication
  const displayedCustomData = Object.entries(player.customData).filter(([key]) => {
    const kLower = key.toLowerCase();
    return !['sbd', 'số báo danh', 'mã số', 'họ và tên ba/ mẹ', 'họ và tên ba mẹ', 'tên bố mẹ', 'tên phụ huynh', 'ba mẹ', 'bố mẹ', 'phụ huynh', 'địa chỉ hiện tại của bé', 'địa chỉ', 'địa chỉ hiện tại', 'nơi ở', 'kỹ năng hiện tại của bé', 'kỹ năng', 'kỹ năng của bé', 'lượt thi đấu', 'lượt đấu', 'ngày', 'giờ đấu', 'giờ check in', 'bảng đấu'].some(extracted => kLower.includes(extracted));
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Player/Baby Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-150 p-6 relative overflow-hidden">
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-0" />
        <div className="absolute top-4 right-4 z-10 text-amber-500/30">
          <Award className="w-12 h-12 stroke-[1.5]" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row gap-5 items-start">
          {/* Avatar / Icon */}
          <div className="w-16 h-16 bg-amber-500 text-white rounded-2xl flex items-center justify-center font-extrabold text-2xl uppercase shadow-md shrink-0">
            {player.name.charAt(0)}
          </div>

          <div className="space-y-3 flex-1 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                Vận Động Viên Nhí
              </span>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight block w-full md:w-auto">
                {player.name}
              </h2>
              {sbd && (
                <span className="px-2.5 py-1 bg-indigo-600 text-white text-xs font-black rounded-lg shadow-sm">
                  SBD: {sbd}
                </span>
              )}
              {player.group && (
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase rounded-lg border border-emerald-100 shadow-2xs">
                  Bảng: {player.group}
                </span>
              )}
            </div>

            {/* Structured Baby & Parent Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              {parentName && (
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-3xs font-bold text-slate-400 uppercase">Họ & Tên Ba/Mẹ</span>
                    <span className="text-sm font-bold text-slate-700">{parentName}</span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-3xs font-bold text-slate-400 uppercase">Số Điện Thoại Tra Cứu</span>
                  <span className="text-sm font-semibold text-slate-700 font-mono">{maskPhone(player.phone)}</span>
                </div>
              </div>

              {player.age && (
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-3xs font-bold text-slate-400 uppercase">Độ Tuổi / Số Tháng Tuổi</span>
                    <span className="text-sm font-bold text-slate-700">{player.age}</span>
                  </div>
                </div>
              )}

              {skill && (
                <div className="flex items-start gap-2 md:col-span-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-3xs font-bold text-slate-400 uppercase">Kỹ Năng / Ghi Chú</span>
                    <span className="text-xs font-medium text-slate-600 italic">{skill}</span>
                  </div>
                </div>
              )}

              {address && (
                <div className="flex items-start gap-2 md:col-span-2 border-t border-slate-100 pt-2 mt-1">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-3xs font-bold text-slate-400 uppercase">Địa Chỉ Liên Hệ</span>
                    <span className="text-xs font-semibold text-slate-600">{address}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Custom fields in player record (if any other unspecified) */}
        {displayedCustomData.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-3 gap-3">
            {displayedCustomData.map(([key, val]) => (
              <div key={key} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="block text-3xs font-semibold text-slate-400 uppercase tracking-wider">{key}</span>
                <span className="block text-xs font-bold text-slate-700 mt-0.5">{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Match Schedule List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            <Zap className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />
            Lịch Thi Đấu & Check-in Chi Tiết
          </h3>
          <span className="text-xs font-bold text-slate-500 uppercase bg-slate-100 px-2 py-1 rounded-md">
            {sortedMatches.length} Lượt Đấu
          </span>
        </div>

        {sortedMatches.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold">Chưa tìm thấy lịch thi đấu khớp</p>
            <p className="text-2xs">Lịch đấu có thể chưa được ban tổ chức công bố hoặc cập nhật vào bảng tính.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-indigo-100 pl-4 ml-3 space-y-6">
            {sortedMatches.map((match, idx) => {
              const checkInTime = getCheckInTime(match);
              
              // Define state colors
              const isLive = match.status?.toLowerCase().includes('đang') || match.status?.toLowerCase().includes('live');
              const isDone = match.status?.toLowerCase().includes('xong') || match.status?.toLowerCase().includes('đã') || match.status?.toLowerCase().includes('kết');

              return (
                <div key={match.id} className="relative group">
                  {/* Timeline bullet dot */}
                  <div className={`absolute -left-[25px] top-4 w-4 h-4 rounded-full border-2 bg-white transition-all duration-300 ${
                    isLive ? 'border-amber-500 ring-4 ring-amber-100' : isDone ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
                  }`} />

                  {/* Match card */}
                  <div className={`bg-white rounded-xl shadow-xs border transition-all duration-200 p-4 hover:shadow-md ${
                    isLive ? 'border-amber-200 ring-2 ring-amber-500/10' : 'border-slate-150'
                  }`}>
                    {/* Top Row: Round badge, Group, status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-3 text-2xs md:text-xs">
                      <div className="flex items-center gap-2">
                        {match.round && (
                          <span className="px-3 py-1.5 bg-indigo-600 text-white font-black rounded-xl text-sm md:text-base tracking-wider uppercase shadow-xs flex items-center gap-1.5">
                            {match.round.trim().toUpperCase().startsWith('LƯỢT') 
                              ? match.round.trim().toUpperCase() 
                              : `LƯỢT ${match.round.trim().toUpperCase()}`}
                          </span>
                        )}
                        {match.group && (
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 font-extrabold rounded-xl text-xs md:text-sm uppercase border border-slate-200">
                            Bảng {match.group}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {match.status && (
                          <span className={`px-2 py-0.5 rounded-full text-3xs uppercase tracking-wide font-bold ${getStatusBadgeClass(match.status)}`}>
                            {isLive && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-ping mr-1" />}
                            {match.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Section: Highly prominent detail cards */}
                    <div className="bg-amber-500/5 rounded-2xl p-4 border border-amber-500/10 grid grid-cols-1 sm:grid-cols-3 gap-3.5 shadow-3xs">
                      {checkInTime && (
                        <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-2xs">
                          <Clock className="w-5 h-5 text-indigo-500 shrink-0" />
                          <div>
                            <span className="block text-3xs font-extrabold text-slate-400 uppercase tracking-widest">Giờ Check-in</span>
                            <span className="text-sm md:text-base font-black text-indigo-700 block mt-0.5">{checkInTime}</span>
                          </div>
                        </div>
                      )}

                      {match.time && (
                        <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-2xs">
                          <CalendarCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                          <div>
                            <span className="block text-3xs font-extrabold text-slate-400 uppercase tracking-widest">Giờ Thi Đấu</span>
                            <span className="text-sm md:text-base font-black text-emerald-700 block mt-0.5">{match.time}</span>
                          </div>
                        </div>
                      )}

                      {match.court && (
                        <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-2xs">
                          <MapPin className="w-5 h-5 text-amber-500 shrink-0" />
                          <div>
                            <span className="block text-3xs font-extrabold text-slate-400 uppercase tracking-widest">Sân / Khu vực</span>
                            <span className="text-sm md:text-base font-black text-amber-700 block mt-0.5">{match.court}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Extra metadata fields (if any other than check in, sbd, etc) */}
                    {Object.keys(match.customData).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-slate-50">
                        {Object.entries(match.customData)
                          .filter(([k]) => !['giờ check in', 'sbd', 'phụ huynh', 'địa chỉ', 'giờ check-in', 'check in', 'check-in'].some(x => k.toLowerCase().includes(x)))
                          .slice(0, 3).map(([key, val]) => (
                            <span key={key} className="bg-slate-50 px-1.5 py-0.5 rounded text-3xs border border-slate-100 text-slate-400 font-medium">
                              {key}: <b className="text-slate-600">{val}</b>
                            </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Disclaimers */}
      <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100/50 text-slate-600 text-xs flex gap-2">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p>
          <b>Lưu ý dành cho Phụ huynh:</b> Vui lòng đưa bé có mặt tại khu vực thi đấu để làm thủ tục check-in đúng theo <b>Giờ check in</b> đã quy định (trước giờ thi đấu ít nhất 15 phút). Bố mẹ nhớ mang theo nước uống và chuẩn bị trang phục vận động thoải mái nhất cho bé nhé!
        </p>
      </div>
    </motion.div>
  );
}
