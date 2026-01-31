
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { 
  ShoppingCart, LogOut, X, Package, Sparkles, Heart, 
  Loader2, ArrowLeft, User, Mail, 
  UserCircle, Settings, ShoppingBag, Plus, Minus, MapPin, UserCheck, Phone
} from 'lucide-react';
import { Product, Member, CartItem, SaleRecord, CheckoutData } from './types.ts';
import { BRAND_NAME } from './constants.tsx';
import { storageService } from './services/storageService.ts';

// --- Utilities ---

const formatImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    let fileId = '';
    const dMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (dMatch && dMatch[1]) fileId = dMatch[1];
    else {
      const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) fileId = idMatch[1];
    }
    if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return url;
};

const formatPhoneDisplay = (p?: any) => {
  if (p === undefined || p === null || p === "") return "";
  const s = String(p).replace(/\D/g, '');
  if (s === "") return "";
  return s.startsWith('0') ? s : '0' + s;
};

// --- Custom Components ---

const BirthdayInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleContainerClick = () => {
    if (disabled) return;
    if (inputRef.current) {
      if (typeof (inputRef.current as any).showPicker === 'function') {
        try { (inputRef.current as any).showPicker(); } catch (e) { inputRef.current.focus(); }
      } else {
        inputRef.current.focus();
        inputRef.current.click();
      }
    }
  };
  return (
    <div className={`relative cursor-pointer w-full`} onClick={handleContainerClick}>
      <input 
        ref={inputRef}
        type="date"
        disabled={disabled}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer text-sm shadow-sm transition-all"
      />
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          opacity: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

const Navbar: React.FC<{ user: Member | null; cartCount: number; onLogout: () => void; onOpenCart: () => void }> = ({ user, cartCount, onLogout, onOpenCart }) => (
  <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-orange-100 shadow-sm">
    <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 font-bold text-2xl text-orange-600 tracking-tight">
        <Heart className="w-7 h-7 fill-orange-500 text-orange-500" />
        <span>{BRAND_NAME}</span>
      </Link>
      <div className="flex items-center gap-6">
        {user ? (
          <div className="flex items-center gap-4">
            <Link to="/profile" className="flex items-center gap-2 font-medium text-slate-700 hover:text-orange-600 group">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors"><User className="w-4 h-4 text-orange-600" /></div>
              <span className="hidden sm:inline">{user['會員名稱']}</span>
            </Link>
            <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><LogOut className="w-5 h-5" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-slate-600 font-medium hover:text-orange-600">登入</Link>
            <Link to="/register" className="bg-orange-600 text-white px-4 py-1.5 rounded-full font-bold hover:bg-orange-700 transition-all shadow-md shadow-orange-100">註冊</Link>
          </div>
        )}
        <button onClick={onOpenCart} className="relative p-2 text-slate-600 hover:text-orange-600 transition-colors">
          <ShoppingCart className="w-6 h-6" />
          {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{cartCount}</span>}
        </button>
      </div>
    </div>
  </nav>
);

const AppContent: React.FC = () => {
  const [user, setUser] = useState<Member | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [isCheckoutView, setIsCheckoutView] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({ name: '', phone: '', address: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { setIsCartOpen(false); setIsCheckoutView(false); }, [location.pathname]);

  const addToCart = (product: Product) => { setActiveProduct(product); };

  const confirmAddToCart = (qty: number) => {
    if (!activeProduct) return;
    setCart(prev => {
      const ex = prev.find(i => i.product['商品id'] === activeProduct['商品id']);
      if (ex) return prev.map(i => i.product['商品id'] === activeProduct['商品id'] ? { ...i, quantity: Math.min(i.quantity + qty, activeProduct['目前庫存']) } : i);
      return [...prev, { product: activeProduct, quantity: qty }];
    });
    setActiveProduct(null);
    setIsCartOpen(true);
  };

  const updateCartQty = (id: string, n: number, max: number) => {
    if (n < 1) return setCart(prev => prev.filter(i => i.product['商品id'] !== id));
    setCart(prev => prev.map(i => i.product['商品id'] === id ? { ...i, quantity: Math.min(n, max) } : i));
  };

  const handleCheckout = async () => {
    if (!user) return navigate('/login');
    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) return alert("請填寫完整的收件資訊");
    setIsProcessing(true);
    const res = await storageService.processCheckout({
      memberId: user['會員id'],
      items: cart,
      shippingInfo
    });
    if (res.success) {
      alert("下單成功！感謝您的支持，我們將盡快為您出貨。");
      setCart([]);
      setIsCheckoutView(false);
      setIsCartOpen(false);
      navigate('/profile');
    } else {
      alert(res.message || "結帳失敗，請確認庫存後重試。");
    }
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} cartCount={cart.reduce((a, c) => a + c.quantity, 0)} onLogout={() => { if(confirm("確定登出？")) { setUser(null); setCart([]); navigate('/'); } }} onOpenCart={() => setIsCartOpen(true)} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<ShopPage onAddToCart={addToCart} />} />
          <Route path="/product/:id" element={<ProductDetail onAddToCart={addToCart} />} />
          <Route path="/login" element={<Login onLogin={setUser} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile user={user} onUpdateUser={setUser} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      
      {activeProduct && <QuantityModal product={activeProduct} onClose={() => setActiveProduct(null)} onConfirm={confirmAddToCart} />}

      {isCartOpen && (
        <div className="fixed inset-0 z-[110] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => { setIsCartOpen(false); setIsCheckoutView(false); }}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-8 border-b flex items-center justify-between">
              <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3"><ShoppingCart className="w-8 h-8 text-orange-600" /> {isCheckoutView ? '填寫收件資訊' : '購物籃'}</h2>
              <button onClick={() => { setIsCartOpen(false); setIsCheckoutView(false); }} className="p-3 hover:bg-slate-100 rounded-2xl"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!isCheckoutView ? (
                cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300"><ShoppingBag className="w-20 h-20 mb-6 opacity-10" /><p className="font-black uppercase tracking-widest text-sm">籃子目前是空的</p></div>
                ) : cart.map(item => (
                  <div key={item.product['商品id']} className="flex gap-4 p-4 bg-slate-50 rounded-[2rem] border relative group">
                    <div className="w-20 h-20 bg-white rounded-2xl overflow-hidden border shrink-0"><img src={formatImageUrl(item.product['圖片連結'])} className="w-full h-full object-cover" alt={item.product['商品名稱']} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start"><h4 className="font-black text-slate-900 truncate text-sm">{item.product['商品名稱']}</h4><button onClick={() => updateCartQty(item.product['商品id'], 0, 0)} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button></div>
                      <p className="text-orange-600 font-black text-base mb-2">NT$ {item.product['價格'].toLocaleString()}</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateCartQty(item.product['商品id'], item.quantity - 1, item.product['目前庫存'])} className="w-7 h-7 bg-white border rounded-lg flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                        <input type="text" className="w-12 h-7 bg-white border rounded-lg text-center text-xs font-bold" value={item.quantity} readOnly />
                        <button onClick={() => updateCartQty(item.product['商品id'], item.quantity + 1, item.product['目前庫存'])} className="w-7 h-7 bg-white border rounded-lg flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100 mb-6">
                    <p className="text-orange-600 font-black text-sm mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4" /> 確認出貨資訊</p>
                    <p className="text-slate-500 text-xs font-medium">請提供詳細地址以利配送。</p>
                  </div>
                  <div><label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-2">姓名 *</label><input type="text" className="w-full px-6 py-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold" value={shippingInfo.name} onChange={e=>setShippingInfo({...shippingInfo, name: e.target.value})} placeholder="請輸入收件人姓名" /></div>
                  <div><label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-2">電話 *</label><input type="tel" className="w-full px-6 py-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold" value={shippingInfo.phone} onChange={e=>setShippingInfo({...shippingInfo, phone: e.target.value})} placeholder="例: 0912345678" /></div>
                  <div><label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-2">地址 *</label><textarea className="w-full px-6 py-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 h-32 resize-none font-bold" value={shippingInfo.address} onChange={e=>setShippingInfo({...shippingInfo, address: e.target.value})} placeholder="請輸入詳細配送地址"></textarea></div>
                </div>
              )}
            </div>
            <div className="p-8 border-t bg-white">
              <div className="flex justify-between items-end mb-8"><div className="flex flex-col"><span className="text-xs font-black text-slate-400 uppercase">結帳總額</span><span className="text-4xl font-black text-orange-600">NT$ {cart.reduce((acc, c) => acc + (c.product['價格'] * c.quantity), 0).toLocaleString()}</span></div></div>
              {!isCheckoutView ? (
                <button disabled={cart.length === 0} onClick={() => { if(!user) navigate('/login'); else { setShippingInfo({ name: user['會員名稱'], phone: formatPhoneDisplay(user['手機號碼']), address: '' }); setIsCheckoutView(true); } }} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xl hover:bg-orange-600 active:scale-95 transition-all">確認訂單內容</button>
              ) : (
                <div className="flex gap-4">
                  <button onClick={() => setIsCheckoutView(false)} className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-2xl font-black text-lg">返回</button>
                  <button disabled={isProcessing} onClick={handleCheckout} className="flex-[2] bg-orange-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-orange-100">{isProcessing ? '下單中...' : '確認下單'}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const QuantityModal: React.FC<{ product: Product; onClose: () => void; onConfirm: (q: number) => void }> = ({ product, onClose, onConfirm }) => {
  const [val, setVal] = useState("1");
  const max = Number(product['目前庫存'] || 0);
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 animate-in zoom-in-95 duration-200 shadow-2xl">
        <div className="text-center mb-6"><h3 className="text-xl font-black mb-2">選擇商品數量</h3><p className="text-orange-600 font-bold">{product['商品名稱']}</p><p className="text-slate-400 text-xs mt-1">目前庫存：{max}</p></div>
        <div className="flex items-center justify-center gap-4 mb-8">
          <button onClick={() => setVal(v => Math.max(1, parseInt(v)-1).toString())} className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center hover:bg-slate-200"><Minus className="w-6 h-6" /></button>
          <input type="text" className="w-20 h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-2xl font-black" value={val} readOnly />
          <button onClick={() => setVal(v => Math.min(max, parseInt(v)+1).toString())} className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center hover:bg-slate-200"><Plus className="w-6 h-6" /></button>
        </div>
        <button onClick={() => onConfirm(parseInt(val))} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg active:scale-95 transition-all">加入購物籃</button>
      </div>
    </div>
  );
};

const ShopPage: React.FC<{ onAddToCart: (p: Product) => void }> = ({ onAddToCart }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { storageService.getProducts().then(res => { if(res.success && res.data) setProducts(res.data); setLoading(false); }); }, []);
  if (loading) return <div className="flex flex-col items-center justify-center py-40"><Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-4" /><p className="text-slate-400 font-bold">同步最新好物中...</p></div>;
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-16 text-center"><h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">爆紅<span className="text-orange-600">口碑</span>好物</h1><div className="w-20 h-1.5 bg-orange-500 mx-auto rounded-full"></div></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {products.map(p => (
          <div key={p['商品id']} className="group bg-white rounded-[2.5rem] overflow-hidden border hover:shadow-2xl transition-all flex flex-col transform hover:-translate-y-1">
            <Link to={`/product/${p['商品id']}`} className="aspect-square bg-slate-100 overflow-hidden relative"><img src={formatImageUrl(p['圖片連結'])} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={p['商品名稱']} />{Number(p['目前庫存']) <= 0 && <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center"><span className="bg-slate-900 text-white px-6 py-2 rounded-full font-black text-sm">暫時售完</span></div>}</Link>
            <div className="p-8 flex flex-col flex-1"><h3 className="text-xl font-black text-slate-900 mb-2 truncate group-hover:text-orange-600">{p['商品名稱']}</h3><p className="text-slate-400 text-xs mb-6 line-clamp-2 h-8">{p['簡單介紹']}</p><div className="flex items-center justify-between mt-auto"><span className="text-2xl font-black text-slate-900">NT$ {Number(p['價格']).toLocaleString()}</span><button disabled={Number(p['目前庫存']) <= 0} onClick={() => onAddToCart(p)} className="bg-slate-900 text-white p-4 rounded-2xl hover:bg-orange-600 disabled:bg-slate-100 transition-colors"><ShoppingCart className="w-5 h-5" /></button></div></div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductDetail: React.FC<{ onAddToCart: (p: Product) => void }> = ({ onAddToCart }) => {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if(id) storageService.getProductById(id).then(res => { if(res.success && res.data) setProduct(res.data); setLoading(false); }); }, [id]);
  if (loading || !product) return <div className="flex justify-center py-40"><Loader2 className="w-10 h-10 animate-spin text-orange-500" /></div>;
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Link to="/" className="inline-flex items-center text-slate-500 hover:text-orange-600 mb-8 font-medium"><ArrowLeft className="w-4 h-4 mr-2" /> 返回商品列表</Link>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-white rounded-[3rem] p-10 shadow-xl border">
        <div className="rounded-[2rem] aspect-square overflow-hidden bg-slate-50 border"><img src={formatImageUrl(product['圖片連結'])} className="w-full h-full object-cover" alt={product['商品名稱']} /></div>
        <div className="flex flex-col py-4">
          <span className="text-orange-600 font-bold mb-2">{product['商品類型']}</span><h1 className="text-4xl font-black text-slate-900 mb-4">{product['商品名稱']}</h1><p className="text-3xl font-black text-orange-600 mb-8">NT$ {Number(product['價格']).toLocaleString()}</p>
          <div className="bg-slate-50 p-6 rounded-2xl mb-8 border leading-relaxed text-slate-600">{product['簡單介紹']}</div>
          <div className="mb-10 text-slate-500 text-sm leading-relaxed whitespace-pre-wrap">{product['詳細介紹']}</div>
          <div className="mt-auto pt-6 border-t"><div className="flex justify-between items-center mb-6"><span className="text-slate-400 text-xs font-bold">目前剩餘</span><span className={Number(product['目前庫存']) > 0 ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>{Number(product['目前庫存']) > 0 ? `${product['目前庫存']} 件` : '缺貨中'}</span></div><button disabled={Number(product['目前庫存']) <= 0} onClick={() => onAddToCart(product)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xl hover:bg-orange-600 disabled:bg-slate-200 transition-all">加入購物籃</button></div>
        </div>
      </div>
    </div>
  );
};

const Login: React.FC<{ onLogin: (m: Member) => void }> = ({ onLogin }) => {
  const [acc, setAcc] = useState('');
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handle = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const res = await storageService.login(acc, pwd);
    if(res.success && res.data) { onLogin(res.data); navigate('/'); } else alert(res.message);
    setLoading(false);
  };
  return (
    <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-[3rem] shadow-2xl border">
      <h2 className="text-3xl font-black text-center mb-8">會員登入</h2>
      <form onSubmit={handle} className="space-y-6">
        <div><label className="block text-sm font-bold text-slate-700 mb-2 ml-2">Email 帳號</label><input type="email" required className="w-full px-6 py-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold" value={acc} onChange={e=>setAcc(e.target.value)} /></div>
        <div><label className="block text-sm font-bold text-slate-700 mb-2 ml-2">密碼</label><input type="password" required className="w-full px-6 py-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold" value={pwd} onChange={e=>setPwd(e.target.value)} /></div>
        <button disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xl hover:bg-orange-600 transition-all active:scale-95">{loading ? '登入驗證中...' : '確認登入'}</button>
      </form>
      <div className="mt-8 text-center text-sm text-slate-400 font-bold">還不是會員嗎？ <Link to="/register" className="text-orange-600">立即註冊</Link></div>
    </div>
  );
};

const Register: React.FC = () => {
  const [data, setData] = useState<Partial<Member>>({'會員名稱': '', '會員帳號': '', '會員密碼': '', '手機號碼': '', '性別': '不便透露', '生日': ''});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!data['會員名稱'] || !data['會員帳號']?.includes('@') || !data['生日']) { alert("請填寫完整資訊"); return; }
    setLoading(true);
    const res = await storageService.registerMember(data);
    if(res.success) { alert('註冊成功！'); navigate('/login'); } else alert(res.message);
    setLoading(false);
  };
  return (
    <div className="max-w-md mx-auto mt-12 p-10 bg-white rounded-[3rem] shadow-2xl border mb-20">
      <h2 className="text-3xl font-black text-center mb-8">加入會員</h2>
      <form onSubmit={handle} className="space-y-6">
        <div><label className="block text-sm font-bold text-slate-700 mb-2 ml-2">名稱 *</label><input type="text" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={data['會員名稱']} onChange={e=>setData({...data, '會員名稱': e.target.value})} /></div>
        <div><label className="block text-sm font-bold text-slate-700 mb-2 ml-2">Email *</label><input type="email" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={data['會員帳號']} onChange={e=>setData({...data, '會員帳號': e.target.value})} /></div>
        <div><label className="block text-sm font-bold text-slate-700 mb-2 ml-2">密碼 *</label><input type="password" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={data['會員密碼']} onChange={e=>setData({...data, '會員密碼': e.target.value})} /></div>
        <div><label className="block text-sm font-bold text-slate-700 mb-2 ml-2">手機 *</label><input type="tel" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={data['手機號碼']} onChange={e=>setData({...data, '手機號碼': e.target.value})} /></div>
        <div><label className="block text-sm font-bold text-slate-700 mb-2 ml-2">生日 *</label><BirthdayInput value={data['生日'] || ''} onChange={val => setData({...data, '生日': val})} /></div>
        <button disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xl hover:bg-orange-600 transition-all mt-4">{loading ? '處理中...' : '確認註冊'}</button>
      </form>
    </div>
  );
};

const Profile: React.FC<{ user: Member | null; onUpdateUser: (m: Member) => void }> = ({ user, onUpdateUser }) => {
  if (!user) return <Navigate to="/login" />;
  const [formData, setFormData] = useState<Member>({ ...user });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoadingSales(true);
      const [salesRes, prodRes] = await Promise.all([
        storageService.getMemberSales(user['會員id']),
        storageService.getProducts()
      ]);
      if(salesRes.success && salesRes.data) setSales(salesRes.data);
      if(prodRes.success && prodRes.data) setProducts(prodRes.data);
      setLoadingSales(false);
    };
    loadData();
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    const res = await storageService.updateMember(formData);
    if(res.success) { onUpdateUser(formData); setIsEditing(false); alert("資料更新成功！"); } else alert(res.message);
    setLoading(false);
  };

  const getProductName = (id: string) => {
    const p = products.find(item => String(item['商品id']) === String(id));
    return p ? p['商品名稱'] : `商品 ID: ${id}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-12">
      <div className="bg-white rounded-[4rem] p-12 border shadow-2xl animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row items-center gap-10 mb-12 border-b pb-10 border-slate-50">
          <div className="w-32 h-32 bg-orange-100 rounded-[2.5rem] flex items-center justify-center text-orange-600 relative shadow-inner"><UserCircle className="w-20 h-20" /><div className="absolute -bottom-2 -right-2 bg-white border p-2 rounded-xl shadow-md text-slate-400"><Settings className="w-5 h-5" /></div></div>
          <div className="flex-1 text-center md:text-left"><p className="text-orange-600 font-black text-xs uppercase tracking-widest mb-2">會員檔案</p><h1 className="text-5xl font-black text-slate-900 mb-2">{formData['會員名稱']}</h1><span className="bg-slate-100 px-4 py-1.5 rounded-full text-xs font-bold text-slate-500 border border-slate-200">ID: {formData['會員id']}</span></div>
          <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} disabled={loading} className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black transition-all ${isEditing ? 'bg-orange-600 text-white' : 'bg-slate-900 text-white hover:bg-orange-600'}`}>{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isEditing ? '儲存變更' : '編輯資料'}</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
          <div><label className="flex items-center gap-2 text-xs font-black text-slate-400 mb-2 uppercase tracking-widest"><UserCheck className="w-4 h-4" /> 會員名稱</label><input type="text" disabled={!isEditing} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-500" value={formData['會員名稱']} onChange={e=>setFormData({...formData, '會員名稱': e.target.value})} /></div>
          <div><label className="flex items-center gap-2 text-xs font-black text-slate-400 mb-2 uppercase tracking-widest"><Mail className="w-4 h-4" /> 電子郵件</label><input type="email" disabled={!isEditing} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-500" value={formData['會員帳號']} onChange={e=>setFormData({...formData, '會員帳號': e.target.value})} /></div>
          <div><label className="flex items-center gap-2 text-xs font-black text-slate-400 mb-2 uppercase tracking-widest"><Phone className="w-4 h-4" /> 手機號碼</label><input type="tel" disabled={!isEditing} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-500" value={formatPhoneDisplay(formData['手機號碼'])} onChange={e=>setFormData({...formData, '手機號碼': e.target.value})} /></div>
          <div><label className="flex items-center gap-2 text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">出生年月</label><BirthdayInput disabled={!isEditing} value={formData['生日'] || ''} onChange={val => setFormData({...formData, '生日': val})} /></div>
        </div>
      </div>
      <div className="space-y-6 animate-in slide-in-from-bottom duration-700">
        <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3"><ShoppingBag className="w-8 h-8 text-orange-600" /> 歷史訂購紀錄</h2>
        {loadingSales ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
        ) : sales.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-20 text-center border border-slate-100 shadow-sm"><Package className="w-16 h-16 text-slate-100 mx-auto mb-6 opacity-30" /><p className="text-slate-400 font-bold uppercase tracking-widest text-sm">尚無任何訂單紀錄</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sales.map((sale, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col gap-4 group hover:border-orange-200 transition-all hover:shadow-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      {sale['售出日期'] ? new Date(sale['售出日期']).toLocaleDateString() : '日期不詳'}
                    </p>
                    <h4 className="font-black text-slate-800 text-lg">訂單編號 #{String(idx+1).padStart(4, '0')}</h4>
                  </div>
                  <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[10px] font-black border border-green-100">已付款</span>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
                   <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">購買品項</p>
                      <p className="font-black text-slate-900 truncate text-sm">{getProductName(sale['商品id'])}</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-1">數量: {Number(sale['數量'] || 0)}</p>
                   </div>
                   <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">總計</p>
                      <p className="text-lg font-black text-orange-600">NT$ {Number(sale['總計'] || 0).toLocaleString()}</p>
                   </div>
                </div>
                <div className="flex items-start gap-2 text-[10px] text-slate-400 bg-slate-50/50 p-2 rounded-xl">
                   <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                   <p className="line-clamp-1">配送：{sale['地址'] || '未填寫地址'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <Router>
    <AppContent />
  </Router>
);
export default App;
