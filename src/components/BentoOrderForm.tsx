import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BENTO_MENU } from '../constants';
import { Bento, OrderItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, User, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const BentoOrderForm: React.FC = () => {
  const [customerName, setCustomerName] = useState('');
  const [selectedBentoId, setSelectedBentoId] = useState(BENTO_MENU[0].id);
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  const selectedBento = BENTO_MENU.find(b => b.id === selectedBentoId)!;
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const addToCart = () => {
    const existingIndex = cart.findIndex(item => item.bentoName === selectedBento.name);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += quantity;
      setCart(newCart);
    } else {
      setCart([...cart, {
        bentoName: selectedBento.name,
        price: selectedBento.price,
        quantity: quantity
      }]);
    }
    setQuantity(1);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('請輸入姓名');
      return;
    }
    if (cart.length === 0) {
      setError('請至少加入一個便當到清單');
      return;
    }

    setLoading(true);
    setError(null);

    const orderData = {
      customerName,
      items: cart,
      totalPrice,
      orderDate: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'orders'), orderData);
      setSuccess(true);
      setCustomerName('');
      setCart([]);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'orders');
      setError('訂單提交失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl shadow-xl space-y-6 border border-gray-100">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800">日日米香 訂餐</h2>
        <p className="text-sm text-gray-500 font-medium">{today}</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <User size={16} /> 訂購人姓名
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="請輸入您的姓名"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">選擇便當</label>
            <select
              value={selectedBentoId}
              onChange={(e) => setSelectedBentoId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-orange-500"
            >
              {BENTO_MENU.map((bento) => (
                <option key={bento.id} value={bento.id}>
                  {bento.name} - ${bento.price}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-semibold text-gray-700">數量</label>
              <div className="flex items-center justify-between border border-gray-200 rounded-xl px-2 py-1 bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center font-bold"
                >
                  -
                </button>
                <span className="font-bold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>
            
            <button
              onClick={addToCart}
              className="mt-6 p-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors shadow-sm"
              title="加入訂購清單"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>

        {/* Cart Review Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">訂購清單</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            <AnimatePresence mode='popLayout'>
              {cart.map((item, idx) => (
                <motion.div
                  key={`${item.bentoName}-${idx}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center justify-between bg-white border border-gray-100 p-3 rounded-xl shadow-sm"
                >
                  <div className="flex-1">
                    <div className="font-bold text-gray-800">{item.bentoName}</div>
                    <div className="text-xs text-gray-500">${item.price} × {item.quantity} 份</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-orange-600">${item.price * item.quantity}</span>
                    <button
                      onClick={() => removeFromCart(idx)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {cart.length === 0 && (
              <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl text-gray-300 text-sm italic">
                尚未加入任何便當
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-600 font-medium text-lg">總計金額</span>
            <span className="text-3xl font-black text-orange-600">${totalPrice}</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-white transition-all ${
              loading || cart.length === 0 ? 'bg-orange-300 pointer-events-none' : 'bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-200'
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShoppingCart size={20} />
                確認送出訂單
              </>
            )}
          </motion.button>
        </div>
      </div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg justify-center font-medium"
        >
          <CheckCircle2 size={18} /> 訂購成功！
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg justify-center font-medium"
        >
          <AlertCircle size={18} /> {error}
        </motion.div>
      )}
    </div>
  );
};
