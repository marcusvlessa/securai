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
            label: node.label,
            type: node.type,
            degree: node.degree,
            centrality: node.centrality,
            properties: node.properties
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
            weight: edge.weight,
            properties: edge.properties
          },
          classes: [`edge-${edge.type.toLowerCase()}`]
        }))
      },
      style: [
        // Estilo dos nós
        {
          selector: 'node',
          style: {
            'background-color': '#3b82f6',
            'border-color': '#1e40af',
            'border-width': 2,
            'label': showLabels ? 'data(label)' : '',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': '80px',
            'font-size': '10px',
            'color': '#ffffff',
            'width': '60px',
            'height': '60px'
          }
        },
        // Estilo dos nós por tipo
        {
          selector: 'node.node-cpf',
          style: { 'background-color': '#ef4444' }
        },
        {
          selector: 'node.node-placa',
          style: { 'background-color': '#10b981' }
        },
        {
          selector: 'node.node-telefone',
          style: { 'background-color': '#f59e0b' }
        },
        {
          selector: 'node.node-email',
          style: { 'background-color': '#8b5cf6' }
        },
        {
          selector: 'node.node-pessoa',
          style: { 'background-color': '#06b6d4' }
        },
        {
          selector: 'node.node-endereco',
          style: { 'background-color': '#84cc16' }
        },
        // Estilo das arestas
        {
          selector: 'edge',
          style: {
            'width': 'data(weight)',
            'line-color': '#6b7280',
            'target-arrow-color': '#6b7280',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': showLabels ? 'data(label)' : '',
            'font-size': 8,
            'text-rotation': 'autorotate',
            'text-margin-y': -10
          }
        },
        // Estilo das arestas por tipo
        {
          selector: 'edge.edge-relacionamento',
          style: { 'line-color': '#6b7280' }
        },
        {
          selector: 'edge.edge-transação',
          style: { 'line-color': '#10b981' }
        },
        {
          selector: 'edge.edge-comunicação',
          style: { 'line-color': '#f59e0b' }
        }
      ],
      layout: {
        name: layout,
        ...(layout === 'dagre' ? {
          rankDir: 'TB',
          rankSep: 100,
          nodeSep: 50
        } : layout === 'cose' ? {
          animate: true,
          animationDuration: 1000,
          nodeRepulsion: 4500,
          nodeOverlap: 20
        } : {})
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
        const label = node.data('label').toLowerCase();
        if (label.includes(searchTerm.toLowerCase())) {
          node.style('background-color', '#fbbf24');
          node.style('border-color', '#d97706');
          node.style('border-width', 4);
        } else {
          node.style('background-color', '');
          node.style('border-color', '');
          node.style('border-width', 2);
        }
      });
    } else {
      cy.nodes().forEach(node => {
        node.style('background-color', '');
        node.style('border-color', '');
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
                  {layoutType.charAt(0).toUpperCase() + layoutType.slice(1)}
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

      {/* Visualização do grafo */}
      <Card>
        <CardHeader>
          <CardTitle>Visualização do Grafo</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            ref={containerRef}
            className="w-full h-[600px] border border-border rounded-lg bg-background"
            style={{ minHeight: '600px' }}
          />
        </CardContent>
      </Card>

      {/* Painel de detalhes */}
      {(selectedNode || selectedEdge) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedNode ? 'Detalhes da Entidade' : 'Detalhes do Relacionamento'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedNode && (
              <div className="space-y-3">
                <div>
                  <span className="font-medium">ID:</span> {selectedNode.id}
                </div>
                <div>
                  <span className="font-medium">Tipo:</span> 
                  <Badge variant="secondary" className="ml-2">{selectedNode.type}</Badge>
                </div>
                <div>
                  <span className="font-medium">Grau:</span> {selectedNode.degree} conexões
                </div>
                <div>
                  <span className="font-medium">Centralidade:</span> {(selectedNode.centrality * 100).toFixed(1)}%
                </div>
                {Object.keys(selectedNode.properties).length > 0 && (
                  <div>
                    <span className="font-medium">Propriedades:</span>
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      {Object.entries(selectedNode.properties).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedEdge && (
              <div className="space-y-3">
                <div>
                  <span className="font-medium">Origem:</span> {selectedEdge.source}
                </div>
                <div>
                  <span className="font-medium">Destino:</span> {selectedEdge.target}
                </div>
                <div>
                  <span className="font-medium">Tipo:</span> 
                  <Badge variant="secondary" className="ml-2">{selectedEdge.type}</Badge>
                </div>
                <div>
                  <span className="font-medium">Peso:</span> {selectedEdge.weight}
                </div>
                {Object.keys(selectedEdge.properties).length > 0 && (
                  <div>
                    <span className="font-medium">Propriedades:</span>
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      {Object.entries(selectedEdge.properties).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span> {String(value)}
                        </div>
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
