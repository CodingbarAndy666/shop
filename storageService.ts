
import { Product, Member, ServiceResult } from '../types';
import { GOOGLE_SHEET_API_URL } from '../constants';

let productsCache: Product[] | null = null;

async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function fetchFromSheet<T>(params: Record<string, string>, method: 'GET' | 'POST' = 'GET', body?: any): Promise<ServiceResult<T>> {
  try {
    const url = new URL(GOOGLE_SHEET_API_URL);
    // 確保 action 始終掛載在 URL 參數上，這對 GAS 的 e.parameter 至關重要
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    const options: RequestInit = {
      method,
      redirect: 'follow',
      mode: 'cors'
    };

    if (method === 'POST' && body) {
      options.body = JSON.stringify(body);
      options.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
    }

    const response = await fetch(url.toString(), options);
    if (!response.ok) throw new Error(`HTTP 錯誤: ${response.status}`);

    const result = await response.json();
    return result as ServiceResult<T>;
  } catch (error) {
    console.error("Sheet API 錯誤:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "無法連線至伺服器" 
    };
  }
}

export const storageService = {
  async getProducts(): Promise<ServiceResult<Product[]>> {
    if (productsCache) return { success: true, data: productsCache };
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
      const p = res.data.find(item => item['商品id'] == id);
      return p ? { success: true, data: p } : { success: false, message: "找不到該商品" };
    }
    return { success: false, message: res.message };
  },

  async registerMember(memberData: Partial<Member>): Promise<ServiceResult<null>> {
    try {
        const checkRes = await fetchFromSheet<Member[]>({ action: 'getMembers' });
        if (checkRes.success && checkRes.data) {
          const exists = checkRes.data.some((m) => m['會員帳號'] === memberData['會員帳號']);
          if (exists) return { success: false, message: "此帳號已被註冊" };
        }

        const encryptedPassword = await hashPassword(memberData['會員密碼'] || "");
        const payload = {
          ...memberData,
          '會員密碼': encryptedPassword,
          '會員id': `M${Date.now()}`,
          '權限': 'user'
        };
        
        return await fetchFromSheet<null>({ action: 'createMember' }, 'POST', { memberData: payload });
    } catch (e) {
        return { success: false, message: "處理加密或通訊時發生異常" };
    }
  },

  async login(account: string, pass: string): Promise<ServiceResult<Member>> {
    const encryptedPass = await hashPassword(pass);
    const res = await fetchFromSheet<Member[]>({ action: 'getMembers' });
    if (res.success && res.data) {
      const member = res.data.find((m) => 
        m['會員帳號'] === account && m['會員密碼'] === encryptedPass
      );
      return member ? { success: true, data: member } : { success: false, message: "帳號或密碼錯誤" };
    }
    return { success: false, message: res.message || "會員登入驗證失敗" };
  }
};
