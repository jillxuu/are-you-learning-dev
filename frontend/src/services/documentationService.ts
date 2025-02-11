export interface CodeSection {
  id: string;
  title: string;
  description: string;
  filePath: string;
}

export interface Documentation {
  title: string;
  content: string;
  codeReferences?: Array<{
    line: number;
    description: string;
  }>;
}

const CODE_SECTIONS: Record<string, CodeSection> = {
  'basic_features': {
    id: 'basic_features',
    title: 'Basic Features',
    description: 'Create your meme coin with basic metadata and minting functionality',
    filePath: 'move/sources/meme_coin.move'
  },
  'supply_management': {
    id: 'supply_management',
    title: 'Supply Management',
    description: 'Configure supply limits and manage token distribution',
    filePath: 'move/sources/meme_coin.move'
  },
  'security_controls': {
    id: 'security_controls',
    title: 'Security Controls',
    description: 'Add security features like account freezing and forced transfers',
    filePath: 'move/sources/meme_coin.move'
  },
  'advanced_features': {
    id: 'advanced_features',
    title: 'Advanced Features',
    description: 'Optional features like degen metrics and viral mechanics',
    filePath: 'move/sources/meme_coin.move'
  }
};

async function readMoveFile(): Promise<{
  documentation: string;
  code: string;
}> {
  try {
    const response = await fetch('/api/code/meme_coin.move');
    if (!response.ok) {
      throw new Error('Failed to fetch Move file');
    }
    const content = await response.text();
    const lines = content.split('\n');
    
    // Extract documentation from comments at the top
    const documentation: string[] = [];
    let codeStartIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('///')) {
        documentation.push(line.substring(3).trim());
      } else if (line.startsWith('module')) {
        codeStartIndex = i;
        break;
      }
    }

    return {
      documentation: documentation.join('\n'),
      code: lines.slice(codeStartIndex).join('\n')
    };
  } catch (error) {
    console.error('Error reading Move file:', error);
    return {
      documentation: '',
      code: ''
    };
  }
}

export function getCodeSection(id: string): CodeSection | undefined {
  return CODE_SECTIONS[id];
}

export async function getDocumentation(id: string): Promise<Documentation | undefined> {
  if (id !== 'meme_coin') return undefined;
  
  const { documentation: docs } = await readMoveFile();
  return {
    title: 'Meme Coin',
    content: docs,
    codeReferences: [
      {
        line: 1,
        description: 'Module overview and feature sections'
      },
      {
        line: 50,
        description: 'Basic metadata structure'
      },
      {
        line: 100,
        description: 'Supply management'
      },
      {
        line: 150,
        description: 'Security controls'
      }
    ]
  };
}

export async function getEditableRegions(): Promise<Array<{
  startLine: number;
  endLine: number;
  description: string;
}>> {
  const { code } = await readMoveFile();
  const lines = code.split('\n');
  const regions: Array<{
    startLine: number;
    endLine: number;
    description: string;
  }> = [];

  let currentRegion: {
    startLine: number;
    description: string;
  } | null = null;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (line.includes('@editable-begin:')) {
      const description = line.split('@editable-begin:')[1].trim();
      currentRegion = {
        startLine: lineNumber + 1,
        description
      };
    } else if (line.includes('@editable-end') && currentRegion) {
      regions.push({
        startLine: currentRegion.startLine,
        endLine: lineNumber - 1,
        description: currentRegion.description
      });
      currentRegion = null;
    }
  });

  return regions;
}

export function getAllSections(): CodeSection[] {
  return Object.values(CODE_SECTIONS);
}

export async function getDefaultCode(): Promise<string> {
  const { code } = await readMoveFile();
  return code;
} 