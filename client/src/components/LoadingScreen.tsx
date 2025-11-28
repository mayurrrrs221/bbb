import React from 'react';
import { Sparkles } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-2xl mb-6 animate-bounce">
          <Sparkles className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Finote</h1>
        <p className="text-blue-100">Loading your financial dashboard...</p>
        <div className="mt-6 flex justify-center gap-2">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <div
            className="w-3 h-3 bg-white rounded-full animate-pulse"
            style={{ animationDelay: '0.2s' }}
          ></div>
          <div
            className="w-3 h-3 bg-white rounded-full animate-pulse"
            style={{ animationDelay: '0.4s' }}
          ></div>
        </div>
      </div>
    </div>
  );
}
