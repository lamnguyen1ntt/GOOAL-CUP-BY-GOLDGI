import Papa from 'papaparse';
import { PlayerInfo, MatchInfo, ColumnMapping, AppMode, SpreadsheetConfig } from '../types';

/**
 * Extracts the spreadsheet ID from a Google Sheets URL.
 */
export function extractSpreadsheetId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : url.trim();
}

/**
 * Normalizes a phone number for comparison (e.g., strips non-digits, converts +84/84 prefix to 0).
 */
export function normalizePhone(phone: string | number | undefined | null): string {
  if (phone === undefined || phone === null) return '';
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.startsWith('84') && cleaned.length > 9) {
    cleaned = '0' + cleaned.substring(2);
  }
  return cleaned;
}

/**
 * Normalizes strings by removing accents/diacritics and lowercasing for smart search.
 */
export function normalizeText(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/đ/g, 'd')
    .trim();
}

/**
 * Fetches CSV data from a public Google Sheet tab.
 */
export async function fetchSheetCsv(spreadsheetId: string, tabName?: string): Promise<any[]> {
  const fetchWithTab = async (tab?: string): Promise<any[]> => {
    // Try our backend server-side proxy first (bypasses browser CORS and private session restrictions)
    let csvText = '';
    try {
      const proxyParams = new URLSearchParams();
      proxyParams.append('spreadsheetId', spreadsheetId);
      if (tab) {
        proxyParams.append('sheet', tab);
      }
      const proxyUrl = `/api/sheet-proxy?${proxyParams.toString()}`;
      const proxyResponse = await fetch(proxyUrl);
      if (proxyResponse.ok) {
        csvText = await proxyResponse.text();
      } else {
        throw new Error(`Proxy returned status ${proxyResponse.status}`);
      }
    } catch (proxyErr) {
      console.warn("Server-side proxy fetch failed, falling back to direct client-side fetch from Google Sheets:", proxyErr);
      // Fallback: direct browser fetch
      const baseUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq`;
      const params = new URLSearchParams({
        tqx: 'out:csv',
      });
      if (tab) {
        params.append('sheet', tab);
      }

      const url = `${baseUrl}?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      csvText = await response.text();
    }
    
    // Check if Google returned an HTML login or error page instead of actual CSV
    if (csvText.includes('<!DOCTYPE html>') || csvText.includes('<html') || csvText.includes('google-signin')) {
      throw new Error('Google Sheets returned an HTML page. Please ensure your Google Sheet has "Anyone with the link can view" permission enabled.');
    }

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  };

  try {
    if (tabName) {
      const data = await fetchWithTab(tabName);
      if (data && data.length > 0) {
        return data;
      }
      throw new Error('Empty data returned for tab name');
    } else {
      return await fetchWithTab();
    }
  } catch (firstError) {
    if (tabName) {
      console.warn(`Could not load tab "${tabName}". Trying fallback to default first tab (without tab name parameter)...`, firstError);
      try {
        const fallbackData = await fetchWithTab();
        if (fallbackData && fallbackData.length > 0) {
          return fallbackData;
        }
      } catch (secondError) {
        console.error('Fallback fetch also failed:', secondError);
      }
    }
    throw new Error(`Không thể kết nối đến Google Sheets hoặc cột dữ liệu không khớp. Hãy đảm bảo bạn đã bật chế độ chia sẻ "Bất kỳ ai có liên kết đều có thể xem" (Anyone with the link can view) và tên tab/cột được cấu hình đúng.`);
  }
}

/**
 * Safely accesses an object property using case-insensitive and trim-tolerant key matching.
 */
export function getPropertyValue(row: any, fieldName: string | undefined): string {
  if (!fieldName || !row) return '';
  
  const targetKey = fieldName.trim().toLowerCase();
  
  // Try exact match
  if (row[fieldName] !== undefined) return String(row[fieldName]).trim();
  
  // Try case-insensitive lookup
  for (const key of Object.keys(row)) {
    if (key.trim().toLowerCase() === targetKey) {
      return String(row[key]).trim();
    }
  }
  
  return '';
}

