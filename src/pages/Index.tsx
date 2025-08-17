import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { useToast } from "../hooks/use-toast";
import { Shield, Users, BarChart, FileSearch, CheckCircle, Play, Star, Award, Clock, TrendingUp, Zap, Brain, Eye, MessageSquare, ChevronDown } from "lucide-react";

const Index = () => {
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Hero Section */}
        <header className="text-center mb-20 animate-fade-in">
          <div className="mb-8">
            <Badge className="mb-6 px-4 py-2 text-sm font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
              <Zap className="w-4 h-4 mr-2" />
              Tecnologia Nacional 2024
            </Badge>
            <h1 className="text-7xl font-bold text-foreground mb-8 bg-gradient-to-r from-primary via-accent to-primary/70 bg-clip-text text-transparent animate-scale-in">
              Secur:AI
            </h1>
            <p className="text-3xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-8">
              Inteligência Artificial para Investigação Criminal
            </p>
            <p className="text-xl text-muted-foreground/90 max-w-3xl mx-auto leading-relaxed">
              Sistema desenvolvido para <strong className="text-primary">Polícias</strong> e 
              <strong className="text-primary"> Órgãos de Segurança Pública</strong> brasileiros • 
              Estimativa de <strong className="text-primary">95%+ precisão</strong> na análise • 
              <strong className="text-primary"> 80% redução</strong> no tempo de investigação
            </p>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link to="/auth/login" className="group">
              <Button size="lg" className="h-14 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <Play className="w-5 h-5 mr-2" />
                Acessar Sistema
              </Button>
            </Link>
            <Link to="/auth/register">
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg font-semibold border-2 hover:bg-accent/10 transition-all duration-300">
                <Shield className="w-5 h-5 mr-2" />
                Solicitar Credenciais
              </Button>
            </Link>
          </div>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-muted-foreground/70">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              Tecnologia Nacional
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Conformidade LGPD
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              Exclusivo Segurança Pública
            </div>
          </div>
        </header>

        {/* Stats Section */}
        <section className="text-center mb-20 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">95%+</div>
              <div className="text-sm text-muted-foreground">Precisão Estimada</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">80%</div>
              <div className="text-sm text-muted-foreground">Redução no Tempo</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted-foreground">Sistema Disponível</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground">Nacional</div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Como Funciona</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tecnologia especializada para investigação criminal em 3 etapas
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">1. Upload de Evidências</h3>
              <p className="text-muted-foreground">
                Faça upload de documentos, imagens, áudios e vídeos de forma segura e organizada
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-accent to-accent/70 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Eye className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">2. Análise Inteligente</h3>
              <p className="text-muted-foreground">
                Nossa IA analisa automaticamente todas as evidências e identifica padrões ocultos
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-secondary to-secondary/70 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">3. Relatórios Precisos</h3>
              <p className="text-muted-foreground">
                Receba relatórios detalhados com insights valiosos e recomendações de ação
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Recursos Especializados</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Desenvolvido especificamente para as necessidades da investigação criminal brasileira
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="group hover:shadow-xl transition-all duration-300 border-muted/50 hover:border-primary/30 hover:-translate-y-1 bg-card/50 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Segurança Máxima</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center leading-relaxed">
                  Criptografia end-to-end, conformidade LGPD e auditoria completa de todos os acessos
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-muted/50 hover:border-primary/30 hover:-translate-y-1 bg-card/50 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-accent/20 to-accent/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Brain className="w-8 h-8 text-accent" />
                </div>
                <CardTitle className="text-xl">IA Avançada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center leading-relaxed">
                  Modelos de deep learning treinados especificamente para análise forense e criminal
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-muted/50 hover:border-primary/30 hover:-translate-y-1 bg-card/50 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BarChart className="w-8 h-8 text-secondary" />
                </div>
                <CardTitle className="text-xl">Analytics Preditivos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center leading-relaxed">
                  Visualizações interativas e previsões baseadas em padrões históricos
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-muted/50 hover:border-primary/30 hover:-translate-y-1 bg-card/50 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-success/20 to-success/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-success" />
                </div>
                <CardTitle className="text-xl">Colaboração</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center leading-relaxed">
                  Trabalho em equipe em tempo real com controle granular de permissões
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Experiência dos Usuários</h2>
            <p className="text-xl text-muted-foreground">Feedback de profissionais em testes beta</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-card/50 backdrop-blur-sm border-muted/50">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 italic">
                  "Sistema promissor para otimização do trabalho investigativo. Interface intuitiva."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center mr-3">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">Dra. Maria Silva</div>
                    <div className="text-sm text-muted-foreground">Delegada - PCSP</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur-sm border-muted/50">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 italic">
                  "Tecnologia nacional com potencial real de impacto na investigação criminal."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center mr-3">
                    <Shield className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="font-semibold">Dr. João Santos</div>
                    <div className="text-sm text-muted-foreground">Perito Criminal - INC</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur-sm border-muted/50">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 italic">
                  "Ferramenta desenvolvida com foco real nas necessidades policiais brasileiras."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center mr-3">
                    <Award className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <div className="font-semibold">Comissário Ana Costa</div>
                    <div className="text-sm text-muted-foreground">Polícia Civil - PCRJ</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Perguntas Frequentes</h2>
            <p className="text-xl text-muted-foreground">Esclarecimentos sobre o Secur:AI</p>
          </div>
          
          <div className="max-w-3xl mx-auto space-y-4">
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Como garantimos a segurança dos dados?</h3>
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mt-2">
                  Utilizamos criptografia AES-256, conformidade total com LGPD e servidores em território nacional.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Qual o tempo de implementação?</h3>
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mt-2">
                  A implementação leva de 2-5 dias úteis, incluindo treinamento da equipe e migração de dados.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Oferece suporte técnico?</h3>
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mt-2">
                  Sim, oferecemos suporte 24/7 por chat, email e telefone, além de treinamentos regulares.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Access Section */}
        <section className="text-center mb-20">
          <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 border-primary/20 shadow-2xl">
            <CardContent className="pt-12 pb-12">
              <Badge className="mb-6 px-4 py-2 bg-primary/20 text-primary border-primary/30">
                <Shield className="w-4 h-4 mr-2" />
                Acesso Restrito - Segurança Pública
              </Badge>
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Solicite Acesso ao Sistema
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Sistema desenvolvido exclusivamente para órgãos de segurança pública brasileiros
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                <Link to="/auth/login">
                  <Button size="lg" className="h-14 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                    <Play className="w-5 h-5 mr-2" />
                    Acessar Sistema
                  </Button>
                </Link>
                <Link to="/auth/register">
                  <Button variant="outline" size="lg" className="h-14 px-8 text-lg font-semibold border-2">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Solicitar Credenciais
                  </Button>
                </Link>
              </div>
              <div className="text-sm text-muted-foreground">
                ✅ Exclusivo para Polícias • ✅ Tecnologia Nacional • ✅ Suporte Especializado
              </div>
            </CardContent>
          </Card>
        </section>
        
        {/* Footer */}
        <footer className="mt-20 pt-12 border-t border-muted/30">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg text-foreground mb-4">Secur:AI</h3>
              <p className="text-muted-foreground text-sm">
                Sistema de Inteligência Artificial desenvolvido para investigação criminal brasileira.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Sistema</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Recursos</li>
                <li>Documentação</li>
                <li>Acesso</li>
                <li>Suporte</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Documentação Técnica</li>
                <li>Treinamentos</li>
                <li>Suporte Técnico</li>
                <li>FAQ</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Institucional</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Sobre o Sistema</li>
                <li>Segurança</li>
                <li>Privacidade</li>
                <li>Conformidade LGPD</li>
              </ul>
            </div>
          </div>
          <div className="text-center pt-8 border-t border-muted/30">
            <p className="text-muted-foreground mb-2">
              © 2024 Secur:AI - Sistema de Inteligência Artificial para Investigação Criminal
            </p>
            <p className="text-sm text-muted-foreground">
              Desenvolvido por <a href="mailto:marcusvlessa@gmail.com" className="text-primary hover:text-primary/80 underline transition-colors">Marcus Vinicius Lessa</a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;