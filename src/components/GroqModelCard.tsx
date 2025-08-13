
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Check, Star, AlertTriangle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface GroqModelCardProps {
  title: string;
  modelId: string;
  description: string;
  contextWindow: string;
  isPreview?: boolean;
  isSelected?: boolean;
  onSelect: (modelId: string) => void;
  isBestChoice?: boolean;
}

export const GroqModelCard = ({
  title,
  modelId,
  description,
  contextWindow,
  isPreview = false,
  isSelected = false,
  onSelect,
  isBestChoice = false
}: GroqModelCardProps) => {
  const isLlamaModel = modelId.toLowerCase().includes('llama');
  const isWhisperModel = modelId.toLowerCase().includes('whisper');
  
  return (
    <Card className={`overflow-hidden transition-all ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'bg-white dark:bg-gray-800'}`}>
      <CardHeader className={`pb-2 ${isPreview ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
        <div className="flex justify-between items-start">
          <CardTitle className="text-base flex items-center gap-2">
            {title}
            {isBestChoice && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Star className="h-4 w-4 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Modelo recomendado para melhor desempenho</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </CardTitle>
          {isSelected && <Check className="h-5 w-5 text-blue-600" />}
        </div>
        <div className="text-xs text-gray-500 font-mono">{modelId}</div>
      </CardHeader>
      
      <CardContent className="py-3 text-sm">
        <p className="mb-2">{description}</p>
        <div className="mt-2 flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Contexto:</span>
            <span className="font-medium">{contextWindow}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {isPreview ? (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded dark:bg-yellow-900/50 dark:text-yellow-300">
                Preview
              </span>
            ) : (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded dark:bg-green-900/50 dark:text-green-300">
                Produção
              </span>
            )}
            
            {isLlamaModel && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded flex items-center gap-1 dark:bg-blue-900/50 dark:text-blue-300">
                LLaMA
              </span>
            )}
            
            {isWhisperModel && (
              <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded flex items-center gap-1 dark:bg-purple-900/50 dark:text-purple-300">
                Speech-to-Text
              </span>
            )}
            
            {modelId === 'meta-llama/llama-4-scout-17b-16e-instruct' && (
              <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded flex items-center gap-1 dark:bg-indigo-900/50 dark:text-indigo-300">
                <Star className="h-3 w-3" />
                <span>Padrão</span>
              </span>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        <Button 
          onClick={() => onSelect(modelId)}
          variant={isSelected ? "default" : "outline"}
          className="w-full"
        >
          {isSelected ? "Selecionado" : "Selecionar Modelo"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GroqModelCard;
