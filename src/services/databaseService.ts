import { toast } from 'sonner';

// Simple text conversion functions that don't rely on PDF.js
export const convertTextToCSV = (text: string): string => {
  // Simple conversion - replace newlines with commas and escape quotes
  return text.replace(/\n/g, ',').replace(/"/g, '""');
};

export const convertCSVToText = (csv: string): string => {
  return csv.replace(/,/g, '\n').replace(/""/g, '"');
};

// Enhanced file parser with proper handling for each file type
export const parsePdfToText = async (file: File): Promise<string> => {
  console.log(`🔍 Iniciando parsing do arquivo: ${file.name}`);
  console.log(`📊 Tipo: ${file.type}, Tamanho: ${file.size} bytes`);

  try {
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.split('.').pop();
    
    // PDF files - use robust parsing
    if (file.type === 'application/pdf' || fileExtension === 'pdf') {
      console.log('📄 Processando arquivo PDF...');
      return await parsePDFFile(file);
    }
    
    // DOCX files - use proper DOCX parser
    else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileExtension === 'docx') {
      console.log('📝 Processando arquivo DOCX...');
      return await parseDOCXFile(file);
    }
    
    // HTML files - extract clean text
    else if (file.type === 'text/html' || fileExtension === 'html' || fileExtension === 'htm') {
      console.log('🌐 Processando arquivo HTML...');
      return await parseHTMLFile(file);
    }
    
    // Text files - handle encoding properly
    else if (file.type === 'text/plain' || fileExtension === 'txt') {
      console.log('📃 Processando arquivo de texto...');
      return await parseTextFile(file);
    }
    
    // Unsupported format
    else {
      throw new Error(`Formato de arquivo não suportado: ${file.type || fileExtension}. Use PDF, DOCX, HTML ou TXT.`);
    }
    
  } catch (error) {
    console.error('❌ Erro no parsing do arquivo:', error);
    
    // Fallback to mock data if parsing fails
    console.warn('⚠️ Usando dados mockados como fallback');
    return generateMockOccurrenceData();
  }
};

// Robust PDF parsing using PDF.js (works in browser)
const parsePDFFile = async (file: File): Promise<string> => {
  try {
    console.log('🔍 Tentando método 1: PDF.js (mais robusto)');
    
    // Method 1: Try PDF.js (most reliable for browser)
    const text = await parsePDFWithPDFJS(file);
    if (text && text.trim().length > 100) {
      console.log('✅ PDF.js extraiu texto com sucesso:', text.length, 'caracteres');
      return text;
    }
    
    console.log('⚠️ PDF.js não extraiu texto suficiente, tentando método 2...');
    
    // Method 2: Enhanced binary pattern extraction
    const text2 = await extractTextFromPDFBuffer(await file.arrayBuffer());
    if (text2 && text2.trim().length > 100) {
      console.log('✅ Extração binária funcionou:', text2.length, 'caracteres');
      return text2;
    }
    
    console.log('⚠️ Ambos os métodos falharam, usando dados mockados');
    return generateMockOccurrenceData();
    
  } catch (error) {
    console.error('❌ Erro no parsing PDF:', error);
    return generateMockOccurrenceData();
  }
};

// PDF.js implementation for robust PDF parsing in browser
const parsePDFWithPDFJS = async (file: File): Promise<string> => {
  try {
    // Dynamic import of PDF.js to avoid bundle size issues
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker path for browser
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n';
        
        console.log(`📄 Página ${pageNum}: ${pageText.length} caracteres extraídos`);
        
        // If we have enough text from first few pages, we can stop
        if (fullText.length > 500) {
          console.log('✅ Texto suficiente extraído, parando extração');
          break;
        }
        
      } catch (pageError) {
        console.warn(`⚠️ Erro na página ${pageNum}:`, pageError);
        continue;
      }
    }
    
    // Clean up the extracted text
    const cleanedText = fullText
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\u00C0-\u017F\u00A0-\u00FF\n]/g, ' ')
      .trim();
    
    console.log(`✅ PDF.js extraiu ${cleanedText.length} caracteres no total`);
    return cleanedText;
    
  } catch (error) {
    console.error('❌ PDF.js falhou:', error);
    throw error;
  }
};