/**
 * Safely accesses a semantic property using configured mapping first,
 * then falling back to automatic matching of common keywords.
 */
export function getSemanticValue(row: any, fieldName: string | undefined, fallbacks: string[]): string {
  if (!row) return '';

  // 1. If we have a specific configured fieldName, try that first
  if (fieldName) {
    const directVal = getPropertyValue(row, fieldName);
    if (directVal) return directVal;
  }

  // 2. Otherwise, check row keys for any of the fallback terms (substring match, case-insensitive)
  const rowKeys = Object.keys(row);
  for (const fallback of fallbacks) {
    const fbLower = fallback.toLowerCase().trim();
    for (const key of rowKeys) {
      const keyLower = key.toLowerCase().trim();
      if (keyLower.includes(fbLower) || fbLower.includes(keyLower)) {
        const val = String(row[key]).trim();
        if (val) return val;
      }
    }
  }

  return '';
}

/**
 * Helper to extract custom extra fields from a row that aren't mapped to standard fields.
 */
export function getCustomFieldsData(row: any, mappedFields: string[]): Record<string, string> {
  const customData: Record<string, string> = {};
  const mappedSet = new Set(mappedFields.filter(Boolean).map(f => f.trim().toLowerCase()));
  
  for (const key of Object.keys(row)) {
    const cleanKey = key.trim();
    if (!mappedSet.has(cleanKey.toLowerCase()) && row[key] !== undefined && row[key] !== null) {
      const value = String(row[key]).trim();
      if (value) {
        customData[cleanKey] = value;
      }
    }
  }
  
  return customData;
}

/**
 * Process a single sheet where each row is a MATCH.
 */
export function processSingleSheetMatches(
  rows: any[],
  mapping: ColumnMapping
): { players: PlayerInfo[]; matches: MatchInfo[] } {
  const playersMap = new Map<string, PlayerInfo>();
  const matches: MatchInfo[] = [];

  // Fields already mapped (to exclude from customData)
  const mappedFields = [
    mapping.playerName,
    mapping.playerPhone,
    mapping.playerAge,
    mapping.playerGroup,
    mapping.matchRound,
    mapping.matchTime,
    mapping.matchGroup,
    mapping.matchCourt,
    mapping.matchPlayer1Name,
    mapping.matchPlayer1Phone,
    mapping.matchPlayer2Name,
    mapping.matchPlayer2Phone,
    mapping.matchStatus,
    mapping.matchResult,
  ].filter((f): f is string => !!f);

  rows.forEach((row, idx) => {
    // 1. Parse Match details
    const round = getPropertyValue(row, mapping.matchRound);
    const time = getPropertyValue(row, mapping.matchTime);
    const group = getPropertyValue(row, mapping.matchGroup || mapping.playerGroup);
    const court = getPropertyValue(row, mapping.matchCourt);
    const p1Name = getPropertyValue(row, mapping.matchPlayer1Name || mapping.playerName);
    const p1Phone = getPropertyValue(row, mapping.matchPlayer1Phone || mapping.playerPhone);
    const p2Name = getPropertyValue(row, mapping.matchPlayer2Name);
    const p2Phone = getPropertyValue(row, mapping.matchPlayer2Phone);
    const status = getPropertyValue(row, mapping.matchStatus);
    const result = getPropertyValue(row, mapping.matchResult);
    
    const customData = getCustomFieldsData(row, mappedFields);

    const matchId = `match_${idx}`;
    const match: MatchInfo = {
      id: matchId,
      round,
      time,
      group,
      court,
      player1Name: p1Name,
      player1Phone: p1Phone,
      player2Name: p2Name,
      player2Phone: p2Phone,
      status,
      result,
      customData,
    };
    matches.push(match);

    // 2. Extract Players info from Player 1 and Player 2 columns
    if (p1Name && p1Phone) {
      const normPhone = normalizePhone(p1Phone);
      const p1Key = `${normPhone}_${normalizeText(p1Name)}`;
      if (!playersMap.has(p1Key)) {
        playersMap.set(p1Key, {
          id: `player_p1_${idx}`,
          name: p1Name,
          phone: p1Phone,
          age: getPropertyValue(row, mapping.playerAge),
          group: group,
          customData: {},
        });
      }
    }

    if (p2Name && p2Phone) {
      const normPhone = normalizePhone(p2Phone);
      const p2Key = `${normPhone}_${normalizeText(p2Name)}`;
      if (!playersMap.has(p2Key)) {
        playersMap.set(p2Key, {
          id: `player_p2_${idx}`,
          name: p2Name,
          phone: p2Phone,
          group: group,
          customData: {},
        });
      }
    }
  });

  return {
    players: Array.from(playersMap.values()),
    matches,
  };
}

