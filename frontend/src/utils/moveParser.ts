interface CodeComponent {
  type: 'event' | 'struct' | 'function';
  name: string;
  startLine: number;
  endLine: number;
  code: string;
}

export function parseMoveCode(code: string): CodeComponent[] {
  const lines = code.split('\n');
  const components: CodeComponent[] = [];
  let currentComponent: Partial<CodeComponent> | null = null;
  let bracketCount = 0;
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();
    
    // Check for component start
    if (trimmedLine.startsWith('#[event]')) {
      currentComponent = { type: 'event', startLine: lineNumber };
    } else if (trimmedLine.startsWith('struct ')) {
      currentComponent = { type: 'struct', startLine: lineNumber };
      currentComponent.name = trimmedLine.split(' ')[1].split('{')[0].trim();
    } else if (trimmedLine.startsWith('public') || trimmedLine.startsWith('fun ')) {
      currentComponent = { type: 'function', startLine: lineNumber };
      // Extract function name
      const match = trimmedLine.match(/(?:public\s+)?(?:entry\s+)?fun\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (match) {
        currentComponent.name = match[1];
      }
    }
    
    // Track brackets to find component end
    if (currentComponent) {
      if (trimmedLine.includes('{')) bracketCount++;
      if (trimmedLine.includes('}')) bracketCount--;
      
      // If brackets are balanced and we were tracking a component
      if (bracketCount === 0 && currentComponent.startLine) {
        components.push({
          type: currentComponent.type!,
          name: currentComponent.name || '',
          startLine: currentComponent.startLine,
          endLine: lineNumber,
          code: lines.slice(currentComponent.startLine - 1, lineNumber).join('\n')
        });
        currentComponent = null;
      }
    }
  });
  
  return components;
} 