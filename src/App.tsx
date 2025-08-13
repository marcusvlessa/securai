
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import SideNavigation from './components/SideNavigation';
import Dashboard from './pages/Dashboard';
import OccurrenceAnalysis from './pages/OccurrenceAnalysis';
import InvestigationReport from './pages/InvestigationReport';
import LinkAnalysis from './pages/LinkAnalysis';
import AudioAnalysis from './pages/AudioAnalysis';
import ImageAnalysis from './pages/ImageAnalysis';
import CaseManagement from './pages/CaseManagement';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
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
    <BrowserRouter>
      <CaseProvider>
        <div className="flex h-screen bg-gray-100 dark:bg-gray-950">
          <SideNavigation />
          <div className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/occurrence-analysis" element={<OccurrenceAnalysis />} />
              <Route path="/investigation-report" element={<InvestigationReport />} />
              <Route path="/link-analysis" element={<LinkAnalysis />} />
              <Route path="/audio-analysis" element={<AudioAnalysis />} />
              <Route path="/image-analysis" element={<ImageAnalysis />} />
              <Route path="/case-management" element={<CaseManagement />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
        <Toaster />
      </CaseProvider>
    </BrowserRouter>
  );
}

export default App;