/**
 * Process a single sheet where each row is a PLAYER, and matches are columns or rows.
 */
export function processSingleSheetPlayers(
  rows: any[],
  mapping: ColumnMapping
): { players: PlayerInfo[]; matches: MatchInfo[] } {
  const players: PlayerInfo[] = [];
  const matches: MatchInfo[] = [];

  const mappedFields = [
    mapping.playerName,
    mapping.playerPhone,
    mapping.playerAge,
    mapping.playerGroup,
    mapping.playerSbd,
    mapping.playerParentName,
    mapping.playerAddress,
    mapping.playerSkill,
  ].filter((f): f is string => !!f);

  rows.forEach((row, idx) => {
    const name = getSemanticValue(row, mapping.playerName, [
      'họ và tên', 'họ tên', 'tên bé', 'tên con', 'tên của bé', 'thí sinh', 'họ tên bé', 'tên', 'tên của con'
    ]);
    const phone = getSemanticValue(row, mapping.playerPhone, [
      'số điện thoại', 'sđt', 'sđt ba/mẹ', 'số đt', 'điện thoại', 'phone', 'zalo', 'liên hệ', 'sdt', 'sdt ba', 'sdt mẹ', 'ba/mẹ'
    ]);
    if (!name || !phone) return;

    const age = getSemanticValue(row, mapping.playerAge, [
      'tháng tuổi', 'tuổi', 'nhóm tuổi', 'tuổi của bé', 'năm sinh', 'tháng', 'tuoi'
    ]);
    const group = getSemanticValue(row, mapping.playerGroup, [
      'bảng đấu', 'bảng', 'nhóm', 'group', 'bảng thi đấu', 'bang'
    ]);
    const customData = getCustomFieldsData(row, mappedFields);

    const player: PlayerInfo = {
      id: `player_${idx}`,
      name,
      phone,
      age,
      group,
      customData,
    };
    players.push(player);

    // Look for match columns or extract from direct columns on the same row (e.g. Baby single sheet schedules)
    const luotDau = getSemanticValue(row, mapping.matchRound, ['lượt thi đấu', 'lượt đấu', 'vòng đấu', 'vòng']);
    const gioDau = getSemanticValue(row, mapping.matchTime, ['giờ đấu', 'giờ thi', 'giờ', 'time']);
    const ngayDau = getPropertyValue(row, 'Ngày') || getPropertyValue(row, 'ngày');
    const gioCheckin = getPropertyValue(row, 'Giờ check in') || getPropertyValue(row, 'Checkin') || getPropertyValue(row, 'Giờ check-in') || getPropertyValue(row, 'check in');
    
    // Extract SBD, parent, address, skill with mapping or fallback defaults
    const sbd = getSemanticValue(row, mapping.playerSbd, ['sbd', 'số báo danh', 'mã số', 'mã bé', 'ms']);
    const parentName = getSemanticValue(row, mapping.playerParentName, ['họ và tên ba/ mẹ', 'họ và tên ba mẹ', 'tên phụ huynh', 'họ tên phụ huynh', 'bố mẹ', 'ba mẹ', 'phụ huynh']);
    const address = getSemanticValue(row, mapping.playerAddress, ['địa chỉ hiện tại của bé', 'địa chỉ', 'địa chỉ hiện tại', 'nơi ở']);
    const skill = getSemanticValue(row, mapping.playerSkill, ['kỹ năng hiện tại của bé', 'kỹ năng', 'kỹ năng của bé']);

    const sanDau = getSemanticValue(row, mapping.matchCourt, ['sân', 'sân đấu', 'khu vực', 'court']) || 'Khu vực thi đấu chính';

    let hasCreatedDirectMatch = false;
    if (luotDau || gioDau || gioCheckin || sbd) {
      let combinedTime = gioDau;
      if (ngayDau && gioDau) {
        combinedTime = `${gioDau} - ${ngayDau}`;
      } else if (ngayDau) {
        combinedTime = ngayDau;
      }

      const matchCustom: Record<string, string> = {};
      if (gioCheckin) matchCustom['Giờ check in'] = gioCheckin;
      if (sbd) matchCustom['SBD'] = sbd;
      if (parentName) matchCustom['Phụ huynh'] = parentName;
      if (address) matchCustom['Địa chỉ'] = address;
      if (skill) matchCustom['Kỹ năng'] = skill;

      matches.push({
        id: `match_auto_${idx}`,
        round: luotDau ? `Lượt thi đấu ${luotDau}` : 'Lượt đấu chính',
        time: combinedTime || 'Chưa xác định',
        group: group || 'A1',
        court: sanDau,
        player1Name: name,
        player1Phone: phone,
        player2Name: '', // Single player run/show
        status: 'Chuẩn bị diễn ra',
        customData: matchCustom
      });
      hasCreatedDirectMatch = true;
    }

    if (!hasCreatedDirectMatch) {
      // Look for match columns. Any columns containing "lịch", "trận", "đối thủ", "giờ đấu", "time", "match", "vs"
      // can be turned into match info for this player.
      Object.keys(row).forEach((colName, colIdx) => {
        const cleanColName = colName.trim();
        const colLower = cleanColName.toLowerCase();
        
        // If we find columns like "Lịch thi đấu 1" or "Trận 1"
        if (
          !mappedFields.map(f => f.toLowerCase()).includes(colLower) &&
          (colLower.includes('trận') ||
            colLower.includes('lịch') ||
            colLower.includes('vs') ||
            colLower.includes('match') ||
            colLower.includes('đối thủ'))
        ) {
          const val = String(row[colName]).trim();
          if (val) {
            matches.push({
              id: `match_${idx}_${colIdx}`,
              round: cleanColName,
              player1Name: name,
              player1Phone: phone,
              player2Name: val, // Treat column value as opponent/details
              status: 'Lịch đấu',
              customData: {},
            });
          }
        }
      });
    }
  });

  return { players, matches };
}

