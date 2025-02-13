import { useEffect, useRef, useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { useParams } from "react-router-dom";
import { Hex } from "@aptos-labs/ts-sdk";
import pako from "pako";

function getPublicFunctionLineNumber(
  sourceCode: string,
  functionName: string,
): number {
  const lines = sourceCode.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`public fun ${functionName}`)) {
      return i;
    }
  }
  return 0;
}

function useStartingLineNumber(sourceCode?: string) {
  const { selectedFnName } = useParams();

  if (!sourceCode) return 0;
  if (!selectedFnName) return 0;

  return getPublicFunctionLineNumber(sourceCode, selectedFnName);
}

interface CodeProps {
  bytecode: string;
}

export function Code({ bytecode }: CodeProps) {
  const sourceCode = bytecode === "0x" ? undefined : transformCode(bytecode);
  const startingLineNumber = useStartingLineNumber(sourceCode);
  const codeBoxScrollRef = useRef<HTMLDivElement>(null);
  const LINE_HEIGHT_IN_PX = 24;

  useEffect(() => {
    if (codeBoxScrollRef.current) {
      codeBoxScrollRef.current.scrollTop =
        LINE_HEIGHT_IN_PX * startingLineNumber;
    }
  }, [startingLineNumber]);

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!sourceCode) return;
    await navigator.clipboard.writeText(sourceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const customStyle = {
    margin: 0,
    background: "transparent",
    fontSize: "14px",
    fontFamily: "Fira Code, monospace",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center">
        {sourceCode && (
          <button className="btn btn-outline btn-sm" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy Code"}
          </button>
        )}
      </div>

      {!sourceCode ? (
        <div className="alert alert-info">
          Source code is not available for this module
        </div>
      ) : (
        <div
          ref={codeBoxScrollRef}
          className="max-h-[70vh] overflow-auto rounded-lg bg-base-300"
        >
          <SyntaxHighlighter
            language="rust"
            style={atomOneDark}
            showLineNumbers
            customStyle={customStyle}
            lineNumberStyle={{ color: "#666" }}
            codeTagProps={{
              style: {
                fontFamily: "Fira Code, monospace",
                fontSize: "14px",
              },
            }}
          >
            {sourceCode}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}

export function transformCode(source: string): string {
  try {
    // Log the input for debugging
    console.log("Source input:", source);

    // If it's already valid Move source code, return as is
    if (source.includes("module") || source.includes("script")) {
      return source;
    }

    // Remove 0x prefix if present
    const cleanSource = source.startsWith("0x") ? source.slice(2) : source;

    // Try different decoding methods
    const decodingMethods = [
      // Method 1: Try gzip decompression of hex
      () => {
        console.log("Trying gzip decompression of hex...");
        const bytes = Hex.fromHexString(cleanSource).toUint8Array();
        return pako.ungzip(bytes, { to: "string" });
      },
      // Method 2: Try direct hex to string conversion
      () => {
        console.log("Trying direct hex to string conversion...");
        const bytes = Hex.fromHexString(cleanSource).toUint8Array();
        return new TextDecoder().decode(bytes);
      },
      // Method 3: Try base64 decoding
      () => {
        console.log("Trying base64 decoding...");
        const bytes = Uint8Array.from(atob(cleanSource), (c) =>
          c.charCodeAt(0),
        );
        return new TextDecoder().decode(bytes);
      },
      // Method 4: Try gzip decompression of base64
      () => {
        console.log("Trying gzip decompression of base64...");
        const bytes = Uint8Array.from(atob(cleanSource), (c) =>
          c.charCodeAt(0),
        );
        return pako.ungzip(bytes, { to: "string" });
      },
    ];

    // Try each method until one works and produces valid Move code
    for (const method of decodingMethods) {
      try {
        const result = method();
        console.log("Decoded result:", result.substring(0, 100) + "...");

        // Check if result looks like valid Move code or JSON
        if (
          result.includes("module") ||
          result.includes("script") ||
          result.startsWith("{")
        ) {
          // If it's JSON, try to extract the source code
          if (result.startsWith("{")) {
            try {
              const json = JSON.parse(result);
              if (json.source) {
                console.log("Found source in JSON");
                return json.source;
              }
            } catch (e) {
              console.log("JSON parsing failed:", e);
            }
          }
          return result;
        }
      } catch (e) {
        console.log("Method failed:", e);
        // Continue to next method if this one fails
        continue;
      }
    }

    // If all methods fail, try to extract Move code using regex
    const moveCodeMatch = cleanSource.match(/module\s+[^{]+\{[\s\S]+\}/);
    if (moveCodeMatch) {
      console.log("Found Move code using regex");
      return moveCodeMatch[0];
    }

    // If all methods fail, return a readable error message
    console.log("All decoding methods failed");
    return "// Unable to decode source code. The bytecode may be in an unsupported format.";
  } catch (error) {
    console.error("Error transforming code:", error);
    return (
      "// Error decoding source code: " +
      (error instanceof Error ? error.message : String(error))
    );
  }
}
