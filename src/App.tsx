import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { SidebarProvider, SidebarTrigger } from './components/ui/sidebar';
import { AppSidebar } from './components/AppSidebar';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Index from './pages/Index';
import { AdminPanel } from './pages/AdminPanel';
import Dashboard from './pages/Dashboard';
import OccurrenceAnalysis from './pages/OccurrenceAnalysis';
import InvestigationReport from './pages/InvestigationReport';
import LinkAnalysis from './pages/LinkAnalysis';
import AudioAnalysis from './pages/AudioAnalysis';
import ImageAnalysis from './pages/ImageAnalysis';
import CaseManagement from './pages/CaseManagement';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';
import VirtualAgents from './pages/VirtualAgents';
import FinancialAnalysis from './pages/FinancialAnalysis';
import { CaseProvider } from './contexts/CaseContext';
import { getGroqSettings, saveGroqSettings } from './services/groqService';
import TestPage from './pages/TestPage';
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
        groqModel: 'meta-llama/llama-4-scout-17b-16e-instruct', // Modelo correto
        model: 'meta-llama/llama-4-scout-17b-16e-instruct', // Modelo correto para análise
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

  const ProtectedLayout = ({ children }: { children: React.ReactNode }) => (
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
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );

  return (
    <ThemeProvider defaultTheme="light" storageKey="securai-theme">
      <BrowserRouter>
        <AuthProvider>
          <CaseProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
              
              {/* Protected routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <ProtectedLayout>
                    <Dashboard />
                  </ProtectedLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/app" element={
                <ProtectedRoute>
                  <ProtectedLayout>
                    <Dashboard />
                  </ProtectedLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                  <ProtectedLayout>
                    <AdminPanel />
                  </ProtectedLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/settings" element={
                <ProtectedRoute>
                  <ProtectedLayout>
                    <Settings />
                  </ProtectedLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/case-management" element={
                <ProtectedRoute requiredRole="investigator">
                  <ProtectedLayout>
                    <CaseManagement />
                  </ProtectedLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/investigation-report" element={
                <ProtectedRoute requiredRole="investigator">
                  <ProtectedLayout>
                    <InvestigationReport />
                  </ProtectedLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/image-analysis" element={
                <ProtectedRoute>
                  <ProtectedLayout>
                    <ImageAnalysis />
                  </ProtectedLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/audio-analysis" element={
                <ProtectedRoute>
                  <ProtectedLayout>
                    <AudioAnalysis />
                  </ProtectedLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/financial-analysis" element={
                <ProtectedRoute>
                  <ProtectedLayout>
                    <FinancialAnalysis />
                  </ProtectedLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/link-analysis" element={
                <ProtectedRoute>
                  <ProtectedLayout>
                    <LinkAnalysis />
                  </ProtectedLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/occurrence-analysis" element={
                <ProtectedRoute>
                  <ProtectedLayout>
                    <OccurrenceAnalysis />
                  </ProtectedLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/virtual-agents" element={
                <ProtectedRoute>
                  <ProtectedLayout>
                    <VirtualAgents />
                  </ProtectedLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/test" element={<TestPage />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </CaseProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;