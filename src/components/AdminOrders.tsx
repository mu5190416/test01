import React, { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  writeBatch, 
  getDocs, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, TrendingUp, Users, Calendar, LogIn, Lock, Eraser, AlertCircle, Plus, ShieldCheck } from 'lucide-react';

const SUPER_ADMIN = 'tea061101@gmail.com';

export const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [admins, setAdmins] = useState<{id: string, email: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setIsAdminUser(false);
      return;
    }

    if (currentUser.email === SUPER_ADMIN) {
      setIsAdminUser(true);
      return;
    }

    // Check if user is in admins collection
    const checkAdminStatus = async () => {
      try {
        // We use the email as the document ID
        const adminDoc = await getDocs(query(collection(db, 'admins')));
        const adminList = adminDoc.docs.map(d => ({ id: d.id, email: d.data().email }));
        const isAuthorized = adminList.some(a => a.email === currentUser.email);
        setIsAdminUser(isAuthorized);
      } catch (e) {
        console.error("Error checking admin status:", e);
        setIsAdminUser(false);
      }
    };
    checkAdminStatus();
  }, [currentUser]);

  useEffect(() => {
    if (!isAdminUser) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore orders error:", error);
      setLoginError('無法讀取資料，權限不足或連線逾時');
      setLoading(false);
    });

    // Also sync admins list for the management UI if super admin
    let unsubscribeAdmins: () => void = () => {};
    if (currentUser?.email === SUPER_ADMIN) {
      const qAdmins = query(collection(db, 'admins'), orderBy('addedAt', 'desc'));
      unsubscribeAdmins = onSnapshot(qAdmins, (snapshot) => {
        setAdmins(snapshot.docs.map(d => ({ id: d.id, email: d.data().email })));
      }, (err) => {
          console.error("Admin list sync error:", err);
      });
    }

    return () => {
      unsubscribe();
      unsubscribeAdmins();
    };
  }, [isAdminUser, currentUser]);

  const handleLogin = async () => {
    setLoginError(null);
    const provider = new GoogleAuthProvider();
    try {
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      // After login, the useEffect will re-check isAdminUser
    } catch (error: any) {
      console.error('Login failed', error);
      setLoginError('登入時發生錯誤，請稍後再試');
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToAdd = newAdminEmail.trim().toLowerCase();
    if (!emailToAdd || !emailToAdd.includes('@')) return;
    
    try {
      // Use email as doc ID to make exists check easy in rules
      const adminRef = doc(db, 'admins', emailToAdd);
      await setDoc(adminRef, {
        email: emailToAdd,
        addedAt: serverTimestamp()
      });
      setNewAdminEmail('');
      alert(`已成功授權 ${emailToAdd}`);
    } catch (err: any) {
      console.error("Add admin error:", err);
      alert('新增失敗：' + (err.message || '權限不足'));
    }
  };

  const handleRemoveAdmin = async (id: string) => {
    if (!window.confirm(`確定要移除此管理員權限嗎？`)) return;
    try {
      await deleteDoc(doc(db, 'admins', id));
    } catch (err: any) {
      alert('移除失敗：' + (err.message || '權限不足'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('確定要刪除這筆訂單嗎？')) return;
    try {
      await deleteDoc(doc(db, 'orders', id));
    } catch (err: any) {
      console.error("Delete order error:", err);
      alert('刪除失敗：' + (err.message || '權限不足'));
    }
  };

  const handleClearAll = async () => {
    if (orders.length === 0) return;
    if (!window.confirm('⚠️ 警告：確定要清除「所有」訂單資料嗎？此動作無法復原。')) return;
    
    setIsClearing(true);
    try {
      const q = query(collection(db, 'orders'));
      const snapshot = await getDocs(q);
      const batchSize = 500;
      let count = 0;
      
      // Handle batches if there are many orders
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = snapshot.docs.slice(i, i + batchSize);
        chunk.forEach((d) => {
          batch.delete(doc(db, 'orders', d.id));
          count++;
        });
        await batch.commit();
      }
      
      alert(`已成功刪除 ${count} 筆訂單資料`);
    } catch (err: any) {
      console.error("Clear all error:", err);
      alert('清除失敗：' + (err.message || '權限不足'));
    } finally {
      setIsClearing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Login Screen
  if (!currentUser || !isAdminUser) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl shadow-xl border border-gray-100 text-center space-y-6">
        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto text-orange-500">
          <Lock size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">管理員驗證</h2>
          <p className="text-gray-500 mt-2">請使用管理員帳號登入系統</p>
        </div>
        
        {loginError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm text-left">
            <AlertCircle size={16} className="shrink-0" />
            <span>{loginError}</span>
          </div>
        )}

        <button
          onClick={handleLogin}
          className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95"
        >
          <LogIn size={20} />
          使用 Google 登入
        </button>

        {currentUser && !isAdminUser && (
           <div className="p-4 bg-red-50 rounded-2xl">
             <p className="text-sm text-red-600 font-bold mb-1">權限受限</p>
             <p className="text-xs text-red-500">您的帳號 {currentUser.email} 未具備管理權限</p>
           </div>
        )}
        
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          Authorized Access Only
        </p>
      </div>
    );
  }

  // Dashboard calculations
  const totalAmount = orders.reduce((sum, order) => sum + order.totalPrice, 0);
  const itemStats: { [key: string]: number } = {};
  orders.forEach(order => {
    (order.items || []).forEach(item => {
      itemStats[item.bentoName] = (itemStats[item.bentoName] || 0) + item.quantity;
    });
  });
  const totalCount = Object.values(itemStats).reduce((sum, count) => sum + count, 0);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded text-[10px] font-black uppercase">Live Data</div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">後台管理中心</h1>
          </div>
          <div className="flex items-center gap-2 text-gray-500 font-medium">
             <Users size={16} />
             <span>{currentUser.email}</span>
             {currentUser.email === SUPER_ADMIN && (
               <span className="px-2 py-0.5 bg-gray-900 text-white text-[10px] rounded-full uppercase font-bold">Super</span>
             )}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 min-w-[120px] shadow-sm">
            <div className="flex items-center gap-2 text-orange-500 mb-1">
              <TrendingUp size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">總營業額</span>
            </div>
            <div className="text-2xl font-black text-gray-900">${totalAmount}</div>
          </div>
          
          <div className="bg-white p-4 rounded-2xl border border-gray-100 min-w-[120px] shadow-sm">
            <div className="flex items-center gap-2 text-blue-500 mb-1">
              <Users size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">總份數</span>
            </div>
            <div className="text-2xl font-black text-gray-900">{totalCount}</div>
          </div>

          <button
            onClick={handleClearAll}
            disabled={isClearing || orders.length === 0}
            className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
              orders.length === 0 
                ? 'bg-gray-50 text-gray-300 border-gray-100' 
                : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-200'
            }`}
          >
            <Eraser size={20} className={isClearing ? 'animate-pulse' : ''} />
            <span className="text-[10px] font-black uppercase tracking-tighter">清除全部</span>
          </button>
        </div>
      </div>

      {/* Super Admin section for managing other admins */}
      {currentUser.email === SUPER_ADMIN && (
        <div className="bg-gray-900 text-white p-6 md:p-8 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <ShieldCheck size={120} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="font-black text-xl tracking-tight leading-none mb-1">管理員權限控制</h3>
                <p className="text-gray-400 text-sm font-medium">您可以新增或移除協助管理的人員</p>
              </div>
            </div>

            <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="輸入要授權的 Gmail 地址"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-gray-600"
                required
              />
              <button
                type="submit"
                className="px-8 py-4 bg-orange-500 hover:bg-orange-600 active:scale-95 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                新增授權
              </button>
            </form>

            <div className="mt-8">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">目前授權名單</p>
              <div className="flex flex-wrap gap-2">
                {admins.map((admin) => (
                  <div key={admin.id} className="flex items-center gap-3 bg-gray-800 border border-gray-700 pl-4 pr-2 py-2 rounded-xl text-sm group hover:border-gray-600 transition-colors">
                    <span className="font-medium text-gray-300">{admin.email}</span>
                    <button
                      onClick={() => handleRemoveAdmin(admin.id)}
                      className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {admins.length === 0 && (
                  <div className="w-full p-4 bg-gray-800/50 rounded-2xl text-center">
                    <p className="text-gray-500 text-xs italic">目前尚無其他協助管理者</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Summary Grid */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp size={12} /> 當日統計
            </h3>
            <span className="text-[10px] font-bold text-gray-400">{orders.length} 筆訂單</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Object.entries(itemStats).map(([name, count]) => (
            <div key={name} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-orange-100 hover:bg-orange-50/30 transition-all group">
              <div className="text-[10px] text-gray-400 font-bold truncate mb-1 uppercase tracking-tighter">{name}</div>
              <div className="text-2xl font-black text-gray-900 flex items-baseline gap-1">
                {count} 
                <span className="text-xs font-medium text-gray-400">份</span>
              </div>
            </div>
          ))}
          {Object.keys(itemStats).length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-300 font-medium italic border-2 border-dashed border-gray-50 rounded-3xl">
              尚無訂單統計資料
            </div>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest pl-8">訂購人</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">訂單內容</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">小計</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">日期</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right pr-8">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence mode='popLayout'>
                {orders.map((order) => (
                  <motion.tr
                    key={order.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="px-6 py-6 align-top pl-8">
                      <div className="flex flex-col">
                        <span className="font-black text-gray-900 border-l-4 border-orange-500 pl-4">{order.customerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 align-top">
                      <div className="space-y-2">
                        {(order.items || []).map((item, i) => (
                          <div key={i} className="text-sm flex items-center gap-3">
                             <div className="w-1 h-1 bg-gray-200 rounded-full" />
                             <span className="text-gray-700 font-semibold">{item.bentoName}</span>
                             <span className="px-2 py-0.5 bg-gray-100 text-gray-500 font-bold text-[10px] rounded-md">×{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-6 align-top text-right pr-4">
                      <div className="font-black text-gray-900 text-xl tracking-tighter">${order.totalPrice}</div>
                    </td>
                    <td className="px-6 py-6 align-top">
                      <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                        <Calendar size={12} className="text-gray-300" />
                        {order.orderDate}
                      </div>
                    </td>
                    <td className="px-6 py-6 align-top text-right pr-8">
                      <button
                        onClick={() => handleDelete(order.id!)}
                        className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-90"
                        title="刪除訂單"
                      >
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              
              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-300">
                        <Eraser size={48} className="opacity-20" />
                        <p className="font-bold italic">目前的清單空空如也</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
