
import { Product, Member, SaleRecord, ServiceResult, CheckoutData } from '../types';
import { GOOGLE_SHEET_API_URL } from '../constants';

let productsCache: Product[] | null = null;

async function hashPassword(password: string): Promise<string> {
  if (/^[a-f0-9]{64}$/.test(password)) return password;
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 修正：不再移除開頭的 0，僅過濾非數字字元。
 */
const normalizePhoneForStorage = (phone?: string | number): string => {
  if (!phone) return "";
  const s = String(phone).replace(/\D/g, '');
  // 確保是 09 開頭
  if (s.length === 9 && !s.startsWith('0')) return '0' + s;
  return s;
};

async function fetchFromSheet<T>(params: Record<string, string>, method: 'GET' | 'POST' = 'GET', body?: any): Promise<ServiceResult<T>> {
  try {
    const url = new URL(GOOGLE_SHEET_API_URL);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    const options: RequestInit = {
      method,
      redirect: 'follow',
      mode: 'cors',
      cache: 'no-cache'
    };

    if (method === 'POST' && body) {
      options.body = JSON.stringify(body);
      options.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
    }

    const response = await fetch(url.toString(), options);
    if (!response.ok) throw new Error(`伺服器回應錯誤: ${response.status}`);
    
    const text = await response.text();
    // 解決部分 GAS 可能返回非標準 JSON 的問題
    try {
      return JSON.parse(text) as ServiceResult<T>;
    } catch (e) {
      console.error("JSON 解析失敗，原始文字:", text);
      return { success: false, message: "資料格式錯誤" };
    }
  } catch (error) {
    console.error("Sheet API 錯誤:", error);
    return { success: false, message: "系統連線異常，請稍後再試。" };
  }
}

export const storageService = {
  async getProducts(): Promise<ServiceResult<Product[]>> {
    const res = await fetchFromSheet<Product[]>({ action: 'getProducts' });
    if (res.success && res.data) {
        const cleaned = res.data.map(p => ({
            ...p,
            '價格': Number(p['價格']),
            '目前庫存': Number(p['目前庫存'])
        }));
        productsCache = cleaned;
        return { success: true, data: cleaned };
    }
    return res;
  },

  async getProductById(id: string): Promise<ServiceResult<Product>> {
    const res = await this.getProducts();
    if (res.success && res.data) {
      const p = res.data.find(item => String(item['商品id']) === String(id));
      return p ? { success: true, data: p } : { success: false, message: "找不到該商品" };
    }
    return res;
  },

  async registerMember(memberData: Partial<Member>): Promise<ServiceResult<null>> {
    const checkRes = await fetchFromSheet<Member[]>({ action: 'getMembers' });
    const inputPhoneNorm = normalizePhoneForStorage(memberData['手機號碼']);
    if (checkRes.success && checkRes.data) {
      if (checkRes.data.some(m => m['會員帳號'] === memberData['會員帳號'])) return { success: false, message: "此電子郵件已被註冊" };
      if (checkRes.data.some(m => normalizePhoneForStorage(m['手機號碼']) === inputPhoneNorm)) return { success: false, message: "此手機號碼已被註冊" };
    }
    const encryptedPassword = await hashPassword(memberData['會員密碼'] || "");
    const payload = { ...memberData, '手機號碼': inputPhoneNorm, '會員密碼': encryptedPassword, '會員id': `UID${Date.now()}`, '權限': 'user' };
    return await fetchFromSheet<null>({ action: 'createMember' }, 'POST', { memberData: payload });
  },

  async login(account: string, pass: string): Promise<ServiceResult<Member>> {
    const encryptedPass = await hashPassword(pass);
    const res = await fetchFromSheet<Member[]>({ action: 'getMembers' });
    if (res.success && res.data) {
      const member = res.data.find(m => m['會員帳號'] === account && m['會員密碼'] === encryptedPass);
      return member ? { success: true, data: member } : { success: false, message: "帳號或密碼錯誤" };
    }
    return { success: false, message: res.message || "登入失敗" };
  },

  async updateMember(memberData: Member): Promise<ServiceResult<null>> {
    const payload = { ...memberData, '手機號碼': normalizePhoneForStorage(memberData['手機號碼']) };
    // 如果密碼沒變，不需要重新 Hash (這裡假設 UI 沒改就不傳新密碼，或是 UI 處理)
    return await fetchFromSheet<null>({ action: 'updateMember' }, 'POST', { memberData: payload });
  },

  async processCheckout(checkoutData: CheckoutData): Promise<ServiceResult<null>> {
    try {
      const prodRes = await this.getProducts();
      if (!prodRes.success || !prodRes.data) return { success: false, message: "無法獲取最新庫存" };
      const latestProducts = prodRes.data;

      for (const item of checkoutData.items) {
        const p = latestProducts.find(lp => String(lp['商品id']) === String(item.product['商品id']));
        if (!p || p['目前庫存'] < item.quantity) {
          return { success: false, message: `商品「${item.product['商品名稱']}」庫存不足，剩餘 ${p ? p['目前庫存'] : 0} 件` };
        }
      }

      const saleRecords: SaleRecord[] = checkoutData.items.map(item => ({
        '售出日期': new Date().toISOString(),
        '會員id': checkoutData.memberId,
        '商品id': item.product['商品id'],
        '數量': item.quantity,
        '單價': item.product['價格'],
        '總計': item.product['價格'] * item.quantity,
        '收件人': checkoutData.shippingInfo.name,
        '電話': normalizePhoneForStorage(checkoutData.shippingInfo.phone),
        '地址': checkoutData.shippingInfo.address
      }));

      const res = await fetchFromSheet<null>({ action: 'processCheckout' }, 'POST', { saleRecords });
      if (res.success) productsCache = null; 
      return res;
    } catch (e) {
      return { success: false, message: "結帳異常" };
    }
  },

  async getMemberSales(memberId: string): Promise<ServiceResult<SaleRecord[]>> {
    return await fetchFromSheet<SaleRecord[]>({ action: 'getMemberSales', memberId });
  }
};
