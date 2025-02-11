import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

interface Documentation {
  title: string;
  content: string;
  codeReferences?: Array<{
    line: number;
    description: string;
  }>;
}

interface DocumentationViewerProps {
  documentation?: Documentation;
  onSectionClick?: (line: number) => void;
}

const components: Components = {
  code({ className, children }) {
    const match = /language-(\w+)/.exec(className || '')
    return match ? (
      <pre className={`bg-base-300 p-4 rounded-lg overflow-x-auto`}>
        <code className={className}>
          {children}
        </code>
      </pre>
    ) : (
      <code className={`bg-base-300 px-2 py-1 rounded`}>
        {children}
      </code>
    )
  },
}

export function DocumentationViewer({ 
  documentation,
  onSectionClick
}: DocumentationViewerProps) {
  if (!documentation) {
    return (
      <div className="p-4 text-center text-base-content/60">
        Loading documentation...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Documentation content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="prose prose-lg max-w-none">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={components}
          >
            {documentation.content}
          </ReactMarkdown>

          {/* Code references */}
          {documentation.codeReferences && documentation.codeReferences.length > 0 && (
            <>
              <h2>Code Navigation</h2>
              <ul>
                {documentation.codeReferences.map((ref, index) => (
                  <li 
                    key={index}
                    className="cursor-pointer hover:text-primary"
                    onClick={() => onSectionClick?.(ref.line)}
                  >
                    {ref.description}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 