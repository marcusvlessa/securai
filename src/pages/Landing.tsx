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
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Secur:AI
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Sistema inteligente de análise criminal com IA avançada para investigações e gerenciamento de casos
          </p>
        </header>

        {/* Features Section */}
        <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardHeader className="text-center">
              <Shield className="w-12 h-12 mx-auto mb-2 text-primary" />
              <CardTitle className="text-lg">Análise Segura</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Processamento seguro de dados sensíveis com criptografia avançada
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <FileSearch className="w-12 h-12 mx-auto mb-2 text-primary" />
              <CardTitle className="text-lg">IA Inteligente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Análise automática de documentos, imagens e áudios com IA
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <BarChart className="w-12 h-12 mx-auto mb-2 text-primary" />
              <CardTitle className="text-lg">Relatórios</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Geração automática de relatórios e estatísticas detalhadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Users className="w-12 h-12 mx-auto mb-2 text-primary" />
              <CardTitle className="text-lg">Colaboração</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Trabalho em equipe com controle de acesso e permissões
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Authentication Section */}
        <section className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Acesso ao Sistema</CardTitle>
              <CardDescription className="text-center">
                Entre com sua conta ou solicite acesso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link to="/auth/login" className="w-full">
                <Button className="w-full" size="lg">
                  Acessar Sistema
                </Button>
              </Link>
              <Link to="/auth/register" className="w-full">
                <Button variant="outline" className="w-full" size="lg">
                  Solicitar Acesso
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Landing;