'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AuthScreen from '../components/AuthScreen';
import Dashboard from '../components/Dashboard';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-white h-full">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="mt-4 text-sm text-gray-500 font-semibold animate-pulse">Menghubungkan...</p>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen onAuthSuccess={(newSession) => setSession(newSession)} />;
  }

  return <Dashboard session={session} onLogout={() => setSession(null)} />;
}
