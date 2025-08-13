
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FileText, 
  Folder, 
  Link, 
  Image, 
  AudioWaveform, 
  Database, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';
import { useCase } from '../contexts/CaseContext';

const SideNavigation = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { currentCase } = useCase();

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: <Shield className="h-5 w-5" /> },
    { name: 'Análise de Ocorrência', path: '/occurrence-analysis', icon: <FileText className="h-5 w-5" /> },
    { name: 'Relatório de Investigação', path: '/investigation-report', icon: <FileText className="h-5 w-5" /> },
    { name: 'Análise de Vínculo', path: '/link-analysis', icon: <Link className="h-5 w-5" /> },
    { name: 'Análise de Áudio', path: '/audio-analysis', icon: <AudioWaveform className="h-5 w-5" /> },
    { name: 'Análise de Imagem', path: '/image-analysis', icon: <Image className="h-5 w-5" /> },
    { name: 'Gerenciamento de Casos', path: '/case-management', icon: <Folder className="h-5 w-5" /> },
    { name: 'Configurações', path: '/settings', icon: <Settings className="h-5 w-5" /> },
  ];

  return (
    <div 
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-width duration-300 flex flex-col`}
    >
      <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        {!collapsed && (
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Secur:AI</h1>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <div className="flex-1 py-4">
        {currentCase && !collapsed && (
          <div className="px-4 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-md">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Caso Atual:</p>
              <p className="text-sm truncate">{currentCase.title}</p>
            </div>
          </div>
        )}

        <nav className="space-y-1 px-2">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-md transition-colors
                ${isActive 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                  : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800'
                }`
              }
            >
              <span className="mr-3">{link.icon}</span>
              {!collapsed && <span>{link.name}</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        {!collapsed && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Secur:AI v1.0.0
          </div>
        )}
      </div>
    </div>
  );
};

export default SideNavigation;