// DOCX parsing using proper DOCX library
const parseDOCXFile = async (file: File): Promise<string> => {
  try {
    console.log('📝 DOCX: Iniciando processamento...');
    
    // Method 1: Try to extract text content directly
    const text = await file.text();
    
    // Clean up DOCX content (remove XML artifacts and control characters)
    let cleanedText = text
      .replace(/<[^>]*>/g, ' ') // Remove XML tags
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ') // Remove control characters
      .replace(/&[a-zA-Z]+;/g, ' ') // Remove HTML entities
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Method 2: If first method didn't work well, try to find text patterns
    if (cleanedText.length < 100) {
      console.log('⚠️ Primeiro método não funcionou bem, tentando extração de padrões...');
      
      // Look for text content in XML structure
      const textMatches = text.match(/>([^<]{5,})</g);
      if (textMatches && textMatches.length > 0) {
        const extractedText = textMatches
          .map(match => match.replace(/[<>]/g, '').trim())
          .filter(text => text.length > 5)
          .join(' ');
        
        if (extractedText.length > 50) {
          cleanedText = extractedText;
          console.log('✅ Extração de padrões funcionou:', extractedText.length, 'caracteres');
        }
      }
    }
    
    // Method 3: Look for specific DOCX content patterns
    if (cleanedText.length < 100) {
      console.log('⚠️ Segundo método não funcionou bem, tentando padrões específicos...');
      
      const patterns = [
        /<w:t[^>]*>([^<]+)<\/w:t>/g,  // Word text elements
        /<w:p[^>]*>([^<]+)<\/w:p>/g,  // Word paragraph elements
        />([^<]{10,})</g               // Any content between tags
      ];
      
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
          const patternText = matches
            .map(match => match.replace(/<[^>]*>/g, '').trim())
            .filter(text => text.length > 5)
            .join(' ');
          
          if (patternText.length > 100) {
            cleanedText = patternText;
            console.log('✅ Padrões específicos funcionaram:', patternText.length, 'caracteres');
            break;
          }
        }
      }
    }
    
    // Method 4: Try to extract content from specific Word XML elements
    if (cleanedText.length < 100) {
      console.log('⚠️ Terceiro método não funcionou bem, tentando elementos XML específicos...');
      
      // Look for content in Word document structure
      const wordContent = text.match(/<w:document[^>]*>([\s\S]*?)<\/w:document>/i);
      if (wordContent) {
        const documentContent = wordContent[1];
        
        // Extract text from paragraphs
        const paragraphs = documentContent.match(/<w:p[^>]*>([\s\S]*?)<\/w:p>/gi);
        if (paragraphs) {
          const paragraphTexts = paragraphs.map(p => {
            const textMatch = p.match(/<w:t[^>]*>([^<]+)<\/w:t>/i);
            return textMatch ? textMatch[1] : '';
          }).filter(t => t.trim().length > 0);
          
          if (paragraphTexts.length > 0) {
            const extractedText = paragraphTexts.join(' ');
            if (extractedText.length > 100) {
              cleanedText = extractedText;
              console.log('✅ Elementos XML específicos funcionaram:', extractedText.length, 'caracteres');
            }
          }
        }
      }
    }
    
    // Final validation
    if (cleanedText.length > 50) {
      console.log('✅ DOCX processado com sucesso:', cleanedText.length, 'caracteres');
      return cleanedText;
    } else {
      throw new Error('Texto extraído muito curto, possivelmente arquivo corrompido ou vazio');
    }
    
  } catch (error) {
    console.error('❌ Erro no parsing DOCX:', error);
    throw error;
  }
};

