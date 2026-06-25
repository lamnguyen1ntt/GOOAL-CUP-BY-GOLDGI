import React, { useState } from 'react';
import { PlayerInfo, MatchInfo, SpreadsheetConfig, AppMode } from '../types';
import { 
  Trophy, 
  Users, 
  Calendar, 
  MapPin, 
  TrendingUp, 
  CheckCircle2, 
  Play, 
  Search, 
  Filter, 
  ListTodo, 
  TableProperties, 
  ChevronRight, 
  Sparkles, 
  Award, 
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { normalizeText } from '../utils/sheetParser';

interface TournamentDashboardProps {
  players: PlayerInfo[];
  matches: MatchInfo[];
  onSelectPlayer: (player: PlayerInfo) => void;
  config?: SpreadsheetConfig | null;
}

export default function TournamentDashboard({ players, matches, onSelectPlayer, config }: TournamentDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRound, setSelectedRound] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedCourt, setSelectedCourt] = useState('all');

  // Compute stats
  const totalPlayers = players.length;
  const totalMatches = matches.length;
  const liveMatches = matches.filter(m => {
    const s = m.status?.toLowerCase() || '';
    return s.includes('đang') || s.includes('live') || s.includes('trực tiếp');
  }).length;
  
  const completedMatches = matches.filter(m => {
    const s = m.status?.toLowerCase() || '';
    return s.includes('đã xong') || s.includes('hoàn thành') || s.includes('xong') || s.includes('kết thúc');
  }).length;

  // Compute unique sessions count (for a better default total matches divisor in single-sheet players mode)
  const uniqueSessionsSet = new Set<string>();
  matches.forEach(match => {
    let checkInTime = '';
    const keys = ['Giờ check in', 'Giờ check-in', 'Check in', 'Check-in', 'Giờ điểm danh', 'Điểm danh', 'Checkin'];
    for (const k of keys) {
      if (match.customData[k]) {
        checkInTime = match.customData[k];
        break;
      }
      const foundKey = Object.keys(match.customData).find(ck => 
        k.toLowerCase().trim() === ck.toLowerCase().trim() || 
        ck.toLowerCase().includes(k.toLowerCase())
      );
      if (foundKey) {
        checkInTime = match.customData[foundKey];
        break;
      }
    }
    const sessionKey = `${match.round || ''}|${match.group || match.customData['Bảng'] || ''}|${match.time || ''}|${match.court || ''}|${checkInTime}`;
    uniqueSessionsSet.add(sessionKey);
  });
  
  const totalUniqueSessionsCount = uniqueSessionsSet.size || totalMatches;
  const defaultTotalMatchesDivisor = config?.mode === AppMode.SINGLE_SHEET_PLAYERS 
    ? totalUniqueSessionsCount 
    : totalMatches;

  const displayedCompletedMatchesStr = config?.manualCompletedMatchesCount
    ? (config.manualCompletedMatchesCount.includes('/')
        ? config.manualCompletedMatchesCount
        : `${config.manualCompletedMatchesCount} / ${defaultTotalMatchesDivisor}`)
    : `${completedMatches} / ${defaultTotalMatchesDivisor}`;

  const upcomingMatches = totalMatches - completedMatches - liveMatches;

  // Gather unique options for filters
  const rounds = Array.from(new Set(matches.map(m => m.round).filter(Boolean))) as string[];
  const groups = Array.from(new Set(matches.map(m => m.group || m.customData['Bảng']).filter(Boolean))) as string[];
  const courts = Array.from(new Set(matches.map(m => m.court).filter(Boolean))) as string[];

  // Calculate total rounds across all groups (bảng đấu)
  const groupRoundsMap = new Map<string, Set<string>>();
  matches.forEach(m => {
    const g = m.group || m.customData['Bảng'] || 'no-group';
    const r = m.round;
    if (r) {
      if (!groupRoundsMap.has(g)) {
        groupRoundsMap.set(g, new Set<string>());
      }
      groupRoundsMap.get(g)!.add(r);
    }
  });

  let totalGroupRounds = 0;
  groupRoundsMap.forEach((roundsSet) => {
    totalGroupRounds += roundsSet.size;
  });

  if (totalGroupRounds === 0) {
    totalGroupRounds = rounds.length;
  }

  const displayedPlayersCount = config?.manualPlayersCount ? config.manualPlayersCount : totalPlayers;
  const displayedRoundsCount = config?.manualRoundsCount ? config.manualRoundsCount : totalGroupRounds;

  // Filtered matches
  const filteredMatches = matches.filter(match => {
    // Round filter
    if (selectedRound !== 'all' && match.round !== selectedRound) return false;
    // Group filter
    if (selectedGroup !== 'all' && match.group !== selectedGroup) return false;
    // Court filter
    if (selectedCourt !== 'all' && match.court !== selectedCourt) return false;
    
    // Search query (player names or opponent name)
    if (searchQuery.trim()) {
      const q = normalizeText(searchQuery);
      const name1 = normalizeText(match.player1Name);
      const name2 = normalizeText(match.player2Name);
      const courtName = normalizeText(match.court);
      const roundName = normalizeText(match.round);
      return name1.includes(q) || name2.includes(q) || courtName.includes(q) || roundName.includes(q);
    }
    return true;
  });

  interface SessionInfo {
    id: string;
    round?: string;
    group?: string;
    time?: string;
    court?: string;
    status?: string;
    checkInTime?: string;
  }

  const uniqueSessions: SessionInfo[] = [];
  const seenSessions = new Set<string>();

  filteredMatches.forEach(match => {
    let checkInTime = '';
    const keys = ['Giờ check in', 'Giờ check-in', 'Check in', 'Check-in', 'Giờ điểm danh', 'Điểm danh', 'Checkin'];
    for (const k of keys) {
      if (match.customData[k]) {
        checkInTime = match.customData[k];
        break;
      }
      const foundKey = Object.keys(match.customData).find(ck => 
        k.toLowerCase().trim() === ck.toLowerCase().trim() || 
        ck.toLowerCase().includes(k.toLowerCase())
      );
      if (foundKey) {
        checkInTime = match.customData[foundKey];
        break;
      }
    }

    const sessionKey = `${match.round || ''}|${match.group || match.customData['Bảng'] || ''}|${match.time || ''}|${match.court || ''}|${checkInTime}`;
    if (!seenSessions.has(sessionKey)) {
      seenSessions.add(sessionKey);
      uniqueSessions.push({
        id: match.id,
        round: match.round,
        group: match.group || match.customData['Bảng'],
        time: match.time,
        court: match.court,
        status: match.status,
        checkInTime
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total players */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-100 flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-3xs font-bold text-slate-400 uppercase tracking-wider">Bé đã đăng ký</span>
            <span className="text-xl font-extrabold text-slate-800">{displayedPlayersCount}</span>
          </div>
        </div>

        {/* Total groups */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-100 flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <TableProperties className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-3xs font-bold text-slate-400 uppercase tracking-wider">Số bảng đấu</span>
            <span className="text-xl font-extrabold text-slate-800">{groups.length}</span>
          </div>
        </div>

        {/* Unique rounds */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-100 flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-3xs font-bold text-slate-400 uppercase tracking-wider">Số lượt thi đấu</span>
            <span className="text-xl font-extrabold text-slate-800">{displayedRoundsCount}</span>
          </div>
        </div>

        {/* Live matches */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-100 flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg animate-pulse">
            <Play className="w-5 h-5 fill-emerald-600" />
          </div>
          <div>
            <span className="block text-3xs font-bold text-slate-400 uppercase tracking-wider">Đang diễn ra</span>
            <span className="text-xl font-extrabold text-slate-800">{liveMatches}</span>
          </div>
        </div>

        {/* Completed matches */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-100 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-3xs font-bold text-slate-400 uppercase tracking-wider">Đã hoàn thành</span>
            <span className="text-xl font-extrabold text-slate-800"> ĐANG CẬP NHẬT</span>
          </div>
        </div>
      </div>

      {/* Navigation tabs for browsing */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-150 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-150 bg-slate-50/50 flex items-center gap-2">
          <TableProperties className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-extrabold text-slate-800">
            Lịch Thi Đấu Toàn Giải ({uniqueSessions.length})
          </h3>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick search & Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên bé, sân đấu, giờ thi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent rounded-xl text-xs md:text-sm text-slate-800"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {/* Round filter */}
              {rounds.length > 0 && (
                <select
                  value={selectedRound}
                  onChange={(e) => setSelectedRound(e.target.value)}
                  className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">Tất cả lượt đấu</option>
                  {rounds.map(r => (
                    <option key={r} value={r}>
                      {r.trim().toUpperCase().startsWith('LƯỢT') ? r.toUpperCase() : `LƯỢT ${r.toUpperCase()}`}
                    </option>
                  ))}
                </select>
              )}

              {/* Group filter */}
              {groups.length > 0 && (
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">Tất cả bảng đấu</option>
                  {groups.map(g => <option key={g} value={g}>Bảng {g}</option>)}
                </select>
              )}

              {/* Court filter */}
              {courts.length > 0 && (
                <select
                  value={selectedCourt}
                  onChange={(e) => setSelectedCourt(e.target.value)}
                  className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">Tất cả sân</option>
                  {courts.map(c => <option key={c} value={c}>{c.includes('Sân') ? c : `Sân ${c}`}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Matches browsing list */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {uniqueSessions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm font-semibold border border-dashed border-slate-200 rounded-xl bg-slate-50">
                Không tìm thấy lượt thi đấu nào khớp với bộ lọc
              </div>
            ) : (
              uniqueSessions.map((session) => {
                const isLive = session.status?.toLowerCase().includes('đang') || session.status?.toLowerCase().includes('live');
                const isDone = session.status?.toLowerCase().includes('xong') || session.status?.toLowerCase().includes('đã') || session.status?.toLowerCase().includes('kết');

                return (
                  <div 
                    key={session.id} 
                    className={`p-4 bg-white border rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs transition-all hover:border-slate-300 ${
                      isLive ? 'border-amber-300 bg-amber-50/10' : 'border-slate-150'
                    }`}
                  >
                    {/* Left side: Round and Group info */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {session.round && (
                        <span className="px-2.5 py-1.5 bg-indigo-600 text-white font-black rounded-lg text-2xs md:text-xs tracking-wider uppercase">
                          {session.round.trim().toUpperCase().startsWith('LƯỢT') 
                            ? session.round.trim().toUpperCase() 
                            : `LƯỢT ${session.round.trim().toUpperCase()}`}
                        </span>
                      )}
                      {session.group && (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-black rounded-lg text-2xs border border-amber-100 uppercase">
                          Bảng {session.group}
                        </span>
                      )}
                    </div>

                    {/* Middle: Clean match time, check-in, and court details */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-xs">
                      {session.checkInTime && (
                        <div className="flex items-center gap-2.5 bg-indigo-50/50 px-3 py-2 rounded-xl border border-indigo-100/50 shadow-3xs">
                          <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div>
                            <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Giờ Check-in</span>
                            <span className="text-sm font-black text-indigo-700 block mt-0.5">{session.checkInTime}</span>
                          </div>
                        </div>
                      )}
                      {session.time && (
                        <div className="flex items-center gap-2.5 bg-emerald-50/50 px-3 py-2 rounded-xl border border-emerald-100/50 shadow-3xs">
                          <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div>
                            <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Giờ Thi Đấu</span>
                            <span className="text-sm font-black text-emerald-700 block mt-0.5">{session.time}</span>
                          </div>
                        </div>
                      )}
                      {session.court && (
                        <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shadow-3xs">
                          <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                          <div>
                            <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Sân / Khu vực</span>
                            <span className="text-sm font-black text-slate-700 block mt-0.5">{session.court.includes('Sân') ? session.court : `Sân ${session.court}`}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right side: Session status */}
                    <div className="shrink-0">
                      <span className={`px-2.5 py-1 rounded-full uppercase text-3xs tracking-wider font-extrabold border ${
                        isLive 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200 animate-pulse' 
                          : isDone 
                            ? 'bg-blue-50 text-blue-700 border-blue-100' 
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {session.status || 'Chờ thi đấu'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
