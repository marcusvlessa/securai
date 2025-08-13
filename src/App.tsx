
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { SidebarProvider, SidebarTrigger } from './components/ui/sidebar';
import { AppSidebar } from './components/AppSidebar';
import { ThemeProvider } from './components/ThemeProvider';
import Dashboard from './pages/Dashboard';
import OccurrenceAnalysis from './pages/OccurrenceAnalysis';
import InvestigationReport from './pages/InvestigationReport';
import LinkAnalysis from './pages/LinkAnalysis';
import AudioAnalysis from './pages/AudioAnalysis';
import ImageAnalysis from './pages/ImageAnalysis';
import CaseManagement from './pages/CaseManagement';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import VirtualAgents from './pages/VirtualAgents';
import FinancialAnalysis from './pages/FinancialAnalysis';
import { CaseProvider } from './contexts/CaseContext';
import { getGroqSettings, saveGroqSettings } from './services/groqService';
import './index.css';

function App() {
  // Initialize default API settings if not already set
  useEffect(() => {
    // Check if API settings are already set
    if (!localStorage.getItem('securai-api-settings')) {
      // Set default endpoints if not configured
      saveGroqSettings({
        groqApiKey: '',  // Configurado pelo usuário na página de Configurações
        groqApiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
        groqModel: 'meta-llama/llama-4-scout-17b-16e-instruct', // Updated to requested default model
        model: 'llama-3.2-90b-vision-preview', // Modelo para análise de imagens
        whisperModel: 'whisper-large-v3',  // Versão mais recente do modelo
        whisperApiEndpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
        language: 'pt'  // Configuração padrão para português
      });
      
      console.log('Configurações padrão da API GROQ inicializadas');
    } else {
      // If settings already exist, log them
      const settings = getGroqSettings();
      console.log('API GROQ já configurada. Modelo atual:', settings.groqModel);
    }
  }, []);

  return (
    <ThemeProvider defaultTheme="light" storageKey="securai-theme">
      <BrowserRouter>
        <CaseProvider>
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <AppSidebar />
              
              <div className="flex-1 flex flex-col">
                <header className="h-14 flex items-center justify-between border-b px-4 lg:px-6">
                  <div className="flex items-center gap-2">
                    <SidebarTrigger />
                    <h1 className="font-semibold text-lg">Secur:AI</h1>
                  </div>
                </header>
                
                <main className="flex-1 overflow-auto">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/occurrence-analysis" element={<OccurrenceAnalysis />} />
                    <Route path="/investigation-report" element={<InvestigationReport />} />
                    <Route path="/link-analysis" element={<LinkAnalysis />} />
                    <Route path="/virtual-agents" element={<VirtualAgents />} />
                    <Route path="/audio-analysis" element={<AudioAnalysis />} />
                    <Route path="/image-analysis" element={<ImageAnalysis />} />
                    <Route path="/financial-analysis" element={<FinancialAnalysis />} />
                    <Route path="/case-management" element={<CaseManagement />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </div>
            </div>
            <Toaster />
          </SidebarProvider>
        </CaseProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
