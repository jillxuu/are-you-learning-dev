import React, { useEffect, useState, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as monaco from 'monaco-editor';
import { ComponentExplanation, getContractExplanations } from '../services/aiService';

// Move keywords and their explanations
const MOVE_KEYWORDS = {
  'struct': {
    keyword: 'struct',
    description: 'Defines a custom data type that can hold multiple fields.',
    docsUrl: 'https://aptos.dev/en/build/smart-contracts/book/structs-and-resources'
  },
  'fun': {
    keyword: 'fun',
    description: 'Declares a function that can be called to execute contract logic.',
    docsUrl: 'https://aptos.dev/en/build/smart-contracts/book/functions'
  },
  '#[event]': {
    keyword: '#[event]',
    description: 'Marks a struct as an event that can be emitted during contract execution.',
    docsUrl: 'https://aptos.dev/en/build/smart-contracts/book/structs-and-resources'
  },
  'public': {
    keyword: 'public',
    description: 'Makes a function callable from outside the module.',
    docsUrl: 'https://aptos.dev/en/build/smart-contracts/book/functions#visibility'
  },
  'entry': {
    keyword: 'entry',
    description: 'Marks a function as an entry point that can be called directly in a transaction.',
    docsUrl: 'https://aptos.dev/en/build/smart-contracts/book/functions#entry-modifier'
  },
  'has key': {
    keyword: 'has key',
    description: 'Indicates that a struct can be used as a key in global storage.',
    docsUrl: 'https://aptos.dev/en/build/smart-contracts/book/type-abilities'
  },
  'has store': {
    keyword: 'has store',
    description: 'Indicates that a struct can be stored inside other structs.',
    docsUrl: 'https://aptos.dev/en/build/smart-contracts/book/type-abilities'
  },
  'has copy': {
    keyword: 'has copy',
    description: 'Indicates that a struct can be copied (duplicated).',
    docsUrl: 'https://aptos.dev/en/build/smart-contracts/book/type-abilities'
  },
  'has drop': {
    keyword: 'has drop',
    description: 'Indicates that a struct can be dropped without explicit destruction.',
    docsUrl: 'https://aptos.dev/en/build/smart-contracts/book/type-abilities'
  }
} as const;

type MoveKeyword = keyof typeof MOVE_KEYWORDS;

interface Props {
  code: string;
  onContinue: () => void;
}

export default function CodeLearningView({ code, onContinue }: Props) {
  const [explanations, setExplanations] = useState<ComponentExplanation[]>([]);
  const [selectedType, setSelectedType] = useState<'function' | 'struct' | 'event'>('struct');
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<MoveKeyword | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ref for the explanations container
  const explanationsContainerRef = useRef<HTMLDivElement>(null);
  // Map to store refs for each explanation component
  const explanationRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Ref to store current explanations for the click handler
  const currentExplanationsRef = useRef<ComponentExplanation[]>([]);

  // Add scroll effect
  useEffect(() => {
    if (selectedComponent && !isLoading) {
      requestAnimationFrame(() => {
        const element = explanationRefs.current.get(selectedComponent);
        if (element && explanationsContainerRef.current) {
          const container = explanationsContainerRef.current;
          const containerRect = container.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          const scrollTop = container.scrollTop + (elementRect.top - containerRect.top) - 48;
          container.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          });
        }
      });
    }
  }, [selectedComponent, selectedType, isLoading]);

  useEffect(() => {
    async function loadExplanations() {
      if (code) {
        try {
          setIsLoading(true);
          setError(null);
          const newExplanations = await getContractExplanations(code);
          setExplanations(newExplanations);
          // Update the ref with the new explanations
          currentExplanationsRef.current = newExplanations;
          
          // Set initial component if available
          if (newExplanations.length > 0) {
            setSelectedComponent(newExplanations[0].name);
          }
        } catch (error) {
          setError('Failed to load explanations. Please try again.');
        } finally {
          setIsLoading(false);
        }
      }
    }
    
    loadExplanations();
  }, [code]);

  const handleComponentSelect = (component: ComponentExplanation) => {
    setSelectedType(component.type);
    setSelectedComponent(component.name);
  };

  const handleEditorDidMount: OnMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    // Add click handler
    editor.onMouseDown((e: monaco.editor.IEditorMouseEvent) => {
      if (e.target.position) {
        const position = e.target.position;
        const model = editor.getModel();
        if (!model) return;

        const wordInfo = model.getWordAtPosition(position);
        const lineNumber = position.lineNumber;
        const lineContent = model.getLineContent(lineNumber);
        const prevLineContent = lineNumber > 1 ? model.getLineContent(lineNumber - 1) : '';

        let clickedWord = wordInfo?.word;
        if (!clickedWord) {
          const column = position.column - 1;
          const line = lineContent;
          const wordRegex = /[a-zA-Z0-9_]+/g;
          let match;
          while ((match = wordRegex.exec(line)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            if (column >= start && column <= end) {
              clickedWord = match[0];
              break;
            }
          }
        }

        if (!clickedWord) return;

        const component = currentExplanationsRef.current.find(exp => {
          const simpleName = exp.name.split('::').pop() || '';

          // Case 1: Declaration matching
          if (lineContent.includes('fun') || lineContent.includes('struct')) {
            if (exp.type === 'function') {
              const funMatches = [
                /fun\s+(\w+)/,
                /public\s+fun\s+(\w+)/,
                /entry\s+fun\s+(\w+)/
              ];
              
              for (const pattern of funMatches) {
                const match = lineContent.match(pattern);
                if (match && match[1] === clickedWord && match[1] === simpleName) {
                  return true;
                }
            }
          }

            if (lineContent.includes(`struct ${clickedWord}`)) {
              const isEvent = prevLineContent.includes('#[event]');
              if ((isEvent && exp.type === 'event') || (!isEvent && exp.type === 'struct')) {
                if (simpleName === clickedWord) {
              return true;
            }
              }
            }
            return false;
          }

          // Case 2: Usage matching
          if (clickedWord === simpleName || clickedWord === exp.name) {
            return true;
          }

          return false;
        });

        const isKeyword = clickedWord in MOVE_KEYWORDS;

        if (component) {
          setSelectedKeyword(null);
          setSelectedType(component.type);
          setSelectedComponent(component.name);
        } else if (isKeyword) {
          setSelectedKeyword(clickedWord as MoveKeyword);
          setSelectedComponent(null);
        } else {
          setSelectedKeyword(null);
          setSelectedComponent(null);
        }
      }
    });

    // Update editor options
    editor.updateOptions({
      readOnly: true,
      fontSize: 14,
      minimap: { enabled: false },
      lineNumbers: 'on',
      renderLineHighlight: 'all',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      hover: { enabled: true },
      mouseStyle: 'text',
      cursorStyle: 'line-thin',
      links: true,
      colorDecorators: true,
      renderWhitespace: 'none',
      contextmenu: false,
      folding: true,
      showFoldingControls: 'always',
      suggest: {
        showWords: false
      }
    });
  };

  const filteredExplanations = explanations.filter(exp => exp.type === selectedType);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <div className="navbar bg-base-200 px-4 shadow-sm sticky top-0 z-50">
        <div className="flex-1">
          <span className="text-xl font-bold text-primary">Aptos Meme Coin</span>
        </div>
        <div className="flex-none">
          <button 
            className="btn btn-primary"
            onClick={onContinue}
          >
            Continue to Playground
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Left column - Component explanations */}
        <div className="w-1/4 bg-base-100 border-r border-base-300 flex flex-col sticky top-16 h-[calc(100vh-4rem)]">
          <div className="p-4 flex-none">
            <h2 className="text-xl font-bold mb-4">Contract Components</h2>
            
            {/* Component type selector */}
            <div className="tabs tabs-boxed mb-4">
              <button 
                className={`tab ${selectedType === 'struct' ? 'tab-active' : ''}`}
                onClick={() => setSelectedType('struct')}
              >
                Structs
              </button>
              <button 
                className={`tab ${selectedType === 'event' ? 'tab-active' : ''}`}
                onClick={() => setSelectedType('event')}
              >
                Events
              </button>
              <button 
                className={`tab ${selectedType === 'function' ? 'tab-active' : ''}`}
                onClick={() => setSelectedType('function')}
              >
                Functions
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4" ref={explanationsContainerRef}>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : error ? (
              <div className="p-4 bg-error/10 text-error rounded-lg">
                {error}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredExplanations.map((exp, index) => (
                  <div 
                    key={index}
                    ref={el => {
                      if (el) {
                        explanationRefs.current.set(exp.name, el);
                      }
                    }}
                    className={`p-4 rounded-lg transition-colors cursor-pointer hover:bg-base-200 ${
                      exp.name === selectedComponent 
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'bg-base-200'
                    }`}
                    onClick={() => handleComponentSelect(exp)}
                  >
                    <div className="font-medium mb-2 text-primary">
                      {exp.name}
                    </div>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {exp.explanation}
                    </ReactMarkdown>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle column - Code display */}
        <div className="flex-1 bg-base-100">
          <Editor
            height="calc(100vh - 4rem)"
            defaultLanguage="move"
            language="move"
            value={code}
            theme="move-dark"
            beforeMount={monaco => {
              // Register the Move language
              monaco.languages.register({ id: 'move' });
              
              // Set up Move language syntax highlighting
              monaco.languages.setMonarchTokensProvider('move', {
                defaultToken: '',
                tokenPostfix: '.move',
                keywords: [
                  'public', 'entry', 'fun', 'struct', 'has', 'key', 'store', 'copy', 'drop',
                  'module', 'use', 'script', 'friend', 'native', 'const', 'let'
                ],
                typeKeywords: ['u8', 'u64', 'u128', 'bool', 'address', 'vector', 'signer'],
                
                tokenizer: {
                  root: [
                    [/[a-zA-Z_$][\w$]*/, { 
                      cases: {
                        '@keywords': { token: 'keyword' },
                        '@typeKeywords': { token: 'type' },
                        '@default': { token: 'identifier' }
                      }
                    }],
                    [/#\[[^\]]*\]/, { token: 'attribute' }],
                    [/\/\/.*$/, { token: 'comment' }],
                    [/"/, { token: 'string', next: '@string' }],
                    [/\d+/, { token: 'number' }],
                  ],
                  string: [
                    [/[^"]+/, { token: 'string' }],
                    [/"/, { token: 'string', next: '@pop' }]
                  ]
                }
              });

              // Set up theme
              monaco.editor.defineTheme('move-dark', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                  { token: 'keyword', foreground: 'C586C0' },
                  { token: 'type', foreground: '4EC9B0' },
                  { token: 'identifier', foreground: '9CDCFE' },
                  { token: 'number', foreground: 'B5CEA8' },
                  { token: 'string', foreground: 'CE9178' },
                  { token: 'comment', foreground: '6A9955' }
                ],
                colors: {
                  'editor.background': '#1E1E1E',
                  'editor.foreground': '#D4D4D4',
                  'editor.lineHighlightBackground': '#2F3337',
                  'editor.selectionBackground': '#264F78',
                  'editor.inactiveSelectionBackground': '#3A3D41'
                }
              });
              monaco.editor.setTheme('move-dark');
            }}
            onMount={handleEditorDidMount}
            options={{
              readOnly: true,
              fontSize: 14,
              minimap: { enabled: false },
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              hover: { enabled: true },
              mouseStyle: 'text',
              cursorStyle: 'line-thin',
              links: true,
              colorDecorators: true,
              renderWhitespace: 'none',
              contextmenu: false,
              folding: true,
              showFoldingControls: 'always',
              suggest: {
                showWords: false
              }
            }}
          />
        </div>

        {/* Right column - Move keywords */}
        <div className="w-1/4 bg-base-100 border-l border-base-300 sticky top-16 h-[calc(100vh-4rem)]">
          <div className="p-4 h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Move Keywords</h2>
            <div className="space-y-4">
              {Object.entries(MOVE_KEYWORDS).map(([key, info]) => (
                <div 
                  key={key}
                  className={`p-4 rounded-lg transition-colors ${
                    key === selectedKeyword 
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-base-200'
                  }`}
                >
                  <h4 className="font-semibold">{info.keyword}</h4>
                  <p>{info.description}</p>
                  <a 
                    href={info.docsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Learn more →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
