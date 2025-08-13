import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Case {
  id: string;
  title: string;
  description: string;
  dateCreated: string;
  lastModified: string;
  status?: string;
}

interface CaseContextType {
  cases: Case[];
  currentCase: Case | null;
  addCase: (caseData: Omit<Case, 'id' | 'dateCreated' | 'lastModified'>) => void;
  setCurrentCase: (caseId: string) => void;
  saveToCurrentCase: (data: any, type: string) => void;
  getCaseData: (type: string) => any;
}

const CaseContext = createContext<CaseContextType | undefined>(undefined);

export const useCase = () => {
  const context = useContext(CaseContext);
  if (context === undefined) {
    throw new Error('useCase must be used within a CaseProvider');
  }
  return context;
};

export const CaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cases, setCases] = useState<Case[]>(() => {
    const savedCases = localStorage.getItem('securai-cases');
    return savedCases ? JSON.parse(savedCases) : [];
  });
  
  const [currentCase, setCurrentCaseState] = useState<Case | null>(() => {
    const currentCaseId = localStorage.getItem('securai-current-case');
    if (!currentCaseId) return null;
    
    const savedCases = localStorage.getItem('securai-cases');
    if (!savedCases) return null;
    
    const parsedCases: Case[] = JSON.parse(savedCases);
    return parsedCases.find(c => c.id === currentCaseId) || null;
  });

  useEffect(() => {
    localStorage.setItem('securai-cases', JSON.stringify(cases));
  }, [cases]);

  useEffect(() => {
    if (currentCase) {
      localStorage.setItem('securai-current-case', currentCase.id);
    } else {
      localStorage.removeItem('securai-current-case');
    }
  }, [currentCase]);

  const addCase = (caseData: Omit<Case, 'id' | 'dateCreated' | 'lastModified'>) => {
    const newCase: Case = {
      ...caseData,
      id: `case-${Date.now()}`,
      dateCreated: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      status: 'Ativo', // Default status
    };
    
    setCases(prevCases => [...prevCases, newCase]);
    setCurrentCaseState(newCase);
    
    // Initialize case data storage
    localStorage.setItem(`securai-case-${newCase.id}-data`, JSON.stringify({}));
  };

  const setCurrentCase = (caseId: string) => {
    const foundCase = cases.find(c => c.id === caseId) || null;
    setCurrentCaseState(foundCase);
  };

  const saveToCurrentCase = (data: any, type: string) => {
    if (!currentCase) return;
    
    const storageKey = `securai-case-${currentCase.id}-data`;
    const currentData = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    const updatedData = {
      ...currentData,
      [type]: Array.isArray(currentData[type]) 
        ? [...currentData[type], data] 
        : [data]
    };
    
    localStorage.setItem(storageKey, JSON.stringify(updatedData));
    
    // Update last modified timestamp
    setCases(prevCases => 
      prevCases.map(c => 
        c.id === currentCase.id 
          ? {...c, lastModified: new Date().toISOString()} 
          : c
      )
    );
  };

  const getCaseData = (type: string) => {
    if (!currentCase) return [];
    
    const storageKey = `securai-case-${currentCase.id}-data`;
    const currentData = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    return currentData[type] || [];
  };

  return (
    <CaseContext.Provider value={{
      cases,
      currentCase,
      addCase,
      setCurrentCase,
      saveToCurrentCase,
      getCaseData
    }}>
      {children}
    </CaseContext.Provider>
  );
};
