import React, { useState, useEffect, useRef } from 'react';
import { Upload, Image as ImageIcon, Search, Scan, AlertTriangle, Database, Maximize2, ImagePlus, Car, Eye, EyeOff, Tag, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { useCase } from '../contexts/CaseContext';
import { ApiKeyInput } from '../components/ui/api-key-input';
import { 
  analyzeImageWithGroq, 
  enhanceImageWithGroq,
  ImageAnalysisResult,
  ImageEnhancementResult,
  hasValidApiKey
} from '../services/groqService';
import { saveImageAnalysis, getImageAnalysesByCaseId } from '../services/databaseService';

interface ProcessedImage {
  id: string;
  name: string;
  original: string;
  enhanced?: string;
  ocrText?: string;
  faces?: {
    id: number;
    confidence: number;
    region: { x: number; y: number; width: number; height: number };
  }[];
  licensePlates?: string[];
  enhancementTechnique?: string;
  confidenceScores?: {
    plate: string;
    scores: number[];
  };
}

const ImageAnalysis = () => {
  const { currentCase, saveToCurrentCase } = useCase();
  const [image, setImage] = useState<ProcessedImage | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('original');
  const [isCheckingDb, setIsCheckingDb] = useState<boolean>(false);
  const [showFaceBox, setShowFaceBox] = useState<boolean>(true);
  const [showPlateBox, setShowPlateBox] = useState<boolean>(true);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [plateAlternatives, setPlateAlternatives] = useState<string[]>([]);
  const [apiKeyAvailable, setApiKeyAvailable] = useState<boolean>(false);

  // Check if API key is configured
  useEffect(() => {
    checkApiKey();
    
    // Set up listener for storage events to detect settings changes
    const handleStorageChange = () => {
      checkApiKey();
    };
    
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('apiKeyUpdated', handleStorageChange);
    
    // Check periodically in case settings were updated in another tab
    const interval = setInterval(checkApiKey, 3000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('apiKeyUpdated', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const checkApiKey = () => {
    const keyAvailable = hasValidApiKey();
    setApiKeyAvailable(keyAvailable);
    console.log("API key check:", keyAvailable ? "Available" : "Not available");
  };

  // Check for existing analyses in the database when case changes
  useEffect(() => {
    if (currentCase) {
      checkForExistingAnalyses();
    }
  }, [currentCase]);

  // Capture the image element for correct face box positioning
  useEffect(() => {
    if (imageContainerRef.current) {
      const img = imageContainerRef.current.querySelector('img');
      if (img) {
        img.onload = () => {
          setImageElement(img);
        };
      }
    }
  }, [image, activeTab]);

  // Generate plate alternatives when confidence is low
  useEffect(() => {
    if (image?.confidenceScores && image.licensePlates && image.licensePlates.length > 0) {
      const plate = image.confidenceScores.plate;
      const scores = image.confidenceScores.scores;
      
      // Only generate alternatives if some characters have low confidence
      if (scores.some(score => score < 90)) {
        generatePlateAlternatives(plate, scores);
      } else {
        setPlateAlternatives([]);
      }
    } else {
      setPlateAlternatives([]);
    }
  }, [image?.confidenceScores]);

  const checkForExistingAnalyses = async () => {
    if (!currentCase) return;
    
    try {
      setIsCheckingDb(true);
      const analyses = await getImageAnalysesByCaseId(currentCase.id);
      setIsCheckingDb(false);
      
      if (analyses.length > 0) {
        toast.info(`${analyses.length} análises de imagem encontradas no banco de dados para este caso`);
      }
    } catch (error) {
      console.error('Error checking for existing analyses:', error);
      setIsCheckingDb(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }
    
    // Create object URL for the image file
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImage({
          id: `image-${Date.now()}`,
          name: file.name,
          original: event.target.result as string
        });
        toast.success(`Imagem "${file.name}" carregada com sucesso`);
      }
    };
    reader.readAsDataURL(file);
  };

  const processImage = async () => {
    if (!image) {
      toast.error('Por favor, selecione uma imagem primeiro');
      return;
    }
    
    if (!currentCase) {
      toast.error('Por favor, selecione um caso antes de prosseguir');
      return;
    }
    
    if (!apiKeyAvailable) {
      toast.error('Chave da API GROQ não configurada ou inválida. Por favor, configure sua chave nas Configurações.');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Check if we already have this image analyzed in the database
      const analyses = await getImageAnalysesByCaseId(currentCase.id);
      const existingAnalysis = analyses.find(a => a.filename === image.name);
      
      if (existingAnalysis) {
        // Use existing analysis from DB
        const processedImage: ProcessedImage = {
          ...image,
          enhanced: existingAnalysis.dataUrl,
          ocrText: existingAnalysis.ocrText || '',
          faces: existingAnalysis.faces || [],
          licensePlates: existingAnalysis.licensePlates || [],
          enhancementTechnique: existingAnalysis.enhancementTechnique || '',
          confidenceScores: existingAnalysis.confidenceScores
        };
        
        setImage(processedImage);
        setActiveTab('enhanced');
        toast.success('Análise recuperada do banco de dados');
        setIsProcessing(false);
        return;
      }
      
      console.log('Processing new image...');
      
      try {
        // First, enhance the image
        const enhancementResult: ImageEnhancementResult = await enhanceImageWithGroq(image.original);
        console.log('Enhanced image successfully');
        
        // Then, analyze the enhanced image for text and objects
        const analysisResult: ImageAnalysisResult = await analyzeImageWithGroq(enhancementResult.enhancedImageUrl);
        console.log('Analysis results:', { 
          ocrTextLength: analysisResult.ocrText?.length,
          facesCount: analysisResult.faces?.length,
          licensePlatesCount: analysisResult.licensePlates?.length,
          enhancementTechnique: analysisResult.enhancementTechnique
        });
        
        // Create processed image object
        const processedImage: ProcessedImage = {
          ...image,
          enhanced: enhancementResult.enhancedImageUrl,
          ocrText: analysisResult.ocrText,
          faces: analysisResult.faces,
          licensePlates: analysisResult.licensePlates,
          enhancementTechnique: enhancementResult.enhancementTechnique,
          confidenceScores: analysisResult.confidenceScores
        };
        
        setImage(processedImage);
        setActiveTab('enhanced'); // Switch to enhanced tab automatically
        
        // Save to database
        await saveImageAnalysis({
          caseId: currentCase.id,
          filename: image.name,
          dataUrl: enhancementResult.enhancedImageUrl,
          ocrText: analysisResult.ocrText,
          faces: analysisResult.faces,
          licensePlates: analysisResult.licensePlates,
          enhancementTechnique: enhancementResult.enhancementTechnique,
          confidenceScores: analysisResult.confidenceScores,
          dateProcessed: new Date().toISOString()
        });
        
        // Save to case
        saveToCurrentCase({
          timestamp: new Date().toISOString(),
          imageName: image.name,
          processingResults: {
            hasOcr: analysisResult.ocrText && analysisResult.ocrText.length > 0,
            ocrText: processedImage.ocrText,
            facesDetected: (processedImage.faces?.length || 0),
            licensePlatesDetected: (processedImage.licensePlates?.length || 0),
            enhancementTechnique: enhancementResult.enhancementTechnique
          }
        }, 'imageAnalysis');
        
        toast.success('Imagem processada com sucesso e salva no banco de dados');
        
      } catch (error) {
        console.error('API processing error:', error);
        toast.error('Erro ao processar com a API GROQ: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
        throw error; // Rethrow to be caught by the outer catch block
      }
      
    } catch (error) {
      console.error('Image processing error:', error);
      toast.error('Erro ao processar imagem: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate possible plate alternatives when confidence is low
  const generatePlateAlternatives = (plate: string, confidenceScores: number[]) => {
    // Only generate alternatives for scores below 90%
    const lowConfidenceIndices = confidenceScores
      .map((score, index) => ({ score, index }))
      .filter(item => item.score < 90);
    
    if (lowConfidenceIndices.length === 0) {
      setPlateAlternatives([]);
      return;
    }
    
    // For Brazilian plates (old format: ABC1234, new format: ABC1D23)
    // Character sets for each position
    const charSets = {
      letter: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      number: '0123456789'
    };
    
    // Determine if each position should be a letter or number based on Brazilian plate formats
    const getPositionType = (position: number, plateLength: number) => {
      // Old format (ABC1234)
      if (plateLength === 7) {
        return position < 3 ? 'letter' : 'number';
      }
      // New format (ABC1D23)
      else if (plateLength === 7) {
        if (position < 3) return 'letter';
        else if (position === 3) return 'number';
        else if (position === 4) return 'letter';
        else return 'number';
      }
      
      // Default case
      return position < 3 ? 'letter' : 'number';
    };
    
    // Start with the original plate
    const alternatives = new Set<string>();
    
    // Limit to a reasonable number of combinations
    const maxCombinations = 10;
    let combinationCount = 0;
    
    // Simple function to generate alternatives by replacing low confidence characters
    const generateCombination = (currentPlate: string, index: number) => {
      if (combinationCount >= maxCombinations) return;
      
      const positionType = getPositionType(index, plate.length);
      const charSet = charSets[positionType];
      
      for (let char of charSet) {
        const newPlate = currentPlate.substring(0, index) + char + currentPlate.substring(index + 1);
        alternatives.add(newPlate);
        combinationCount++;
        
        if (combinationCount >= maxCombinations) break;
      }
    };
    
    // Generate alternatives for each low confidence position
    lowConfidenceIndices.forEach(({ index }) => {
      generateCombination(plate, index);
    });
    
    setPlateAlternatives(Array.from(alternatives));
  };

  // Function to calibrate face box positions based on current image display size
  const calibrateFaceBoxPositions = (face: any) => {
    if (!imageElement || !imageContainerRef.current) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    const imgRect = imageElement.getBoundingClientRect();
    
    // Calculate scaling factors between natural image size and displayed size
    const scaleX = imgRect.width / imageElement.naturalWidth;
    const scaleY = imgRect.height / imageElement.naturalHeight;
    
    // Return adjusted coordinates
    return {
      x: face.region.x * scaleX,
      y: face.region.y * scaleY,
      width: face.region.width * scaleX,
      height: face.region.height * scaleY
    };
  };

  const renderFaceBoxes = () => {
    if (!image?.faces || !image.faces.length || !showFaceBox) return null;
    
    console.log('Rendering face boxes for faces:', image.faces);
    
    return (
      <div className="absolute inset-0 pointer-events-none">
        {image.faces.map((face) => {
          const adjustedRegion = calibrateFaceBoxPositions(face);
          
          return (
            <div
              key={face.id}
              className="absolute border-2 border-red-500"
              style={{
                left: `${adjustedRegion.x}px`,
                top: `${adjustedRegion.y}px`,
                width: `${adjustedRegion.width}px`,
                height: `${adjustedRegion.height}px`
              }}
            >
              <div className="absolute -top-6 left-0 bg-red-500 text-white px-2 py-0.5 text-xs">
                Face {face.id} ({(face.confidence * 100).toFixed(1)}%)
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render license plate boxes
  const renderPlateBoxes = () => {
    if (!image?.licensePlates || !image.licensePlates.length || !showPlateBox) return null;
    
    // This is a simplified version - in a real implementation, we would need coordinates
    // Here we'll just add markers on the bottom of the image
    return (
      <div className="absolute bottom-2 left-2 pointer-events-none">
        {image.licensePlates.map((plate, idx) => (
          <div
            key={idx}
            className="bg-blue-600 text-white px-3 py-1 text-sm font-medium rounded mb-1 flex items-center gap-2"
          >
            <Car className="h-4 w-4" />
            <span>Placa: {plate}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
          <ImagePlus className="mr-2 h-6 w-6" /> Análise de Imagem
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Aprimore imagens, execute OCR e reconhecimento facial
        </p>
      </div>

      {!apiKeyAvailable && (
        <div className="mb-6">
          <ApiKeyInput />
        </div>
      )}

      {!currentCase ? (
        <Card className="mb-6 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-yellow-800 dark:text-yellow-200">
                Selecione um caso antes de prosseguir com a análise de imagem.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Upload Card */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" /> Upload de Imagem
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Database className="h-4 w-4" />
                  As análises são processadas e salvas no banco de dados local
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
                    <Input
                      type="file"
                      id="image-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                    <label 
                      htmlFor="image-upload" 
                      className="cursor-pointer flex flex-col items-center justify-center"
                    >
                      <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Arraste uma imagem aqui ou clique para fazer upload
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Formatos suportados: JPG, PNG, GIF, etc.
                      </p>
                    </label>
                  </div>

                  {image && (
                    <>
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                        <p className="text-green-800 dark:text-green-300 text-sm">
                          {image.name}
                        </p>
                      </div>
                      <Button
                        onClick={processImage}
                        disabled={isProcessing || isCheckingDb || !apiKeyAvailable}
                        className="w-full"
                      >
                        {isProcessing ? 'Processando com IA...' : isCheckingDb ? 'Verificando BD...' : 'Processar Imagem'}
                      </Button>
                      
                      {!apiKeyAvailable && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            <p className="text-yellow-800 dark:text-yellow-200">
                              Chave da API GROQ não configurada. Por favor, configure sua chave na aba de Configurações.
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Results and Face detection UI */}
            {image && image.ocrText && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" /> Resultados OCR
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
                    <pre className="whitespace-pre-wrap text-sm">{image.ocrText}</pre>
                  </div>
                  
                  {image.licensePlates && image.licensePlates.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Car size={16} />
                        Placas Veiculares Detectadas:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {image.licensePlates.map((plate, idx) => (
                          <Badge 
                            key={idx}
                            variant="secondary"
                            className="px-3 py-1.5 text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900"
                          >
                            {plate}
                          </Badge>
                        ))}
                      </div>
                      
                      {plateAlternatives.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                            <Tag size={14} />
                            Possíveis combinações (baixa confiança):
                          </h5>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {plateAlternatives.map((plate, idx) => (
                              <Badge 
                                key={idx}
                                variant="outline"
                                className="text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-800"
                              >
                                {plate}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {image && image.faces && image.faces.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scan className="h-5 w-5" /> Reconhecimento Facial
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Faces Detectadas: {image.faces.length}</h4>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowFaceBox(!showFaceBox)}
                        className="flex items-center gap-1.5"
                      >
                        {showFaceBox ? (
                          <>
                            <EyeOff size={14} />
                            <span>Ocultar Marcações</span>
                          </>
                        ) : (
                          <>
                            <Eye size={14} />
                            <span>Mostrar Marcações</span>
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {image.faces.map((face) => (
                        <div 
                          key={face.id}
                          className="bg-gray-50 dark:bg-gray-900 p-2 rounded-md text-center"
                        >
                          <div className="font-medium">Face {face.id}</div>
                          <div className="text-xs text-gray-500">
                            Confiança: {(face.confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {image && image.enhancementTechnique && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" /> Técnica de Melhoria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                    <p className="text-purple-800 dark:text-purple-300">
                      {image.enhancementTechnique}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Image Preview Card */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Visualização da Imagem</span>
                  {image && image.enhanced && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="flex items-center gap-1"
                      onClick={() => window.open(activeTab === 'original' ? image.original : image.enhanced, '_blank')}
                    >
                      <Maximize2 size={16} />
                      <span>Ampliar</span>
                    </Button>
                  )}
                </CardTitle>
                {image && image.enhanced && (
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="original">Original</TabsTrigger>
                      <TabsTrigger value="enhanced">Melhorada</TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              </CardHeader>
              <CardContent>
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center h-64 p-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 dark:border-gray-100" />
                    <p className="mt-4 text-gray-600 dark:text-gray-400">
                      Processando imagem com IA...
                    </p>
                  </div>
                ) : image ? (
                  <div className="bg-gray-50 dark:bg-gray-900 p-1 rounded-md relative" ref={imageContainerRef}>
                    <img 
                      src={activeTab === 'original' ? image.original : (image.enhanced || image.original)} 
                      alt="Imagem carregada" 
                      className="max-w-full h-auto rounded mx-auto"
                    />
                    
                    {activeTab === 'enhanced' && renderFaceBoxes()}
                    {activeTab === 'enhanced' && renderPlateBoxes()}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                    <ImageIcon className="h-16 w-16 opacity-20 mb-4" />
                    <p>Faça upload de uma imagem para visualizá-la</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageAnalysis;
