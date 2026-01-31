
export interface Product {
  '商品id': string;
  '商品名稱': string;
  '商品類型': string;
  '簡單介紹': string;
  '詳細介紹': string;
  '價格': number;
  '上架日期': string;
  '目前庫存': number;
  '圖片連結'?: string;
}

export interface Member {
  '會員id': string;
  '會員名稱': string;
  '權限': 'user' | 'admin';
  '會員帳號': string;
  '會員密碼': string;
  '生日'?: string;
  '性別'?: string;
  '手機號碼'?: string;
}

export interface SaleRecord {
  '售出日期': string;
  '會員id': string;
  '商品id': string;
  '數量': number;
  '單價'?: number;
  '總計'?: number;
  '收件人'?: string;
  '電話'?: string;
  '地址'?: string;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CheckoutData {
  memberId: string;
  items: CartItem[];
  shippingInfo: {
    name: string;
    phone: string;
    address: string;
  };
}