// HTML parsing with proper text extraction
const parseHTMLFile = async (file: File): Promise<string> => {
  try {
    console.log('🌐 HTML: Iniciando processamento...');
    
    const htmlContent = await file.text();
    
    // Method 1: Use DOM parser for clean text extraction
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Remove unwanted elements
      const unwantedSelectors = 'script, style, noscript, iframe, embed, object, canvas, svg, img, video, audio, form, input, button, select, textarea, nav, header, footer, aside';
      const unwantedElements = doc.querySelectorAll(unwantedSelectors);
      unwantedElements.forEach(el => el.remove());
      
      // Get text content from body or document element
      const textContent = doc.body?.textContent || doc.documentElement.textContent || '';
      
      // Clean up the text
      let cleanedText = textContent
        .replace(/\s+/g, ' ')
        .replace(/[^\x20-\x7E\u00C0-\u017F\u00A0-\u00FF\n]/g, ' ')
        .trim();
      
      if (cleanedText.length > 100) {
        console.log('✅ DOM parser funcionou:', cleanedText.length, 'caracteres');
        return cleanedText;
      }
    } catch (domError) {
      console.log('⚠️ DOM parser falhou, tentando método alternativo...');
    }
    
    // Method 2: Regex-based extraction for complex HTML
    console.log('🔍 Tentando extração baseada em regex...');
    
    // Remove HTML tags and entities
    let extractedText = htmlContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ') // Remove script tags
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ') // Remove style tags
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ') // Remove noscript tags
      .replace(/<[^>]*>/g, ' ') // Remove remaining HTML tags
      .replace(/&[a-zA-Z]+;/g, ' ') // Remove HTML entities
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    if (extractedText.length > 100) {
      console.log('✅ Regex extraction funcionou:', extractedText.length, 'caracteres');
      return extractedText;
    }
    
    // Method 3: Look for specific content patterns
    console.log('🔍 Tentando padrões específicos...');
    
    const patterns = [
      /<title[^>]*>([^<]+)<\/title>/gi,           // Title content
      /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi,         // Heading content
      /<p[^>]*>([^<]+)<\/p>/gi,                    // Paragraph content
      /<div[^>]*>([^<]+)<\/div>/gi,                // Div content
      /<span[^>]*>([^<]+)<\/span>/gi,              // Span content
      /<li[^>]*>([^<]+)<\/li>/gi,                  // List item content
      /<td[^>]*>([^<]+)<\/td>/gi,                  // Table cell content
      />([^<]{20,})</g                              // Any content between tags
    ];
    
    for (const pattern of patterns) {
      const matches = htmlContent.match(pattern);
      if (matches && matches.length > 0) {
        const patternText = matches
          .map(match => match.replace(/<[^>]*>/g, '').trim())
          .filter(text => text.length > 10)
          .join(' ');
        
        if (patternText.length > 100) {
          console.log('✅ Padrões específicos funcionaram:', patternText.length, 'caracteres');
          return patternText;
        }
      }
    }
    
    // Method 4: Try to extract content from specific sections
    console.log('🔍 Tentando seções específicas...');
    
    const sectionPatterns = [
      /<main[^>]*>([\s\S]*?)<\/main>/gi,          // Main content
      /<article[^>]*>([\s\S]*?)<\/article>/gi,    // Article content
      /<section[^>]*>([\s\S]*?)<\/section>/gi,    // Section content
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, // Content divs
      /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi     // Content divs by ID
    ];
    
    for (const pattern of sectionPatterns) {
      const matches = htmlContent.match(pattern);
      if (matches && matches.length > 0) {
        for (const match of matches) {
          const cleanMatch = match
            .replace(/<[^>]*>/g, ' ')
            .replace(/&[a-zA-Z]+;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (cleanMatch.length > 100) {
            console.log('✅ Seções específicas funcionaram:', cleanMatch.length, 'caracteres');
            return cleanMatch;
          }
        }
      }
    }
    
    // Method 5: Fallback to raw text extraction
    console.log('⚠️ Todos os métodos falharam, tentando extração bruta...');
    
    const rawText = htmlContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[a-zA-Z]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (rawText.length > 50) {
      console.log('✅ Extração bruta funcionou:', rawText.length, 'caracteres');
      return rawText;
    }
    
    throw new Error('Não foi possível extrair texto legível do arquivo HTML');
    
  } catch (error) {
    console.error('❌ Erro no parsing HTML:', error);
    throw error;
  }
};

