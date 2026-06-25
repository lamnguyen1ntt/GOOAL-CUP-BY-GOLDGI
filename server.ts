import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";

// Hardcoded default DEMO_CONFIG matching the user's real sheet
const DEFAULT_CONFIG = {
  spreadsheetId: '1Ospms64ic2jErN5sewOSyGOrfUNbzq2q0JzPxSLLn8o',
  playersTabName: 'Danh sách Bé đăng ký',
  matchesTabName: 'Lịch thi đấu',
  mode: 'single_sheet_players',
  tournamentName: 'GOOAL CUP BY GOLDGI',
  organizerName: 'BỈM NHẬT BẢN GOLDGI',
  bannerUrl: 'https://goldgi.com.vn/wp-content/uploads/2026/06/background-KV-01-2-scaled.jpg',
  footerText: 'Phần mềm được phát triển bởi Lâm Awesomeboy',
  manualPlayersCount: '2067',
  mapping: {
    playerName: 'Họ và tên của bé:',
    playerPhone: 'SĐT',
    playerAge: 'Độ tuổi',
    playerGroup: 'Bảng đấu',
    playerSbd: 'SBD',
    playerParentName: 'Họ và tên ba/ mẹ',
    playerAddress: 'Địa chỉ',
    playerSkill: '',
    matchRound: 'Lượt thi đấu',
    matchTime: 'Giờ đấu',
    matchCourt: 'Sân',
    matchPlayer1Name: '',
    matchPlayer2Name: '',
    matchStatus: '',
    matchResult: '',
  }
};

const CONFIG_FILE_PATH = path.join(process.cwd(), "tournament_config.json");

// Helper to safely read configuration
function getStoredConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const fileData = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
      return JSON.parse(fileData);
    }
  } catch (err) {
    console.error("Failed to read stored config file", err);
  }
  return DEFAULT_CONFIG;
}

// Helper to safely write configuration
function saveConfig(config: any) {
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to write config file", err);
    return false;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/config", (req, res) => {
    const config = getStoredConfig();
    res.json(config);
  });

  app.post("/api/config", (req, res) => {
    const config = req.body;
    if (!config || !config.spreadsheetId) {
      return res.status(400).json({ error: "Cấu hình không hợp lệ" });
    }
    const success = saveConfig(config);
    if (success) {
      res.json({ success: true, message: "Đã lưu cấu hình lên máy chủ!" });
    } else {
      res.status(500).json({ error: "Không thể lưu cấu hình lên máy chủ" });
    }
  });

  // Proxy to fetch Google Sheet CSV server-side to completely bypass CORS / Cookie / Login redirect issues
  app.get("/api/sheet-proxy", async (req, res) => {
    const { spreadsheetId, sheet } = req.query;
    if (!spreadsheetId) {
      return res.status(400).json({ error: "Missing spreadsheetId" });
    }

    const baseUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq`;
    const params = new URLSearchParams({ tqx: "out:csv" });
    if (sheet) {
      params.append("sheet", String(sheet));
    }

    const url = `${baseUrl}?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Sheets responded with status ${response.status}`);
      }
      const text = await response.text();
      
      // If we got an HTML login page or login error page
      if (text.includes("<!DOCTYPE html>") || text.includes("<html") || text.includes("google-signin")) {
        return res.status(403).json({ 
          error: "Google Sheets returned login screen. Please make sure anyone with link can view." 
        });
      }

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.send(text);
    } catch (err: any) {
      console.error("Sheet proxy error:", err.message);
      res.status(500).json({ error: err.message || "Failed to fetch spreadsheet CSV" });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
