import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Filter, 
  Search,
  Eye,
  EyeOff,
  Settings,
  BarChart3,
  Network,
  Users,
  Link
} from 'lucide-react';
import { LinkGraph, LinkNode, LinkEdge } from '@/services/linkAnalysisService';

// Registrar extensões do Cytoscape
cytoscape.use(dagre);

interface AdvancedLinkGraphProps {
  graph: LinkGraph;
  onNodeClick?: (node: LinkNode) => void;
  onEdgeClick?: (edge: LinkEdge) => void;
  className?: string;
}

export const AdvancedLinkGraph: React.FC<AdvancedLinkGraphProps> = ({
  graph,
  onNodeClick,
  onEdgeClick,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<LinkNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<LinkEdge | null>(null);
  const [layout, setLayout] = useState<'dagre' | 'cose' | 'random'>('dagre');
  const [showLabels, setShowLabels] = useState(true);
  const [filteredNodeTypes, setFilteredNodeTypes] = useState<string[]>([]);
  const [filteredEdgeTypes, setFilteredEdgeTypes] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Função para truncar labels longos
  const truncateLabel = (label: string, maxLength: number = 20): string => {
    if (label.length <= maxLength) return label;
    return label.substring(0, maxLength) + '...';
  };

  // Função para determinar cor do nó baseado no tipo
  const getNodeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      'cpf': '#ef4444',
      'cnpj': '#3b82f6', 
      'telefone': '#f59e0b',
      'email': '#8b5cf6',
      'pessoa': '#06b6d4',
      'endereco': '#84cc16',
      'placa': '#10b981',
      'banco': '#f97316',
      'conta': '#14b8a6',
      'empresa': '#6366f1',
      'default': '#6b7280'
    };
    return colorMap[type.toLowerCase()] || colorMap.default;
  };

  // Função para determinar cor da borda do nó
  const getNodeBorderColor = (type: string): string => {
    const color = getNodeColor(type);
    // Retorna uma versão mais escura da cor do nó
    return color.replace('4', '6').replace('5', '7');
  };

  // Função para determinar forma do nó baseado no tipo
  const getNodeShape = (type: string): string => {
    const shapeMap: Record<string, string> = {
      'cpf': 'round-rectangle',
      'cnpj': 'rectangle',
      'telefone': 'round-tag',
      'email': 'round-diamond',
      'pessoa': 'ellipse',
      'endereco': 'round-hexagon',
      'placa': 'round-octagon',
      'banco': 'diamond',
      'conta': 'hexagon',
      'empresa': 'rectangle',
      'default': 'ellipse'
    };
    return shapeMap[type.toLowerCase()] || shapeMap.default;
  };

  // Função para determinar cor da aresta baseado no tipo
  const getEdgeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      'relacionamento': '#6b7280',
      'transacao': '#10b981',
      'comunicacao': '#f59e0b',
      'vinculo': '#8b5cf6',
      'propriedade': '#06b6d4',
      'parentesco': '#ef4444',
      'default': '#6b7280'
    };
    return colorMap[type.toLowerCase()] || colorMap.default;
  };

  // Inicializar grafo
  useEffect(() => {
    if (!containerRef.current || !graph) return;

    // Limpar grafo anterior
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // Criar instância do Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements: {
        nodes: graph.nodes.map(node => ({
          data: {
            id: node.id,
            label: truncateLabel(node.label),
            fullLabel: node.label,
            type: node.type,
            degree: node.degree,
            centrality: node.centrality,
            properties: node.properties,
            nodeColor: getNodeColor(node.type),
            borderColor: getNodeBorderColor(node.type)
          },
          classes: [`node-${node.type.toLowerCase()}`, `degree-${Math.min(Math.floor(node.degree / 2), 5)}`]
        })),
        edges: graph.edges.map(edge => ({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.label,
            type: edge.type,
            weight: Math.min(Math.max(edge.weight, 1), 10),
            properties: edge.properties,
            edgeColor: getEdgeColor(edge.type)
          },
          classes: [`edge-${edge.type.toLowerCase()}`]
        }))
      },
      style: [
        // Estilo dos nós
        {
          selector: 'node',
          style: {
            'background-color': 'data(nodeColor)',
            'border-color': 'data(borderColor)',
            'border-width': 2,
            'label': showLabels ? 'data(label)' : '',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': '120px',
            'font-size': '11px',
            'color': '#ffffff',
            'text-outline-color': '#000000',
            'text-outline-width': 1,
            'width': 'mapData(degree, 0, 20, 40, 100)',
            'height': 'mapData(degree, 0, 20, 40, 100)',
            'shape': 'ellipse'
          }
        },
        // Estilos específicos por tipo de nó
        {
          selector: 'node.node-cpf',
          style: { 'shape': 'round-rectangle' }
        },
        {
          selector: 'node.node-cnpj',
          style: { 'shape': 'rectangle' }
        },
        {
          selector: 'node.node-telefone',
          style: { 'shape': 'round-tag' }
        },
        {
          selector: 'node.node-email',
          style: { 'shape': 'round-diamond' }
        },
        {
          selector: 'node.node-endereco',
          style: { 'shape': 'round-hexagon' }
        },
        {
          selector: 'node.node-placa',
          style: { 'shape': 'round-octagon' }
        },
        {
          selector: 'node.node-banco',
          style: { 'shape': 'diamond' }
        },
        {
          selector: 'node.node-conta',
          style: { 'shape': 'hexagon' }
        },
        {
          selector: 'node.node-empresa',
          style: { 'shape': 'rectangle' }
        },
        // Estilo das arestas
        {
          selector: 'edge',
          style: {
            'width': 'mapData(weight, 1, 10, 2, 8)',
            'line-color': 'data(edgeColor)',
            'target-arrow-color': 'data(edgeColor)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'unbundled-bezier',
            'control-point-distances': [20, -20],
            'control-point-weights': [0.25, 0.75],
            'label': showLabels ? 'data(label)' : '',
            'font-size': '9px',
            'text-rotation': 'autorotate',
            'text-margin-y': -8,
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.8,
            'text-background-padding': '2px',
            'opacity': 0.8
          }
        },
        // Nós selecionados
        {
          selector: 'node:selected',
          style: {
            'border-color': '#fbbf24',
            'border-width': 4,
            'overlay-color': '#fbbf24',
            'overlay-opacity': 0.2,
            'overlay-padding': '8px'
          }
        },
        // Arestas selecionadas
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#fbbf24',
            'target-arrow-color': '#fbbf24',
            'width': 6,
            'opacity': 1
          }
        }
      ],
      layout: {
        name: layout,
        ...(layout === 'dagre' ? {
          rankDir: 'TB',
          rankSep: 150,
          nodeSep: 80,
          edgeSep: 20,
          ranker: 'longest-path'
        } : layout === 'cose' ? {
          animate: true,
          animationDuration: 2000,
          nodeRepulsion: 8000,
          nodeOverlap: 30,
          idealEdgeLength: 150,
          edgeElasticity: 0.45,
          nestingFactor: 0.1,
          gravity: 0.25,
          numIter: 2000,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0
        } : {
          animate: true,
          animationDuration: 1000
        })
      }
    });

    // Eventos dos nós
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nodeData = node.data();
      const linkNode = graph.nodes.find(n => n.id === nodeData.id);
      
      if (linkNode) {
        setSelectedNode(linkNode);
        setSelectedEdge(null);
        onNodeClick?.(linkNode);
      }
    });

    // Eventos das arestas
    cy.on('tap', 'edge', (evt) => {
      const edge = evt.target;
      const edgeData = edge.data();
      const linkEdge = graph.edges.find(e => e.id === edgeData.id);
      
      if (linkEdge) {
        setSelectedEdge(linkEdge);
        setSelectedNode(null);
        onEdgeClick?.(linkEdge);
      }
    });

    // Evento de clique no fundo
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
        setSelectedEdge(null);
      }
    });

    // Tooltip para nós
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      const fullLabel = node.data('fullLabel');
      node.qtip({
        content: fullLabel,
        show: { event: evt.type, ready: true },
        hide: { event: 'mouseout unfocus' }
      });
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [graph, layout, showLabels, onNodeClick, onEdgeClick]);

  // Aplicar filtros
  useEffect(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;

    // Filtrar nós por tipo
    if (filteredNodeTypes.length > 0) {
      cy.nodes().forEach(node => {
        const nodeType = node.data('type');
        if (filteredNodeTypes.includes(nodeType)) {
          node.style('display', 'element');
        } else {
          node.style('display', 'none');
        }
      });
    } else {
      cy.nodes().style('display', 'element');
    }

    // Filtrar arestas por tipo
    if (filteredEdgeTypes.length > 0) {
      cy.edges().forEach(edge => {
        const edgeType = edge.data('type');
        if (filteredEdgeTypes.includes(edgeType)) {
          edge.style('display', 'element');
        } else {
          edge.style('display', 'none');
        }
      });
    } else {
      cy.edges().style('display', 'element');
    }

    // Aplicar busca
    if (searchTerm) {
      cy.nodes().forEach(node => {
        const label = node.data('fullLabel').toLowerCase();
        if (label.includes(searchTerm.toLowerCase())) {
          node.style('background-color', '#fbbf24');
          node.style('border-color', '#d97706');
          node.style('border-width', 4);
        } else {
          // Resetar estilo para cor original
          node.style('background-color', node.data('nodeColor'));
          node.style('border-color', node.data('borderColor'));
          node.style('border-width', 2);
        }
      });
    } else {
      cy.nodes().forEach(node => {
        // Resetar estilo para cor original
        node.style('background-color', node.data('nodeColor'));
        node.style('border-color', node.data('borderColor'));
        node.style('border-width', 2);
      });
    }
  }, [filteredNodeTypes, filteredEdgeTypes, searchTerm]);

  // Funções de controle
  const zoomIn = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.zoom({
        level: cyRef.current.zoom() * 1.2,
        renderedPosition: { x: 0, y: 0 }
      });
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.zoom({
        level: cyRef.current.zoom() / 1.2,
        renderedPosition: { x: 0, y: 0 }
      });
    }
  }, []);

  const resetView = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.fit();
      cyRef.current.center();
    }
  }, []);

  const changeLayout = useCallback((newLayout: 'dagre' | 'cose' | 'random') => {
    setLayout(newLayout);
  }, []);

  const exportGraph = useCallback(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;
    const png = cy.png({
      scale: 2,
      full: true,
      bg: '#ffffff'
    });

    // Converter string para blob se necessário
    const blob = typeof png === 'string' ? 
      fetch(png).then(r => r.blob()) : 
      Promise.resolve(png);
    
    blob.then(pngBlob => {
      const url = URL.createObjectURL(pngBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grafo-vinculos-${new Date().toISOString().split('T')[0]}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }, []);

  const toggleNodeType = useCallback((nodeType: string) => {
    setFilteredNodeTypes(prev => 
      prev.includes(nodeType) 
        ? prev.filter(t => t !== nodeType)
        : [...prev, nodeType]
    );
  }, []);

  const toggleEdgeType = useCallback((edgeType: string) => {
    setFilteredEdgeTypes(prev => 
      prev.includes(edgeType) 
        ? prev.filter(t => t !== edgeType)
        : [...prev, edgeType]
    );
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controles do grafo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Controles do Grafo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controles de zoom e layout */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={zoomIn}>
              <ZoomIn className="h-4 w-4 mr-2" />
              Zoom +
            </Button>
            <Button variant="outline" size="sm" onClick={zoomOut}>
              <ZoomOut className="h-4 w-4 mr-2" />
              Zoom -
            </Button>
            <Button variant="outline" size="sm" onClick={resetView}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Resetar
            </Button>
            <Button variant="outline" size="sm" onClick={exportGraph}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>

          {/* Seleção de layout */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Layout:</span>
            <div className="flex gap-1">
              {(['dagre', 'cose', 'random'] as const).map(layoutType => (
                <Button
                  key={layoutType}
                  variant={layout === layoutType ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => changeLayout(layoutType)}
                >
                  {layoutType === 'dagre' ? 'Hierárquico' : layoutType === 'cose' ? 'Força' : 'Aleatório'}
                </Button>
              ))}
            </div>
          </div>

          {/* Controles de visualização */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLabels(!showLabels)}
            >
              {showLabels ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showLabels ? 'Ocultar' : 'Mostrar'} Labels
            </Button>
          </div>

          {/* Busca */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar entidades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-input rounded-md text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros de nós */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Tipos de Entidades
            </h4>
            <div className="flex flex-wrap gap-2">
              {graph.metadata.nodeTypes.map(nodeType => (
                <Badge
                  key={nodeType}
                  variant={filteredNodeTypes.includes(nodeType) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleNodeType(nodeType)}
                  style={{ 
                    backgroundColor: filteredNodeTypes.includes(nodeType) ? getNodeColor(nodeType) : undefined,
                    borderColor: getNodeColor(nodeType)
                  }}
                >
                  {nodeType}
                </Badge>
              ))}
            </div>
          </div>

          {/* Filtros de arestas */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Link className="h-4 w-4" />
              Tipos de Relacionamentos
            </h4>
            <div className="flex flex-wrap gap-2">
              {graph.metadata.edgeTypes.map(edgeType => (
                <Badge
                  key={edgeType}
                  variant={filteredEdgeTypes.includes(edgeType) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleEdgeType(edgeType)}
                  style={{ 
                    backgroundColor: filteredEdgeTypes.includes(edgeType) ? getEdgeColor(edgeType) : undefined,
                    borderColor: getEdgeColor(edgeType)
                  }}
                >
                  {edgeType}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas do grafo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Estatísticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{graph.metadata.totalNodes}</div>
              <div className="text-sm text-muted-foreground">Entidades</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{graph.metadata.totalEdges}</div>
              <div className="text-sm text-muted-foreground">Relacionamentos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{graph.metadata.density.toFixed(3)}</div>
              <div className="text-sm text-muted-foreground">Densidade</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{graph.metadata.averageDegree.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">Grau Médio</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Container do grafo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Grafo de Vínculos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            ref={containerRef}
            className="w-full h-[600px] border border-border rounded-lg bg-background"
            style={{ minHeight: '600px' }}
          />
        </CardContent>
      </Card>

      {/* Detalhes da seleção */}
      {(selectedNode || selectedEdge) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detalhes da Seleção
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedNode && (
              <div className="space-y-2">
                <h4 className="font-medium">Nó: {selectedNode.label}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Tipo:</strong> {selectedNode.type}</div>
                  <div><strong>Grau:</strong> {selectedNode.degree}</div>
                  <div><strong>Centralidade:</strong> {selectedNode.centrality.toFixed(3)}</div>
                </div>
                {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                  <div className="mt-2">
                    <strong>Propriedades:</strong>
                    <div className="text-sm text-muted-foreground">
                      {Object.entries(selectedNode.properties).map(([key, value]) => (
                        <div key={key}>{key}: {String(value)}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedEdge && (
              <div className="space-y-2">
                <h4 className="font-medium">Relacionamento: {selectedEdge.label}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>De:</strong> {selectedEdge.source}</div>
                  <div><strong>Para:</strong> {selectedEdge.target}</div>
                  <div><strong>Tipo:</strong> {selectedEdge.type}</div>
                  <div><strong>Peso:</strong> {selectedEdge.weight}</div>
                </div>
                {selectedEdge.properties && Object.keys(selectedEdge.properties).length > 0 && (
                  <div className="mt-2">
                    <strong>Propriedades:</strong>
                    <div className="text-sm text-muted-foreground">
                      {Object.entries(selectedEdge.properties).map(([key, value]) => (
                        <div key={key}>{key}: {String(value)}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};