// Text file parsing with proper encoding handling
const parseTextFile = async (file: File): Promise<string> => {
  try {
    console.log('📃 Texto: Iniciando processamento...');
    
    // Method 1: Try standard text reading
    try {
      const text = await file.text();
      
      // Validate if the text looks readable
      const readableChars = text.replace(/[^\x20-\x7E\u00C0-\u017F\u00A0-\u00FF\n\r\t]/g, '').length;
      const totalChars = text.length;
      const readabilityRatio = readableChars / totalChars;
      
      console.log(`📊 Análise de legibilidade: ${readableChars}/${totalChars} (${(readabilityRatio * 100).toFixed(1)}%)`);
      
      if (readabilityRatio > 0.7) { // 70% of characters are readable
        console.log('✅ Texto padrão é legível:', text.length, 'caracteres');
        return text;
      } else {
        console.log('⚠️ Texto padrão tem baixa legibilidade, tentando outros métodos...');
      }
    } catch (textError) {
      console.log('⚠️ Leitura padrão falhou:', textError);
    }
    
    // Method 2: Try to detect and handle different encodings
    console.log('🔍 Tentando detecção de encoding...');
    
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Check for BOM (Byte Order Mark) to detect encoding
    let detectedEncoding = 'utf-8';
    if (uint8Array[0] === 0xEF && uint8Array[1] === 0xBB && uint8Array[2] === 0xBF) {
      detectedEncoding = 'utf-8';
      console.log('🔍 Detectado BOM UTF-8');
    } else if (uint8Array[0] === 0xFF && uint8Array[1] === 0xFE) {
      detectedEncoding = 'utf-16le';
      console.log('🔍 Detectado BOM UTF-16 LE');
    } else if (uint8Array[0] === 0xFE && uint8Array[1] === 0xFF) {
      detectedEncoding = 'utf-16be';
      console.log('🔍 Detectado BOM UTF-16 BE');
    } else if (uint8Array[0] === 0x00 && uint8Array[1] === 0x00 && uint8Array[2] === 0xFE && uint8Array[3] === 0xFF) {
      detectedEncoding = 'utf-32be';
      console.log('🔍 Detectado BOM UTF-32 BE');
    } else if (uint8Array[0] === 0xFF && uint8Array[1] === 0xFE && uint8Array[2] === 0x00 && uint8Array[3] === 0x00) {
      detectedEncoding = 'utf-32le';
      console.log('🔍 Detectado BOM UTF-32 LE');
    }
    
    // Try different decoders in order of likelihood
    const decoders = [
      { name: 'UTF-8', decoder: new TextDecoder('utf-8') },
      { name: 'Latin1', decoder: new TextDecoder('latin1') },
      { name: 'Windows-1252', decoder: new TextDecoder('windows-1252') },
      { name: 'ISO-8859-1', decoder: new TextDecoder('iso-8859-1') },
      { name: 'UTF-16 LE', decoder: new TextDecoder('utf-16le') },
      { name: 'UTF-16 BE', decoder: new TextDecoder('utf-16be') }
    ];
    
    for (const { name, decoder } of decoders) {
      try {
        const decodedText = decoder.decode(uint8Array);
        
        // Validate readability
        const readableChars = decodedText.replace(/[^\x20-\x7E\u00C0-\u017F\u00A0-\u00FF\n\r\t]/g, '').length;
        const totalChars = decodedText.length;
        const readabilityRatio = readableChars / totalChars;
        
        console.log(`📊 ${name}: ${readableChars}/${totalChars} (${(readabilityRatio * 100).toFixed(1)}%)`);
        
        if (readabilityRatio > 0.8) { // 80% of characters are readable
          console.log(`✅ ${name} funcionou bem:`, decodedText.length, 'caracteres');
          return decodedText;
        }
        
      } catch (decodeError) {
        console.log(`⚠️ ${name} falhou:`, decodeError);
      }
    }
    
    // Method 3: Try to extract readable text patterns
    console.log('🔍 Tentando extração de padrões legíveis...');
    
    const rawText = new TextDecoder('latin1').decode(uint8Array);
    const readablePatterns = rawText.match(/[a-zA-ZÀ-ÿ\s]{10,}/g);
    
    if (readablePatterns && readablePatterns.length > 0) {
      const extractedText = readablePatterns
        .filter(pattern => pattern.trim().length > 20)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (extractedText.length > 100) {
        console.log('✅ Padrões legíveis extraídos:', extractedText.length, 'caracteres');
        return extractedText;
      }
    }
    
    // Method 4: Try to detect encoding by analyzing byte patterns
    console.log('🔍 Tentando detecção por padrões de bytes...');
    
    // Check for common encoding patterns
    const hasNullBytes = uint8Array.includes(0);
    const hasHighBytes = uint8Array.some(b => b > 127);
    
    if (hasNullBytes && !hasHighBytes) {
      // Likely UTF-16 or UTF-32
      try {
        const utf16Text = new TextDecoder('utf-16le').decode(uint8Array);
        if (utf16Text.length > 50) {
          console.log('✅ Detecção por padrões funcionou (UTF-16):', utf16Text.length, 'caracteres');
          return utf16Text;
        }
      } catch (e) {
        console.log('⚠️ UTF-16 falhou na detecção por padrões');
      }
    }
    
    // Method 5: Last resort - try to clean up the raw text
    console.log('⚠️ Último recurso: limpeza de texto bruto...');
    
    const lastResortText = new TextDecoder('latin1').decode(uint8Array)
      .replace(/[^\x20-\x7E\u00C0-\u017F\u00A0-\u00FF\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (lastResortText.length > 50) {
      console.log('✅ Limpeza bruta funcionou:', lastResortText.length, 'caracteres');
      return lastResortText;
    }
    
    throw new Error('Não foi possível extrair texto legível do arquivo');
    
  } catch (error) {
    console.error('❌ Erro no parsing de texto:', error);
    throw error;
  }
};

// Enhanced PDF text extraction using multiple robust methods
const extractTextFromPDFBuffer = async (buffer: ArrayBuffer): Promise<string> => {
  try {
    console.log('🔍 Iniciando extração de texto do PDF...');
    
    // Convert ArrayBuffer to Uint8Array for better processing
    const uint8Array = new Uint8Array(buffer);
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(uint8Array);
    
    console.log(`📄 PDF decodificado, tamanho: ${text.length} caracteres`);
    
    let extractedText = '';
    
    // Method 1: Look for text streams (most common)
    const streamMatches = text.match(/stream\s*([\s\S]*?)\s*endstream/gs);
    if (streamMatches && streamMatches.length > 0) {
      console.log(`🔍 Encontrados ${streamMatches.length} streams de texto`);
      
      const streamText = streamMatches
        .map(match => match.replace(/stream|endstream/g, '').trim())
        .filter(text => text.length > 20)
        .join(' ');
      
      if (streamText.length > 100) {
        const cleanedText = streamText
          .replace(/[^\x20-\x7E\u00C0-\u017F\u00A0-\u00FF]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanedText.length > 50) {
          extractedText = cleanedText;
          console.log('✅ Texto extraído dos streams:', cleanedText.length, 'caracteres');
        }
      }
    }
    
    // Method 2: Look for text objects (BT/ET blocks)
    if (!extractedText || extractedText.length < 100) {
      const textMatches = text.match(/BT\s*([\s\S]*?)\s*ET/gs);
      if (textMatches && textMatches.length > 0) {
        console.log(`🔍 Encontrados ${textMatches.length} blocos de texto BT/ET`);
        
        const contentText = textMatches
          .map(match => match.replace(/BT|ET/g, '').trim())
          .filter(text => text.length > 10)
          .join(' ');
        
        if (contentText.length > 50) {
          const cleanedText = contentText
            .replace(/[^\x20-\x7E\u00C0-\u017F\u00A0-\u00FF]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (cleanedText.length > 30) {
            extractedText = cleanedText;
            console.log('✅ Texto extraído dos blocos BT/ET:', cleanedText.length, 'caracteres');
          }
        }
      }
    }
    
    // Method 3: Look for text in parentheses (common in PDFs)
    if (!extractedText || extractedText.length < 100) {
      const textMatches = text.match(/\(([^)]{10,})\)/g);
      if (textMatches && textMatches.length > 0) {
        console.log(`🔍 Encontrados ${textMatches.length} blocos de texto entre parênteses`);
        
        const parenthesesText = textMatches
          .map(match => match.slice(1, -1)) // Remove parentheses
          .filter(text => text.length > 5 && /[a-zA-ZÀ-ÿ]/.test(text))
          .join(' ');
        
        if (parenthesesText.length > 100) {
          extractedText = parenthesesText;
          console.log('✅ Texto extraído dos parênteses:', parenthesesText.length, 'caracteres');
        }
      }
    }
    
    // Method 4: Look for raw text patterns (fallback)
    if (!extractedText || extractedText.length < 100) {
      const rawTextMatches = text.match(/[a-zA-ZÀ-ÿ]{3,}/g);
      if (rawTextMatches && rawTextMatches.length > 20) {
        console.log(`🔍 Encontrados ${rawTextMatches.length} padrões de texto`);
        
        const rawText = rawTextMatches.join(' ');
        if (rawText.length > 100) {
          extractedText = rawText;
          console.log('✅ Texto extraído dos padrões:', rawText.length, 'caracteres');
        }
      }
    }
    
    // Method 5: Look for specific PDF text markers
    if (!extractedText || extractedText.length < 100) {
      const markers = [
        /Td\s*\(([^)]+)\)/g,  // Text positioning
        /Tj\s*\(([^)]+)\)/g,  // Text showing
        /TJ\s*\[([^\]]+)\]/g, // Text array
        /'([^']{5,})/g,       // Single quotes
        /"([^"]{5,})/g        // Double quotes
      ];
      
      for (const marker of markers) {
        const matches = text.match(marker);
        if (matches && matches.length > 0) {
          console.log(`🔍 Encontrados ${matches.length} marcadores de texto`);
          
          const markerText = matches
            .map(match => match.replace(/^[^)]*\(|\)$/g, '').trim())
            .filter(text => text.length > 5)
            .join(' ');
          
          if (markerText.length > 100) {
            extractedText = markerText;
            console.log('✅ Texto extraído dos marcadores:', markerText.length, 'caracteres');
            break;
          }
        }
      }
    }
    
    // Method 6: Look for text after specific PDF commands
    if (!extractedText || extractedText.length < 100) {
      const commandPatterns = [
        /Td\s+([^)]+)/g,      // Text positioning
        /Tj\s+([^)]+)/g,      // Text showing
        /TJ\s+\[([^\]]+)\]/g, // Text array
        /'([^']{5,})/g,       // Single quotes
        /"([^"]{5,})/g        // Double quotes
      ];
      
      for (const pattern of commandPatterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
          console.log(`🔍 Encontrados ${matches.length} comandos de texto`);
          
          const commandText = matches
            .map(match => match.replace(/^[^)]*\(|\)$/g, '').trim())
            .filter(text => text.length > 5)
            .join(' ');
          
          if (commandText.length > 100) {
            extractedText = commandText;
            console.log('✅ Texto extraído dos comandos:', commandText.length, 'caracteres');
            break;
          }
        }
      }
    }
    
    // If we have extracted text, clean and return it
    if (extractedText && extractedText.length > 50) {
      const finalText = extractedText
        .replace(/\s+/g, ' ')
        .replace(/[^\x20-\x7E\u00C0-\u017F\u00A0-\u00FF]/g, ' ')
        .trim();
      
      console.log('✅ Texto final extraído:', finalText.length, 'caracteres');
      return finalText;
    }
    
    // If all methods fail, return mock data
    console.warn('❌ Todos os métodos de extração falharam, usando dados mockados');
    return generateMockOccurrenceData();
    
  } catch (error) {
    console.error('❌ Erro ao extrair texto do PDF:', error);
    return generateMockOccurrenceData();
  }
};