/**
 * Process two separate sheets: Players and Matches, linked together.
 */
export function processTwoSheetsLinked(
  playersRows: any[],
  matchesRows: any[],
  mapping: ColumnMapping
): { players: PlayerInfo[]; matches: MatchInfo[] } {
  const players: PlayerInfo[] = [];
  const matches: MatchInfo[] = [];

  const playerMappedFields = [
    mapping.playerName,
    mapping.playerPhone,
    mapping.playerAge,
    mapping.playerGroup,
    mapping.playerId,
  ].filter((f): f is string => !!f);

  // Parse Players
  playersRows.forEach((row, idx) => {
    const name = getPropertyValue(row, mapping.playerName);
    const phone = getPropertyValue(row, mapping.playerPhone);
    if (!name || !phone) return;

    const age = getPropertyValue(row, mapping.playerAge);
    const group = getPropertyValue(row, mapping.playerGroup);
    const id = getPropertyValue(row, mapping.playerId) || `player_${idx}`;
    const customData = getCustomFieldsData(row, playerMappedFields);

    players.push({
      id,
      name,
      phone,
      age,
      group,
      customData,
    });
  });

  const matchMappedFields = [
    mapping.matchRound,
    mapping.matchTime,
    mapping.matchGroup,
    mapping.matchCourt,
    mapping.matchPlayer1Name,
    mapping.matchPlayer2Name,
    mapping.matchStatus,
    mapping.matchResult,
  ].filter((f): f is string => !!f);

  // Parse Matches
  matchesRows.forEach((row, idx) => {
    const round = getPropertyValue(row, mapping.matchRound);
    const time = getPropertyValue(row, mapping.matchTime);
    const group = getPropertyValue(row, mapping.matchGroup);
    const court = getPropertyValue(row, mapping.matchCourt);
    const p1Val = getPropertyValue(row, mapping.matchPlayer1Name);
    const p2Val = getPropertyValue(row, mapping.matchPlayer2Name);
    const status = getPropertyValue(row, mapping.matchStatus);
    const result = getPropertyValue(row, mapping.matchResult);
    const customData = getCustomFieldsData(row, matchMappedFields);

    // Look up if player values are IDs or names and find their phone if possible
    let p1Name = p1Val;
    let p1Phone = '';
    let p2Name = p2Val;
    let p2Phone = '';

    // Try linking by ID or Name
    const foundP1 = players.find(p => p.id === p1Val || p.name.toLowerCase() === p1Val.toLowerCase());
    if (foundP1) {
      p1Name = foundP1.name;
      p1Phone = foundP1.phone;
    }

    const foundP2 = players.find(p => p.id === p2Val || p.name.toLowerCase() === p2Val.toLowerCase());
    if (foundP2) {
      p2Name = foundP2.name;
      p2Phone = foundP2.phone;
    }

    matches.push({
      id: `match_${idx}`,
      round,
      time,
      group,
      court,
      player1Name: p1Name,
      player1Phone: p1Phone,
      player2Name: p2Name,
      player2Phone: p2Phone,
      status,
      result,
      customData,
    });
  });

  return { players, matches };
}

