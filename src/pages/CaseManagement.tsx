
import React, { useState } from 'react';
import { Folder, Plus, Calendar, Clock, ArrowRight } from 'lucide-react';
import { useCase } from '../contexts/CaseContext';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { format } from 'date-fns';
import { toast } from 'sonner';

const CaseManagement = () => {
  const { cases, currentCase, addCase, setCurrentCase } = useCase();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCaseDescription, setNewCaseDescription] = useState('');

  const handleCreateCase = () => {
    if (!newCaseTitle.trim()) {
      toast.error('O título do caso é obrigatório');
      return;
    }

    addCase({
      title: newCaseTitle,
      description: newCaseDescription
    });

    setIsCreateDialogOpen(false);
    setNewCaseTitle('');
    setNewCaseDescription('');
    toast.success('Caso criado com sucesso');
  };

  const handleSelectCase = (caseId: string) => {
    const selectedCase = cases.find(c => c.id === caseId);
    if (selectedCase) {
      setCurrentCase(selectedCase);
      toast.success('Caso selecionado');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return 'Data inválida';
    }
  };

  return (
    <div className="page-container py-6">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <Folder className="h-8 w-8 text-brand" />
              Gerenciamento de Casos
            </h1>
            <p className="page-description">
              Organize e gerencie seus casos de investigação
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Caso
          </Button>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="empty-state">
          <Folder className="mx-auto h-16 w-16 text-muted-foreground opacity-20 mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Nenhum caso encontrado
          </h3>
          <p className="text-muted-foreground mb-6">
            Crie um novo caso para começar a trabalhar
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Criar Caso
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((caseItem) => (
            <div 
              key={caseItem.id}
              className={`feature-card p-6 ${
                currentCase?.id === caseItem.id 
                  ? 'border-brand bg-brand-light' 
                  : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <Folder className="h-8 w-8 text-brand" />
                {currentCase?.id === caseItem.id && (
                  <span className="status-active">
                    Ativo
                  </span>
                )}
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">
                {caseItem.title}
              </h3>
              <p className="text-muted-foreground mb-4 line-clamp-2">
                {caseItem.description || 'Sem descrição'}
              </p>
              <div className="flex flex-col space-y-2 text-sm text-muted-foreground mb-4">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Criado em: {formatDate(caseItem.created_at)}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>Modificado em: {formatDate(caseItem.updated_at)}</span>
                </div>
              </div>
              <Button 
                variant={currentCase?.id === caseItem.id ? "secondary" : "default"}
                className="w-full"
                onClick={() => handleSelectCase(caseItem.id)}
              >
                {currentCase?.id === caseItem.id ? 'Caso Selecionado' : 'Selecionar Caso'} 
                {currentCase?.id !== caseItem.id && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Caso</DialogTitle>
            <DialogDescription>
              Preencha as informações para criar um novo caso de investigação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Título do Caso
              </label>
              <Input
                id="title"
                placeholder="Ex: Investigação 001/2023"
                value={newCaseTitle}
                onChange={(e) => setNewCaseTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Descrição
              </label>
              <Textarea
                id="description"
                placeholder="Descreva os detalhes iniciais do caso..."
                value={newCaseDescription}
                onChange={(e) => setNewCaseDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCase}>
              Criar Caso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaseManagement;