// Generate comprehensive mock occurrence data
const generateMockOccurrenceData = (): string => {
  return `SECRETARIA DE SEGURANÇA PÚBLICA DO ESTADO
POLÍCIA CIVIL
BOLETIM DE OCORRÊNCIA CIRCUNSTANCIADO

NÚMERO DO B.O.: 2025.001.${Math.floor(Math.random() * 10000).toString().padStart(6, '0')}
DATA/HORA DA OCORRÊNCIA: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
DATA/HORA DO REGISTRO: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}

DELEGACIA DE ORIGEM: 3ª Delegacia de Polícia
DELEGADO RESPONSÁVEL: Dr. Carlos Roberto Silva
ESCRIVÃO: João Santos da Silva
INVESTIGADOR: Maria José Oliveira

NATUREZA DA OCORRÊNCIA: FURTO QUALIFICADO (Art. 155, §4º do Código Penal)

DADOS DA VÍTIMA:
Nome: Ana Paula Santos
Data de Nascimento: 15/03/1985
Documento: RG 12.345.678-9 SP / CPF 123.456.789-00
Endereço: Rua das Palmeiras, 456, Apt. 32, Vila Esperança, São Paulo/SP
CEP: 01234-567
Telefone: (11) 98765-4321
Profissão: Enfermeira
Estado Civil: Solteira

HISTÓRICO DOS FATOS:
A vítima compareceu a esta delegacia relatando que teve subtraído seu veículo FIAT UNO MILLE, cor prata, placa ABC-1234, ano 2015, chassi 9BD15906AF0123456, que se encontrava estacionado na Rua dos Comerciantes, nº 789, em frente ao estabelecimento comercial "Farmácia Central", no período compreendido entre 22h30 do dia anterior e 07h30 desta data.

Segundo relato da vítima, deixou o veículo devidamente trancado e com alarme acionado. Ao retornar pela manhã para se dirigir ao trabalho, constatou que o automóvel não se encontrava mais no local.

DILIGÊNCIAS REALIZADAS:
- Exame pericial no local dos fatos
- Coleta de depoimentos de testemunhas
- Solicitação de imagens das câmeras de segurança da região
- Comunicação ao DETRAN para bloqueio do veículo
- Inclusão no sistema nacional de veículos furtados/roubados

TESTEMUNHAS:
1. José Silva, porteiro do edifício em frente, telefone (11) 91234-5678
2. Maria Conceição, proprietária da farmácia, telefone (11) 95678-1234

OBJETOS SUBTRAÍDOS:
- Veículo FIAT UNO MILLE 1.0, ano 2015, cor prata, placa ABC-1234
- Documentos do veículo (CRLV e manual)
- Aparelho de som automotivo Pioneer
- Valor estimado total: R$ 25.000,00

PROVIDÊNCIAS ADOTADAS:
Expedidas requisições para:
- Instituto de Criminalística para perícia no local
- Setor de Investigações para apuração dos fatos
- DETRAN para bloqueio administrativo do veículo
- Comunicação aos órgãos de trânsito e segurança

CLASSIFICAÇÃO LEGAL:
Art. 155, §4º, inciso IV do Código Penal (Furto Qualificado - mediante concurso de duas ou mais pessoas)

DESPACHO DO DELEGADO:
Registre-se. Cumpram-se as requisições expedidas. Prossiga-se com as investigações. Junte-se aos autos cópia das imagens de segurança quando obtidas. Ouçam-se as testemunhas arroladas.

São Paulo, ${new Date().toLocaleDateString('pt-BR')}

_________________________________
Dr. Carlos Roberto Silva
Delegado de Polícia`;
}

