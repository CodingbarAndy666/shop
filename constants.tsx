
export const BRAND_NAME = "爆紅姑娘";
export const APP_VERSION = "v1.0.9";

// Google Sheet IDs from User
export const SHEET_IDS = {
  MEMBERS: "16NQw1SGnQ28yrZ7slDhUuY5zrPLrkDAwpxEAgQLH3xo",
  PRODUCTS: "1-m7SilRqipzWy7nCKVO0pcXsOotwrZMRIh9E9qzOI6c",
  SALES: "1io329jT2j3pDloz1DWnfxYIYY4SLPxxe4ailmNGkwv8"
};

/**
 * 重要：請確保 Google Apps Script 已發布為「網頁應用程式」，權限為「任何人」。
 * GAS 腳本內應包含 doGet 與 doPost 處理 getProducts, getMembers, createMember 等動作。
 */
export const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzD_inGsw5YMX2Hbequup3A0u9V4H2vf7PZu8lsS8b-Muv1kITyge9e4KskTFbaAyQG/exec';