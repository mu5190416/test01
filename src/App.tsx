/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { BentoOrderForm } from './components/BentoOrderForm';
import { AdminOrders } from './components/AdminOrders';
import { LayoutDashboard, ShoppingBag, Settings } from 'lucide-react';
import { motion } from 'motion/react';

type ViewMode = 'user' | 'admin';

export default function App() {
  const [mode, setMode] = useState<ViewMode>('user');

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-gray-900 font-sans selection:bg-orange-100 italic-serif">
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black italic">米</div>
            <span className="font-black text-xl tracking-tighter">日日米香</span>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setMode('user')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                mode === 'user' 
                  ? 'bg-white text-orange-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ShoppingBag size={16} />
              我要訂餐
            </button>
            <button
              onClick={() => setMode('admin')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                mode === 'admin' 
                  ? 'bg-white text-orange-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings size={16} />
              後台管理
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-12 px-6">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {mode === 'user' ? (
            <div className="space-y-8">
              <div className="text-center max-w-xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
                  美味便當，<br/><span className="text-orange-500 underline decoration-orange-200 underline-offset-8">日日為您準備</span>
                </h1>
                <p className="text-gray-500 font-medium">選好你的午餐，我們幫你送到手裡。</p>
              </div>
              <BentoOrderForm />
            </div>
          ) : (
            <AdminOrders />
          )}
        </motion.div>
      </main>

      <footer className="py-12 border-t border-gray-100 text-center">
        <div className="flex justify-center items-center gap-6 mb-4 grayscale opacity-30">
          {/* Logo placeholders or small icons */}
          <div className="font-black italic text-xl uppercase tracking-widest">daily rice</div>
        </div>
        <p className="text-gray-400 text-xs font-bold tracking-widest uppercase">
          © 2024 日日米香便當團購系統
        </p>
      </footer>
    </div>
  );
}