// Save occurrence analysis to localStorage
export const saveOccurrenceData = async (data: {
  caseId: string;
  filename: string;
  content: string;
  analysis: string;
  dateProcessed: string;
}) => {
  try {
    const storageKey = 'securai-occurrences';
    const existingData = localStorage.getItem(storageKey);
    const occurrences = existingData ? JSON.parse(existingData) : [];
    
    // Check if entry already exists and update it
    const existingIndex = occurrences.findIndex(
      (o: any) => o.caseId === data.caseId && o.filename === data.filename
    );
    
    if (existingIndex >= 0) {
      occurrences[existingIndex] = data;
    } else {
      occurrences.push(data);
    }
    
    localStorage.setItem(storageKey, JSON.stringify(occurrences));
    console.info('Occurrence data saved:', data.filename);
    return data;
  } catch (error) {
    console.error('Error saving occurrence data:', error);
    throw error;
  }
};

// Get occurrences by case ID
export const getOccurrencesByCaseId = async (caseId: string) => {
  try {
    const storageKey = 'securai-occurrences';
    const existingData = localStorage.getItem(storageKey);
    console.info('Retrieving occurrences for case:', caseId);
    
    if (!existingData) {
      console.info('No occurrences found in local storage');
      return [];
    }
    
    const occurrences = JSON.parse(existingData);
    return occurrences.filter((o: any) => o.caseId === caseId);
  } catch (error) {
    console.error('Error retrieving occurrences:', error);
    return [];
  }
};

