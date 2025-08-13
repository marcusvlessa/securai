
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
    setCurrentCase(caseId);
    toast.success('Caso selecionado');
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return 'Data inválida';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Gerenciamento de Casos
        </h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Caso
        </Button>
      </div>

      {cases.length === 0 ? (
        <div className="text-center p-8 bg-gray-100 dark:bg-gray-900 rounded-lg">
          <Folder className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Nenhum caso encontrado
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
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
              className={`bg-white dark:bg-gray-800 rounded-lg border-2 ${
                currentCase?.id === caseItem.id 
                  ? 'border-blue-500 dark:border-blue-400' 
                  : 'border-transparent'
              } p-6 shadow-md hover:shadow-lg transition-all`}
            >
              <div className="flex justify-between items-start mb-4">
                <Folder className="h-8 w-8 text-blue-500" />
                {currentCase?.id === caseItem.id && (
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                    Ativo
                  </span>
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                {caseItem.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                {caseItem.description || 'Sem descrição'}
              </p>
              <div className="flex flex-col space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Criado em: {formatDate(caseItem.dateCreated)}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>Modificado em: {formatDate(caseItem.lastModified)}</span>
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
