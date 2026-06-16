'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Wallet, Eye, EyeOff, Loader2 } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (session: any) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [namaLengkap, setNamaLengkap] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const toggleAuthMode = () => {
    setIsRegister(!isRegister);
    setErrorMsg('');
    setUsername('');
    setPassword('');
    setNamaLengkap('');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username || !password || (isRegister && !namaLengkap)) {
      setErrorMsg('Semua kolom harus diisi!');
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const virtualEmail = `${cleanUsername}@dompetku.local`;

    setLoading(true);

    try {
      if (isRegister) {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email: virtualEmail,
          password: password,
          options: {
            data: {
              username: cleanUsername,
              nama_lengkap: namaLengkap,
            },
          },
        });

        if (error) throw error;

        // Autologin after registration or show success
        if (data.session) {
          onAuthSuccess(data.session);
        } else {
          // Sometimes email needs confirmation, but on virtual emails we sign in immediately
          const { data: logData, error: logError } = await supabase.auth.signInWithPassword({
            email: virtualEmail,
            password: password,
          });
          if (logError) throw logError;
          onAuthSuccess(logData.session);
        }
      } else {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: virtualEmail,
          password: password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Username atau password salah!');
          }
          throw error;
        }

        onAuthSuccess(data.session);
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page active flex flex-col justify-center px-8 bg-white h-full z-50 absolute w-full pb-0 select-none">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-4xl mb-4 transform rotate-12 transition-transform hover:scale-105 duration-300">
          <Wallet className="w-10 h-10 -rotate-12" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dompetku</h1>
        <p className="text-gray-500 text-sm mt-2">Kelola keuangan Anda dengan elegan.</p>
      </div>

      <form onSubmit={handleAuth} className="space-y-4">
        {isRegister && (
          <div>
            <input
              type="text"
              placeholder="Nama Lengkap"
              value={namaLengkap}
              onChange={(e) => setNamaLengkap(e.target.value)}
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
              required
            />
          </div>
        )}

        <div>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
            required
          />
        </div>

        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {errorMsg && (
          <p className="text-rose-500 text-xs font-semibold px-2 animate-pulse">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full ${
            isRegister ? 'bg-slate-900 hover:bg-black' : 'bg-indigo-600 hover:bg-indigo-700'
          } text-white p-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2`}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isRegister ? (
            'Buat Akun'
          ) : (
            'Masuk'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        {isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}
        <span
          className="text-indigo-600 font-bold cursor-pointer hover:underline"
          onClick={toggleAuthMode}
        >
          {isRegister ? 'Masuk' : 'Daftar Disini'}
        </span>
      </p>
    </div>
  );
}