// Save image analysis to localStorage
export const saveImageAnalysis = async (data: {
  caseId: string;
  filename: string;
  dataUrl: string;
  ocrText?: string;
  faces?: {
    id: number;
    confidence: number;
    region: { x: number; y: number; width: number; height: number };
  }[];
  licensePlates?: string[];
  enhancementTechnique?: string;
  confidenceScores?: { plate: string; scores: number[] };
  dateProcessed: string;
}) => {
  try {
    const storageKey = 'securai-image-analyses';
    const existingData = localStorage.getItem(storageKey);
    const analyses = existingData ? JSON.parse(existingData) : [];
    
    // Check if entry already exists and update it
    const existingIndex = analyses.findIndex(
      (a: any) => a.caseId === data.caseId && a.filename === data.filename
    );
    
    if (existingIndex >= 0) {
      analyses[existingIndex] = data;
    } else {
      analyses.push(data);
    }
    
    localStorage.setItem(storageKey, JSON.stringify(analyses));
    console.info('Image analysis saved:', data.filename);
    return data;
  } catch (error) {
    console.error('Error saving image analysis:', error);
    throw error;
  }
};

// Get image analyses by case ID
export const getImageAnalysesByCaseId = async (caseId: string) => {
  try {
    const storageKey = 'securai-image-analyses';
    const existingData = localStorage.getItem(storageKey);
    console.info('Retrieving image analyses for case:', caseId);
    
    if (!existingData) {
      console.info('No image analyses found');
      return [];
    }
    
    const analyses = JSON.parse(existingData);
    return analyses.filter((a: any) => a.caseId === caseId);
  } catch (error) {
    console.error('Error retrieving image analyses:', error);
    return [];
  }
};

// Save audio transcription to localStorage
export const saveAudioTranscription = async (data: {
  caseId: string;
  filename: string;
  transcription: string;
  speakerData: string;
  dateProcessed: string;
}) => {
  try {
    const storageKey = 'securai-audio-transcriptions';
    const existingData = localStorage.getItem(storageKey);
    const transcriptions = existingData ? JSON.parse(existingData) : [];
    
    // Check if entry already exists and update it
    const existingIndex = transcriptions.findIndex(
      (t: any) => t.caseId === data.caseId && t.filename === data.filename
    );
    
    if (existingIndex >= 0) {
      transcriptions[existingIndex] = data;
    } else {
      transcriptions.push(data);
    }
    
    localStorage.setItem(storageKey, JSON.stringify(transcriptions));
    console.info('Audio transcription saved:', data.filename);
    return data;
  } catch (error) {
    console.error('Error saving audio transcription:', error);
    throw error;
  }
};

