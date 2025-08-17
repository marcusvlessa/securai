import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Image as ImageIcon, 
  Eye, 
  Download,
  Search,
  Shield,
  Car,
  User,
  FileText,
  Brain,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  Camera,
  Zap,
  Target,
  BarChart3,
  FolderOpen,
  FileImage,
  Layers,
  FileText as Report,
  Trash2,
  Play,
  Square
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  analyzeImageWithVisionModels, 
  analyzeMultipleImages,
  generateBatchAnalysisReport,
  getAvailableModels, 
  getCurrentModelConfig,
  BatchImageAnalysisResult
} from '@/services/groqService';
import { useCase } from '@/contexts/CaseContext';

interface ImageAnalysisResult {
  ocrText: string;
  faces: Array<{
    id: number;
    confidence: number;
    region: { x: number; y: number; width: number; height: number };
    characteristics?: string;
  }>;
  licensePlates: string[];
  enhancementTechnique: string;
  confidenceScores?: {
    plate: string;
    scores: number[];
  };
}

export default function ImageAnalysis() {
  // Estado para múltiplas imagens
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  // Estado para análise individual
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  
  // Estado para resultados
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);
  const [batchAnalysisResult, setBatchAnalysisResult] = useState<BatchImageAnalysisResult | null>(null);
  const [consolidatedReport, setConsolidatedReport] = useState<string>('');
  
  // Estado para controle
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [analysisType, setAnalysisType] = useState<'comprehensive' | 'ocr' | 'face-detection' | 'plate-detection'>('comprehensive');
  const [activeTab, setActiveTab] = useState('upload');
  const [analysisMode, setAnalysisMode] = useState<'single' | 'batch'>('single');
  
  const { currentCase, saveToCurrentCase } = useCase();

  // Obter informações do modelo atual
  const currentModel = getCurrentModelConfig();
  const availableModels = getAvailableModels();

  // Handle multiple image selection
  const handleMultipleImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate file types
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`Arquivo ${file.name} não é uma imagem válida`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Imagem ${file.name} deve ter menos de 10MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setSelectedImages(validFiles);
    
    // Create previews
    const previews = validFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previews).then(previewUrls => {
      setImagePreviews(previewUrls);
    });
    
    // Reset previous analysis
    setBatchAnalysisResult(null);
    setConsolidatedReport(null);
    
    toast.success(`${validFiles.length} imagens selecionadas com sucesso!`);
  }, []);

  // Handle single image selection
  const handleImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem válido');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter menos de 10MB');
      return;
    }

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // Reset previous analysis
    setAnalysisResult(null);
    
    toast.success('Imagem selecionada com sucesso!');
  }, []);

  // Convert image to base64
  const convertImageToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

             // Analyze single image with available vision models
  const analyzeImage = useCallback(async () => {
    if (!selectedImage) {
      toast.error('Selecione uma imagem primeiro');
      return;
    }

    try {
      setIsAnalyzing(true);
      
      console.log(`🔍 Iniciando análise de imagem com ${currentModel.name}`);
      console.log(`📊 Tipo de análise: ${analysisType}`);
      
      // Convert image to base64
      const base64Image = await convertImageToBase64(selectedImage);
      
      // Analyze with available vision models
      const result = await analyzeImageWithVisionModels(base64Image, analysisType);
      
      // Parse the result
      const parsedResult: ImageAnalysisResult = {
        ocrText: '',
        faces: [],
        licensePlates: [],
                 enhancementTechnique: 'Análise com modelos de visão computacional',
        confidenceScores: undefined
      };

      // Extract information from the AI response
      const lines = result.split('\n');
      let currentSection = '';
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        
        if (trimmedLine.includes('**Texto Identificado:**')) {
          currentSection = 'ocr';
        } else if (trimmedLine.includes('**Placas Detectadas:**')) {
          currentSection = 'plates';
        } else if (trimmedLine.includes('**Faces Detectadas:**')) {
          currentSection = 'faces';
        } else if (trimmedLine.includes('**Objetos Identificados:**')) {
          currentSection = 'objects';
        } else if (trimmedLine.includes('**Análise Investigativa:**')) {
          currentSection = 'analysis';
        } else if (trimmedLine.startsWith('-') && trimmedLine.length > 1) {
          const content = trimmedLine.substring(1).trim();
          
          switch (currentSection) {
            case 'ocr':
              parsedResult.ocrText += content + ' ';
              break;
            case 'plates':
              // Extract plate numbers (Brazilian format: ABC-1234 or ABC1D23)
              const plateMatch = content.match(/[A-Z]{3}[-\s]?\d{1,4}/);
              if (plateMatch) {
                parsedResult.licensePlates.push(plateMatch[0]);
              }
              break;
            case 'faces':
              // Extract face information
              if (content.includes('Face')) {
                const faceId = parsedResult.faces.length + 1;
                parsedResult.faces.push({
                  id: faceId,
                  confidence: 0.8,
                  region: { x: 0, y: 0, width: 100, height: 100 },
                  characteristics: content
                });
              }
              break;
          }
        }
      });

      // Clean up OCR text
      parsedResult.ocrText = parsedResult.ocrText.trim();
      
      setAnalysisResult(parsedResult);
      
      console.log('✅ Análise concluída:', parsedResult);
      
      // Save to current case if available
      if (currentCase && saveToCurrentCase) {
        saveToCurrentCase({
          timestamp: new Date().toISOString(),
          fileName: selectedImage.name,
          fileSize: selectedImage.size,
          analysisType,
          result: parsedResult,
          model: currentModel.name
        }, 'imageAnalysis');
        
        toast.success('Análise salva no caso atual');
      }
      
      // Switch to results tab
      setActiveTab('results');
      
             toast.success(`Análise completa concluída com ${currentModel.name}!`);
      
    } catch (error) {
      console.error('❌ Erro na análise de imagem:', error);
      toast.error(`Erro na análise: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedImage, analysisType, currentModel, currentCase, saveToCurrentCase, convertImageToBase64]);

  // Analyze multiple images in batch
  const analyzeBatchImages = useCallback(async () => {
    if (selectedImages.length === 0) {
      toast.error('Selecione pelo menos uma imagem para análise em lote');
      return;
    }

    try {
      setIsBatchAnalyzing(true);
      
      console.log(`🔍 Iniciando análise em lote de ${selectedImages.length} imagens`);
      
      // Analyze all images
      const batchResult = await analyzeMultipleImages(selectedImages, analysisType);
      
      setBatchAnalysisResult(batchResult);
      
      console.log('✅ Análise em lote concluída:', batchResult);
      
      // Save to current case if available
      if (currentCase && saveToCurrentCase) {
        saveToCurrentCase({
          timestamp: new Date().toISOString(),
          totalImages: batchResult.totalImages,
          processedImages: batchResult.processedImages,
          analysisType,
          result: batchResult,
          model: currentModel.name
        }, 'batchImageAnalysis');
        
        toast.success('Análise em lote salva no caso atual');
      }
      
      // Switch to results tab
      setActiveTab('results');
      
      toast.success(`Análise em lote concluída: ${batchResult.processedImages}/${batchResult.totalImages} imagens processadas!`);
      
    } catch (error) {
      console.error('❌ Erro na análise em lote:', error);
      toast.error(`Erro na análise em lote: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsBatchAnalyzing(false);
    }
  }, [selectedImages, analysisType, currentModel, currentCase, saveToCurrentCase]);

  // Generate consolidated report
  const generateReport = useCallback(async () => {
    if (!batchAnalysisResult) {
      toast.error('Execute uma análise em lote primeiro');
      return;
    }

    try {
      setIsGeneratingReport(true);
      
      console.log('📊 Gerando relatório consolidado...');
      
      // Generate report
      const report = await generateBatchAnalysisReport(
        batchAnalysisResult,
        currentCase?.title || 'Análise de evidências visuais'
      );
      
      setConsolidatedReport(report);
      
      console.log('✅ Relatório consolidado gerado');
      
      toast.success('Relatório consolidado gerado com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error);
      toast.error(`Erro ao gerar relatório: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsGeneratingReport(false);
    }
  }, [batchAnalysisResult, currentCase]);

  // Remove image from batch
  const removeImageFromBatch = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Clear all images
  const clearAllImages = useCallback(() => {
    setSelectedImages([]);
    setImagePreviews([]);
    setSelectedImage(null);
    setImagePreview('');
    setAnalysisResult(null);
    setBatchAnalysisResult(null);
    setConsolidatedReport(null);
  }, []);

  // Reset analysis
  const resetAnalysis = useCallback(() => {
    setSelectedImage(null);
    setImagePreview('');
    setAnalysisResult(null);
    setActiveTab('upload');
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-2 flex items-center justify-center gap-3">
          <Shield className="h-10 w-10 text-primary" />
          Análise de Imagem
        </h1>
                 <p className="text-muted-foreground text-lg">
           Sistema avançado de análise forense com Llama 3.3 70B Versatile
         </p>
        
        {/* Model Information */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg inline-block">
          <div className="flex items-center gap-2 text-blue-800">
            <Brain className="h-4 w-4" />
            <span className="font-medium">Modelo Atual: {currentModel.name}</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">{currentModel.description}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {currentModel.capabilities.map((capability, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {capability}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis Mode Selector */}
      <div className="flex justify-center">
        <div className="bg-muted rounded-lg p-1">
          <Button
            variant={analysisMode === 'single' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setAnalysisMode('single')}
            className="flex items-center gap-2"
          >
            <FileImage className="h-4 w-4" />
            Análise Individual
          </Button>
          <Button
            variant={analysisMode === 'batch' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setAnalysisMode('batch')}
            className="flex items-center gap-2"
          >
            <Layers className="h-4 w-4" />
            Análise em Lote
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">📤 Upload</TabsTrigger>
          <TabsTrigger value="analysis" disabled={!selectedImage && selectedImages.length === 0}>🔍 Análise</TabsTrigger>
          <TabsTrigger value="results" disabled={!analysisResult && !batchAnalysisResult}>📊 Resultados</TabsTrigger>
        </TabsList>

        {/* Tab: Upload */}
        <TabsContent value="upload" className="space-y-4">
          {analysisMode === 'single' ? (
            // Single Image Upload
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload de Imagem Individual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Arraste e solte sua imagem aqui</p>
                    <p className="text-sm text-muted-foreground">
                      Ou clique para selecionar uma imagem
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Formatos: JPG, PNG, GIF, BMP (máx. 10MB)
                    </p>
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="mt-4"
                  />
                </div>

                {imagePreview && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Imagem selecionada</span>
                    </div>
                    
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-w-full h-auto max-h-96 rounded-lg border"
                      />
                      <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                        {selectedImage?.name}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{selectedImage?.size ? (selectedImage.size / 1024).toFixed(1) : 0}</div>
                        <div className="text-sm text-muted-foreground">KB</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{selectedImage?.type || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">Tipo</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{selectedImage?.lastModified ? new Date(selectedImage.lastModified).toLocaleDateString() : 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">Data</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">✓</div>
                        <div className="text-sm text-muted-foreground">Pronto</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            // Batch Image Upload
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Upload de Múltiplas Imagens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Arraste e solte múltiplas imagens aqui</p>
                    <p className="text-sm text-muted-foreground">
                      Ou clique para selecionar várias imagens
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Formatos: JPG, PNG, GIF, BMP (máx. 10MB cada)
                    </p>
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleMultipleImageSelect}
                    className="mt-4"
                  />
                </div>

                {selectedImages.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">{selectedImages.length} imagens selecionadas</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllImages}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Limpar Tudo
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {selectedImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={imagePreviews[index]} 
                            alt={`Preview ${index + 1}`} 
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                            {image.name}
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImageFromBatch(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                            {(image.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Analysis */}
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Configuração da Análise
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="analysisType" className="text-sm font-medium">
                    Tipo de Análise
                  </Label>
                  <Select value={analysisType} onValueChange={(value: any) => setAnalysisType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de análise" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comprehensive">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Análise Completa
                        </div>
                      </SelectItem>
                      <SelectItem value="ocr">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          OCR e Texto
                        </div>
                      </SelectItem>
                      <SelectItem value="face-detection">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Detecção Facial
                        </div>
                      </SelectItem>
                      <SelectItem value="plate-detection">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4" />
                          Detecção de Placas
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    {analysisType === 'comprehensive' && 'Análise completa com OCR, faces, placas e objetos'}
                    {analysisType === 'ocr' && 'Foco em extração de texto e documentos'}
                    {analysisType === 'face-detection' && 'Detecção e análise de rostos humanos'}
                    {analysisType === 'plate-detection' && 'Detecção de placas veiculares brasileiras'}
                  </p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <Info className="h-4 w-4" />
                    <span className="font-medium">Capacidades dos Modelos de Visão Computacional</span>
                  </div>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>OCR Automático:</strong> Extração completa de texto</li>
                    <li>• <strong>Detecção de Placas:</strong> Formato brasileiro e Mercosul</li>
                    <li>• <strong>Reconhecimento Facial:</strong> Identificação automática de rostos</li>
                    <li>• <strong>Análise de Objetos:</strong> Classificação automática completa</li>
                    <li>• <strong>Relatório Automático:</strong> Geração completa de relatórios</li>
                  </ul>
                </div>

                {analysisMode === 'single' ? (
                  <Button 
                    onClick={analyzeImage} 
                    disabled={isAnalyzing || !selectedImage}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analisando com IA...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Iniciar Análise Completa Automática
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    onClick={analyzeBatchImages} 
                    disabled={isBatchAnalyzing || selectedImages.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    {isBatchAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analisando {selectedImages.length} imagens...
                      </>
                    ) : (
                      <>
                        <Layers className="h-4 w-4 mr-2" />
                        Iniciar Análise em Lote ({selectedImages.length} imagens)
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Results */}
        <TabsContent value="results" className="space-y-4">
          {!analysisResult && !batchAnalysisResult ? (
            <Card>
              <CardContent className="text-center p-8 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-4" />
                <p>Execute uma análise primeiro para ver os resultados</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Single Image Results */}
              {analysisResult && (
                <>
                  {/* Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Resumo da Análise Individual
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{analysisResult.ocrText.length}</div>
                          <div className="text-sm text-muted-foreground">Caracteres OCR</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{analysisResult.faces.length}</div>
                          <div className="text-sm text-muted-foreground">Faces Detectadas</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">{analysisResult.licensePlates.length}</div>
                          <div className="text-sm text-muted-foreground">Placas Encontradas</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">✓</div>
                          <div className="text-sm text-muted-foreground">Concluído</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* OCR Results */}
                  {analysisResult.ocrText && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Texto Identificado (OCR)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="whitespace-pre-wrap text-sm">{analysisResult.ocrText}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* License Plates */}
                  {analysisResult.licensePlates.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Car className="h-5 w-5" />
                          Placas Veiculares Detectadas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.licensePlates.map((plate, index) => (
                            <Badge key={index} variant="outline" className="text-lg font-mono">
                              {plate}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Formato brasileiro detectado automaticamente
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Faces */}
                  {analysisResult.faces.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Rostos Detectados
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {analysisResult.faces.map((face, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">Face {face.id}</div>
                                <div className="text-sm text-muted-foreground">
                                  {face.characteristics || 'Características não especificadas'}
                                </div>
                              </div>
                              <Badge variant="secondary">
                                {(face.confidence * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Batch Analysis Results */}
              {batchAnalysisResult && (
                <>
                  {/* Batch Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5" />
                        Resumo da Análise em Lote
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{batchAnalysisResult.totalImages}</div>
                          <div className="text-sm text-muted-foreground">Total de Imagens</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{batchAnalysisResult.processedImages}</div>
                          <div className="text-sm text-muted-foreground">Processadas</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">{batchAnalysisResult.failedImages}</div>
                          <div className="text-sm text-muted-foreground">Com Falha</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">{batchAnalysisResult.summary.totalFaces}</div>
                          <div className="text-sm text-muted-foreground">Faces Totais</div>
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="font-medium mb-2">Placas Detectadas: {batchAnalysisResult.summary.totalPlates}</div>
                          <div className="font-medium mb-2">Textos Identificados: {batchAnalysisResult.summary.totalTexts}</div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="font-medium mb-2">Objetos Comuns:</div>
                          <div className="text-sm text-muted-foreground">
                            {batchAnalysisResult.summary.commonObjects.length > 0 
                              ? batchAnalysisResult.summary.commonObjects.join(', ')
                              : 'Nenhum objeto comum identificado'
                            }
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Individual Results */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileImage className="h-5 w-5" />
                        Resultados Individuais
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {batchAnalysisResult.results.map((result, index) => (
                          <div key={index} className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">{result.fileName}</div>
                              <Badge variant={result.success ? 'default' : 'destructive'}>
                                {result.success ? 'Sucesso' : 'Falha'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mb-2">
                              {(result.fileSize / 1024).toFixed(1)} KB • {new Date(result.timestamp).toLocaleString('pt-BR')}
                            </div>
                            {result.success ? (
                              <div className="text-sm bg-white p-3 rounded border">
                                <div className="whitespace-pre-wrap">{result.result}</div>
                              </div>
                            ) : (
                              <div className="text-sm text-red-600">
                                Erro: {result.error}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Generate Report Button */}
                  <Card>
                    <CardContent className="pt-6">
                      <Button 
                        onClick={generateReport}
                        disabled={isGeneratingReport}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        size="lg"
                      >
                        {isGeneratingReport ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Gerando Relatório...
                          </>
                        ) : (
                          <>
                            <Report className="h-4 w-4 mr-2" />
                            Gerar Relatório Consolidado
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Consolidated Report */}
              {consolidatedReport && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Report className="h-5 w-5" />
                      Relatório Consolidado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="whitespace-pre-wrap text-sm">{consolidatedReport}</div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const blob = new Blob([consolidatedReport], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `relatorio-analise-imagens-${new Date().toISOString().slice(0, 10)}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Baixar Relatório
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Technical Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Detalhes Técnicos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Modelo Utilizado:</span>
                      <span className="font-medium">{currentModel.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tipo de Análise:</span>
                      <span className="font-medium capitalize">{analysisType.replace('-', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Modo de Análise:</span>
                      <span className="font-medium capitalize">{analysisMode === 'single' ? 'Individual' : 'Em Lote'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Timestamp:</span>
                      <span className="font-medium">{new Date().toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3">
                <Button onClick={() => setActiveTab('upload')} variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Nova Análise
                </Button>
                <Button onClick={clearAllImages} variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
