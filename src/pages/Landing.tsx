import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, BarChart, FileSearch } from "lucide-react";

const Landing = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      // TODO: Implement Supabase authentication
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Login realizado com sucesso!",
        description: "Redirecionando para o sistema...",
      });
      
      // Redirect to main application
      window.location.href = "/dashboard";
    } catch (error) {
      toast({
        title: "Erro no login",
        description: "Verifique suas credenciais e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      // TODO: Implement Supabase registration
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Conta criada com sucesso!",
        description: "Faça login para acessar o sistema.",
      });
    } catch (error) {
      toast({
        title: "Erro no cadastro",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-foreground mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Secur:AI
            </h1>
            <p className="text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Sistema inteligente de análise criminal com IA avançada para investigações e gerenciamento de casos
            </p>
          </div>
          <div className="text-lg text-muted-foreground/80 max-w-2xl mx-auto">
            <p>Revolucionando investigações criminais com inteligência artificial de última geração. 
            Análise automática de evidências, relatórios inteligentes e colaboração em tempo real.</p>
          </div>
        </header>

        {/* Features Section */}
        <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card className="hover:shadow-lg transition-shadow duration-300 border-muted/50">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Análise Segura</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center leading-relaxed">
                Processamento seguro de dados sensíveis com criptografia avançada e conformidade total com padrões de segurança
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-muted/50">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <FileSearch className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">IA Inteligente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center leading-relaxed">
                Análise automática de documentos, imagens e áudios com modelos de IA de última geração para insights precisos
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-muted/50">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <BarChart className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Relatórios Inteligentes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center leading-relaxed">
                Geração automática de relatórios detalhados com análises estatísticas e visualizações interativas
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-muted/50">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Colaboração Segura</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center leading-relaxed">
                Trabalho em equipe com controle granular de acesso, permissões e auditoria completa de atividades
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Authentication Section */}
        <section className="max-w-lg mx-auto">
          <Card className="shadow-xl border-muted/30">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl mb-2">Acesso ao Sistema</CardTitle>
              <CardDescription className="text-lg">
                Entre com suas credenciais ou solicite acesso autorizado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Link to="/auth/login" className="w-full">
                <Button className="w-full h-12 text-lg font-medium" size="lg">
                  🔐 Acessar Sistema
                </Button>
              </Link>
              <Link to="/auth/register" className="w-full">
                <Button variant="outline" className="w-full h-12 text-lg font-medium border-2" size="lg">
                  📝 Solicitar Acesso
                </Button>
              </Link>
              <div className="text-center text-sm text-muted-foreground pt-4">
                <p>Sistema restrito para profissionais de segurança pública</p>
              </div>
            </CardContent>
          </Card>
        </section>
        
        {/* Footer */}
        <footer className="text-center mt-20 pt-8 border-t border-muted/30">
          <p className="text-muted-foreground">
            © 2024 Secur:AI - Tecnologia avançada para investigações criminais
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Landing;