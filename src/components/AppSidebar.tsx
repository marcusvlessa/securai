import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  FileText, 
  Folder, 
  Link, 
  Image, 
  AudioWaveform, 
  Settings, 
  Shield,
  Bot,
  BarChartHorizontal,
  DollarSign
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from './ui/sidebar';
import { useCase } from '../contexts/CaseContext';
import { Badge } from './ui/badge';

const navItems = [
  { 
    name: 'Dashboard', 
    path: '/app', 
    icon: Shield, 
    description: 'Visão geral dos casos'
  },
  { 
    name: 'Análise de Ocorrência', 
    path: '/occurrence-analysis', 
    icon: FileText, 
    description: 'Análise de documentos'
  },
  { 
    name: 'Análise de Vínculo', 
    path: '/link-analysis', 
    icon: Link, 
    description: 'Mapeamento de relacionamentos'
  },
  { 
    name: 'Agentes Virtuais', 
    path: '/virtual-agents', 
    icon: Bot, 
    description: 'IA automatizada'
  },
  { 
    name: 'Relatório de Investigação', 
    path: '/investigation-report', 
    icon: BarChartHorizontal, 
    description: 'Relatórios detalhados'
  },
  { 
    name: 'Análise de Áudio', 
    path: '/audio-analysis', 
    icon: AudioWaveform, 
    description: 'Transcrição e análise'
  },
  { 
    name: 'Análise de Imagem', 
    path: '/image-analysis', 
    icon: Image, 
    description: 'OCR e detecção'
  },
  { 
    name: 'Análise Financeira', 
    path: '/financial-analysis', 
    icon: DollarSign, 
    description: 'RIF/COAF red flags'
  },
  { 
    name: 'Gerenciamento de Casos', 
    path: '/case-management', 
    icon: Folder, 
    description: 'CRUD de casos'
  },
  { 
    name: 'Análise Instagram', 
    path: '/instagram-analysis', 
    icon: Image, 
    description: 'Dados exportados do Instagram'
  },
];

const settingsItems = [
  { 
    name: 'Configurações', 
    path: '/settings', 
    icon: Settings, 
    description: 'Preferências do sistema'
  },
  { 
    name: 'Admin', 
    path: '/admin', 
    icon: Shield, 
    description: 'Painel de administração'
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { currentCase } = useCase();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => {
    if (path === '/app') {
      return currentPath === '/app';
    }
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
            <Shield className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold">Secur:AI</p>
              <p className="text-xs text-muted-foreground">v1.0.0</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Current Case Info */}
        {currentCase && !collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>Caso Atual</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-sm font-medium truncate">{currentCase.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {currentCase.status || 'Ativo'}
                  </Badge>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Análises</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const active = isActive(item.path);
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink 
                        to={item.path}
                        className="flex items-center gap-3 px-3 py-2 text-sm"
                      >
                        <IconComponent className="h-4 w-4" />
                        {!collapsed && (
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{item.name}</span>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.description}
                            </p>
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                const IconComponent = item.icon;
                const active = isActive(item.path);
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink 
                        to={item.path}
                        className="flex items-center gap-3 px-3 py-2 text-sm"
                      >
                        <IconComponent className="h-4 w-4" />
                        {!collapsed && (
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{item.name}</span>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.description}
                            </p>
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}