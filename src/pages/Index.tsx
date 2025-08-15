import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Landing from "./Landing";

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);
  
  if (!user) {
    return <Landing />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Bem-vindo ao Secur:AI</h1>
          <Button onClick={signOut} variant="outline">
            Sair
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link to="/dashboard" className="group">
            <div className="p-6 bg-card rounded-lg border hover:border-primary/50 transition-colors">
              <h2 className="text-xl font-semibold mb-2 group-hover:text-primary">Dashboard</h2>
              <p className="text-muted-foreground">Visão geral do sistema e estatísticas</p>
            </div>
          </Link>
          
          <Link to="/case-management" className="group">
            <div className="p-6 bg-card rounded-lg border hover:border-primary/50 transition-colors">
              <h2 className="text-xl font-semibold mb-2 group-hover:text-primary">Gestão de Casos</h2>
              <p className="text-muted-foreground">Gerenciar casos e investigações</p>
            </div>
          </Link>
          
          <Link to="/image-analysis" className="group">
            <div className="p-6 bg-card rounded-lg border hover:border-primary/50 transition-colors">
              <h2 className="text-xl font-semibold mb-2 group-hover:text-primary">Análise de Imagens</h2>
              <p className="text-muted-foreground">Análise forense de evidências visuais</p>
            </div>
          </Link>
          
          <Link to="/audio-analysis" className="group">
            <div className="p-6 bg-card rounded-lg border hover:border-primary/50 transition-colors">
              <h2 className="text-xl font-semibold mb-2 group-hover:text-primary">Análise de Áudio</h2>
              <p className="text-muted-foreground">Processamento de evidências sonoras</p>
            </div>
          </Link>
          
          <Link to="/financial-analysis" className="group">
            <div className="p-6 bg-card rounded-lg border hover:border-primary/50 transition-colors">
              <h2 className="text-xl font-semibold mb-2 group-hover:text-primary">Análise Financeira</h2>
              <p className="text-muted-foreground">Investigação de transações financeiras</p>
            </div>
          </Link>
          
          <Link to="/virtual-agents" className="group">
            <div className="p-6 bg-card rounded-lg border hover:border-primary/50 transition-colors">
              <h2 className="text-xl font-semibold mb-2 group-hover:text-primary">Agentes Virtuais</h2>
              <p className="text-muted-foreground">Assistentes de IA especializados</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;