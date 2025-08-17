import React from 'react';

const TestPage = () => {
  console.log('TestPage: Rendering test page');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-green-800 mb-4">
          Página de Teste
        </h1>
        <p className="text-lg text-green-600 mb-4">
          Esta é uma página de teste simples para verificar se a roteagem está funcionando.
        </p>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Status: ✅ Funcionando
          </h2>
          <p className="text-gray-600">
            Se você está vendo esta página, a roteagem está funcionando corretamente.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestPage;