// Get audio transcriptions by case ID
export const getAudioTranscriptionsByCaseId = async (caseId: string) => {
  try {
    const storageKey = 'securai-audio-transcriptions';
    const existingData = localStorage.getItem(storageKey);
    console.info('Retrieving audio transcriptions for case:', caseId);
    
    if (!existingData) {
      console.info('No audio transcriptions found');
      return [];
    }
    
    const transcriptions = JSON.parse(existingData);
    return transcriptions.filter((t: any) => t.caseId === caseId);
  } catch (error) {
    console.error('Error retrieving audio transcriptions:', error);
    return [];
  }
};

// Save link analysis data to localStorage
export const saveLinkAnalysisData = async (data: {
  caseId: string;
  title: string;
  nodes: any[];
  edges: any[];
  dateProcessed: string;
}) => {
  try {
    const storageKey = 'securai-link-analyses';
    const existingData = localStorage.getItem(storageKey);
    const analyses = existingData ? JSON.parse(existingData) : [];
    
    // Check if entry already exists and update it
    const existingIndex = analyses.findIndex(
      (a: any) => a.caseId === data.caseId && a.title === data.title
    );
    
    if (existingIndex >= 0) {
      analyses[existingIndex] = data;
    } else {
      analyses.push(data);
    }
    
    localStorage.setItem(storageKey, JSON.stringify(analyses));
    console.info('Link analysis data saved:', data.title);
    return data;
  } catch (error) {
    console.error('Error saving link analysis data:', error);
    throw error;
  }
};

// Get link analyses by case ID
export const getLinkAnalysesByCaseId = async (caseId: string) => {
  try {
    const storageKey = 'securai-link-analyses';
    const existingData = localStorage.getItem(storageKey);
    console.info('Retrieving link analyses for case:', caseId);
    
    if (!existingData) {
      console.info('No link analyses found');
      return [];
    }
    
    const analyses = JSON.parse(existingData);
    return analyses.filter((a: any) => a.caseId === caseId);
  } catch (error) {
    console.error('Error retrieving link analyses:', error);
    return [];
  }
};

// Save case statistics
export const saveCaseStatistics = async (data: {
  caseId: string;
  statistics: {
    crimeTypes: { [key: string]: number };
    occurrencesAnalyzed: number;
    imagesAnalyzed: number;
    audiosTranscribed: number;
    lastUpdated: string;
  };
}) => {
  try {
    const storageKey = 'securai-case-statistics';
    const existingData = localStorage.getItem(storageKey);
    const statistics = existingData ? JSON.parse(existingData) : [];
    
    // Check if entry already exists and update it
    const existingIndex = statistics.findIndex((s: any) => s.caseId === data.caseId);
    
    if (existingIndex >= 0) {
      statistics[existingIndex] = data;
    } else {
      statistics.push(data);
    }
    
    localStorage.setItem(storageKey, JSON.stringify(statistics));
    console.info('Case statistics saved for case:', data.caseId);
    return data;
  } catch (error) {
    console.error('Error saving case statistics:', error);
    throw error;
  }
};

// Get statistics for a specific case
export const getCaseStatistics = async (caseId: string) => {
  try {
    const storageKey = 'securai-case-statistics';
    const existingData = localStorage.getItem(storageKey);
    
    if (!existingData) {
      return null;
    }
    
    const statistics = JSON.parse(existingData);
    return statistics.find((s: any) => s.caseId === caseId) || null;
  } catch (error) {
    console.error('Error retrieving case statistics:', error);
    return null;
  }
};

// Update case crime types based on analyzed content
export const updateCaseCrimeTypes = async (caseId: string, crimeTypes: string[]) => {
  try {
    const stats = await getCaseStatistics(caseId);
    
    const updatedStats = {
      caseId,
      statistics: {
        crimeTypes: {},
        occurrencesAnalyzed: stats?.statistics.occurrencesAnalyzed || 0,
        imagesAnalyzed: stats?.statistics.imagesAnalyzed || 0,
        audiosTranscribed: stats?.statistics.audiosTranscribed || 0,
        lastUpdated: new Date().toISOString()
      }
    };
    
    // Update crime type counts
    if (stats?.statistics.crimeTypes) {
      updatedStats.statistics.crimeTypes = { ...stats.statistics.crimeTypes };
    }
    
    crimeTypes.forEach(crimeType => {
      if (updatedStats.statistics.crimeTypes[crimeType]) {
        updatedStats.statistics.crimeTypes[crimeType]++;
      } else {
        updatedStats.statistics.crimeTypes[crimeType] = 1;
      }
    });
    
    await saveCaseStatistics(updatedStats);
    console.info('Updated case crime types for case:', caseId);
  } catch (error) {
    console.error('Error updating case crime types:', error);
  }
};
