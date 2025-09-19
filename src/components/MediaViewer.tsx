import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Eye,
  X
} from 'lucide-react';
import { InstagramMedia } from '@/services/instagramParserService';

interface MediaViewerProps {
  media: InstagramMedia;
  trigger?: React.ReactNode;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({ media, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleDownload = () => {
    const url = URL.createObjectURL(media.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = media.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const togglePlayPause = () => {
    if (media.type === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else if (media.type === 'audio' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    } else if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const resetControls = () => {
    setZoom(1);
    setRotation(0);
    setIsPlaying(false);
  };

  const renderMediaContent = () => {
    switch (media.type) {
      case 'image':
        return (
          <div className="relative flex items-center justify-center min-h-[400px]">
            <img
              src={URL.createObjectURL(media.blob)}
              alt={media.filename}
              className="max-w-full max-h-[70vh] object-contain transition-transform duration-300"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
              onLoad={() => console.log('Imagem carregada')}
              onError={() => console.error('Erro ao carregar imagem')}
            />
          </div>
        );

      case 'video':
        return (
          <div className="relative">
            <video
              ref={videoRef}
              src={URL.createObjectURL(media.blob)}
              className="w-full max-h-[70vh] object-contain"
              controls={false}
              muted={isMuted}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            <div className="absolute bottom-4 left-4 flex gap-2">
              <Button size="sm" variant="secondary" onClick={togglePlayPause}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="secondary" onClick={toggleMute}>
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        );

      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center min-h-[300px] space-y-6">
            <div className="text-center">
              <Volume2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium">{media.filename}</h3>
              <p className="text-sm text-muted-foreground">Arquivo de áudio</p>
            </div>

            <audio
              ref={audioRef}
              src={URL.createObjectURL(media.blob)}
              className="w-full max-w-md"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />

            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={togglePlayPause}>
                {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isPlaying ? 'Pausar' : 'Reproduzir'}
              </Button>
              <Button size="sm" variant="secondary" onClick={toggleMute}>
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>

            {/* Transcrição se disponível */}
            {media.transcript && (
              <div className="mt-4 p-4 bg-muted rounded-lg max-w-md">
                <h4 className="font-medium mb-2">Transcrição:</h4>
                <p className="text-sm">{media.transcript}</p>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[300px]">
            <div className="text-center">
              <Eye className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium">Visualização não disponível</h3>
              <p className="text-sm text-muted-foreground">
                Tipo de arquivo não suportado: {media.type}
              </p>
            </div>
          </div>
        );
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Eye className="h-3 w-3" />
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetControls();
    }}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="flex-1">
            <DialogTitle className="truncate">{media.filename}</DialogTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{media.type.toUpperCase()}</Badge>
              <span className="text-sm text-muted-foreground">
                {media.blob.size ? (media.blob.size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}
              </span>
              {media.blob && (
                <span className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {media.type === 'image' && (
              <>
                <Button size="sm" variant="outline" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleRotate}>
                  <RotateCw className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="mt-4">
          {renderMediaContent()}
        </div>

        {/* Informações adicionais */}
        {(media.classification || media.transcript) && (
          <div className="mt-4 space-y-3 border-t pt-4">
            {media.classification && (
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium mb-1">Classificação IA:</h4>
                <p className="text-sm">{media.classification}</p>
              </div>
            )}
            {media.transcript && media.type !== 'audio' && (
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium mb-1">Transcrição:</h4>
                <p className="text-sm">{media.transcript}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};