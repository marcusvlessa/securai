import { describe, it, expect, beforeEach } from 'vitest'
import { AIModelSelector, selectOptimalModel, getOptimalGroqModel } from '../services/aiSelectorService'

describe('AI Model Selector', () => {
  let selector: AIModelSelector

  beforeEach(() => {
    selector = AIModelSelector.getInstance()
  })

  describe('Seleção de modelos para texto', () => {
    it('deve selecionar modelo de alta precisão para investigações criminais', () => {
      const result = selector.selectModel({
        content: 'Análise de evidência criminal',
        type: 'text',
        context: 'criminal investigation'
      })

      expect(result.model).toBe('llama3-70b-8192')
      expect(result.reason).toContain('criminal')
    })

    it('deve selecionar modelo rápido para conteúdo simples', () => {
      const result = selector.selectModel({
        content: 'Texto simples',
        type: 'text',
        priority: 'speed'
      })

      expect(result.model).toBe('llama3-8b-8192')
      expect(result.reason).toContain('velocidade')
    })

    it('deve selecionar modelo preciso para conteúdo complexo', () => {
      const complexContent = 'Investigação policial criminal evidência forense análise'
      const result = selector.selectModel({
        content: complexContent,
        type: 'text',
        priority: 'accuracy'
      })

      expect(result.model).toBe('llama3-70b-8192')
      expect(result.reason).toContain('precisão')
    })
  })

  describe('Detecção de tipo de conteúdo', () => {
    it('deve detectar imagens pela extensão', () => {
      const type = selector.detectContentType('arquivo.jpg', 'jpg')
      expect(type).toBe('image')
    })

    it('deve detectar áudio pela extensão', () => {
      const type = selector.detectContentType('arquivo.mp3', 'mp3')
      expect(type).toBe('audio')
    })

    it('deve detectar URL de imagem', () => {
      const type = selector.detectContentType('https://example.com/image.png')
      expect(type).toBe('image')
    })

    it('deve defaultar para texto', () => {
      const type = selector.detectContentType('Texto normal')
      expect(type).toBe('text')
    })
  })

  describe('Análise de complexidade', () => {
    it('deve identificar baixa complexidade para texto curto', () => {
      const result = selector.selectModel({
        content: 'Texto curto',
        type: 'text'
      })

      // Deve usar modelo mais simples para texto curto
      expect(['llama3-8b-8192', 'gemma-7b-it']).toContain(result.model)
    })

    it('deve identificar alta complexidade para investigações', () => {
      const result = selector.selectModel({
        content: 'Relatório de investigação criminal com evidência forense',
        type: 'text',
        context: 'investigacao'
      })

      expect(result.model).toBe('llama3-70b-8192')
    })
  })

  describe('Seleção para diferentes tipos de arquivo', () => {
    it('deve selecionar modelo de visão para imagens', () => {
      const result = selector.selectModel({
        content: 'imagem.jpg',
        type: 'image'
      })

      expect(result.model).toBe('llava-v1.5-7b-4096-preview')
    })

    it('deve selecionar Whisper para áudio', () => {
      const result = selector.selectModel({
        content: 'audio.mp3',
        type: 'audio'
      })

      expect(result.model).toBe('whisper-large-v3')
    })

    it('deve selecionar modelo preciso para planilhas', () => {
      const result = selector.selectModel({
        content: 'dados.xlsx',
        type: 'file',
        fileExtension: 'xlsx'
      })

      expect(result.model).toBe('llama3-70b-8192')
      expect(result.reason).toContain('estruturados')
    })
  })

  describe('Funções de conveniência', () => {
    it('selectOptimalModel deve funcionar corretamente', () => {
      const result = selectOptimalModel({
        content: 'Teste',
        type: 'text'
      })

      expect(result).toHaveProperty('model')
      expect(result).toHaveProperty('reason')
    })

    it('getOptimalGroqModel deve retornar string do modelo', () => {
      const model = getOptimalGroqModel('Teste de investigação', 'criminal')
      expect(typeof model).toBe('string')
      expect(model).toBe('llama3-70b-8192')
    })
  })
})