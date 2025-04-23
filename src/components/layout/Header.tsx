'use client';

import React, { useState } from 'react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/Button';

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function Header({ user }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      {/* Título da página atual (pode ser dinâmico) */}
      <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>

      {/* Menu do usuário */}
      <div className="relative">
        <button
          className="flex items-center space-x-2 focus:outline-none"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || 'Usuário'}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <span>{user.name?.charAt(0) || user.email?.charAt(0) || 'U'}</span>
            )}
          </div>
          <span className="text-sm font-medium">{user.name || user.email}</span>
        </button>

        {/* Dropdown */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <div className="py-1">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Sair
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
} 