/**
 * Searches for a player's info and matching schedules by phone number or name.
 */
export function searchPlayerAndMatches(
  searchQuery: string,
  players: PlayerInfo[],
  matches: MatchInfo[]
): { player: PlayerInfo; matches: MatchInfo[] }[] {
  const cleanQuery = searchQuery.trim();
  if (!cleanQuery) return [];

  const isPhoneQuery = /^[0-9+.\s-]{7,15}$/.test(cleanQuery);
  const normQuery = isPhoneQuery ? normalizePhone(cleanQuery) : normalizeText(cleanQuery);

  if (!normQuery) return [];

  // 1. Find all players matching the query
  const matchedPlayers = players.filter(p => {
    if (isPhoneQuery) {
      return normalizePhone(p.phone).includes(normQuery);
    } else {
      return normalizeText(p.name).includes(normQuery);
    }
  });

  // 2. For each matched player, gather their schedules
  return matchedPlayers.map(player => {
    const playerNormPhone = normalizePhone(player.phone);
    const playerNormName = normalizeText(player.name);

    const matchedMatches = matches.filter(match => {
      const m1PhoneNorm = match.player1Phone ? normalizePhone(match.player1Phone) : '';
      const m2PhoneNorm = match.player2Phone ? normalizePhone(match.player2Phone) : '';
      const m1NameNorm = normalizeText(match.player1Name);
      const m2NameNorm = normalizeText(match.player2Name);

      // Player 1 slot matches if:
      // - Name matches AND (either there is no phone in slot, or phone matches)
      // - OR, if there is no name in slot but phone is present and matches
      const matchesP1 = (m1NameNorm === playerNormName && (!m1PhoneNorm || m1PhoneNorm === playerNormPhone)) ||
                        (!m1NameNorm && m1PhoneNorm && m1PhoneNorm === playerNormPhone);

      // Player 2 slot matches if:
      // - Name matches AND (either there is no phone in slot, or phone matches)
      // - OR, if there is no name in slot but phone is present and matches
      const matchesP2 = (m2NameNorm === playerNormName && (!m2PhoneNorm || m2PhoneNorm === playerNormPhone)) ||
                        (!m2NameNorm && m2PhoneNorm && m2PhoneNorm === playerNormPhone);

      return matchesP1 || matchesP2;
    });

    return {
      player,
      matches: matchedMatches,
    };
  });
}
