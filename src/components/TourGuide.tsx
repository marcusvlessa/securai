// Tour guiado para novos usuários
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Rocket, 
  ArrowRight, 
  Check, 
  FileText, 
  Users, 
  Network,
  Settings
} from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  image?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Bem-vindo ao SECUR:AI',
    description: 'Plataforma completa de análise investigativa com IA. Vamos fazer um tour rápido pelos principais recursos.',
    icon: <Rocket className="h-8 w-8 text-primary" />
  },
  {
    title: 'Gerenciamento de Casos',
    description: 'Crie e organize seus casos investigativos. Cada caso agrupa evidências, análises e relatórios relacionados.',
    icon: <FileText className="h-8 w-8 text-primary" />
  },
  {
    title: 'Análise de Vínculos',
    description: 'Visualize conexões entre pessoas, empresas e transações através de grafos interativos.',
    icon: <Network className="h-8 w-8 text-primary" />
  },
  {
    title: 'Análise de Instagram',
    description: 'Processe dados exportados do Instagram para extrair perfis, conversas, IPs, dispositivos e muito mais.',
    icon: <Users className="h-8 w-8 text-primary" />
  },
  {
    title: 'Configurações',
    description: 'Configure suas chaves de API para análise de imagens, áudio e geração de relatórios com IA.',
    icon: <Settings className="h-8 w-8 text-primary" />
  }
];

interface TourGuideProps {
  show: boolean;
  onComplete: () => void;
}

export const TourGuide: React.FC<TourGuideProps> = ({ show, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(show);
  }, [show]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsOpen(false);
    onComplete();
  };

  const handleSkip = () => {
    setIsOpen(false);
    onComplete();
  };

  const currentStepData = TOUR_STEPS[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline">
              Passo {currentStep + 1} de {TOUR_STEPS.length}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Pular tour
            </Button>
          </div>
          <div className="flex items-center gap-3 mb-4">
            {currentStepData.icon}
            <DialogTitle className="text-xl">{currentStepData.title}</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        <div className="my-6">
          <div className="flex gap-1 justify-center">
            {TOUR_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-8 rounded-full transition-colors ${
                  index === currentStep 
                    ? 'bg-primary' 
                    : index < currentStep 
                    ? 'bg-primary/50' 
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            Voltar
          </Button>
          <Button onClick={handleNext}>
            {currentStep === TOUR_STEPS.length - 1 ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Concluir
              </>
            ) : (
              <>
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
