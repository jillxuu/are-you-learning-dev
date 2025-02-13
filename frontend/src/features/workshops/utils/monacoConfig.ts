import * as monaco from "monaco-editor";
import { LineDescription } from "../types/workshop";

// Move language configuration
const MOVE_KEYWORDS = [
  "public",
  "entry",
  "fun",
  "struct",
  "has",
  "key",
  "store",
  "copy",
  "drop",
  "module",
  "use",
  "script",
  "friend",
  "native",
  "const",
  "let",
  "inline",
  "#[view]",
  "#[test]",
  "#[event]",
  "acquires",
  "move_to",
  "move_from",
  "borrow_global",
  "borrow_global_mut",
  "exists",
  "assert!",
  "vector",
];

const MOVE_TYPE_KEYWORDS = [
  "u8",
  "u64",
  "u128",
  "bool",
  "address",
  "vector",
  "signer",
];

// Move keyword documentation
const MOVE_KEYWORD_DOCS: Record<string, string> = {
  public:
    "Makes a function or struct visible outside of the current module. Public functions can be called by other modules.",
  entry:
    "Marks a function that can be called directly by transactions. Entry functions must be public and cannot return values.",
  fun: "Declares a function. Functions are the primary unit of computation in Move.",
  struct:
    "Declares a struct type, which can store data in fields and have abilities like 'copy', 'drop', 'store', and 'key'.",
  has: "Declares abilities for a struct (copy, drop, store, key). Abilities control what can be done with values of the type.",
  key: "Ability for a struct to serve as a key in global storage. Required for storing data under an address.",
  store:
    "Ability for values to be stored inside structs in global storage. Required for struct fields that need to be stored on-chain.",
  copy: "Ability for values to be copied (duplicated). Without copy, values can only be moved.",
  drop: "Ability for values to be dropped (ignored). Without drop, values must be explicitly consumed.",
  module:
    "Declares a Move module, which is a collection of types, functions, and resources published at a specific address.",
  use: "Imports types, functions, and constants from other modules. Can use aliases to avoid name conflicts.",
  script:
    "Declares a transaction script. [Deprecated in Move 2 - use 'entry fun' instead]",
  friend:
    "Declares modules that are allowed to access private functions. Enables controlled visibility of module internals.",
  native:
    "Marks a function as implemented natively (in Rust). Used for core framework functionality.",
  const:
    "Declares a named constant value. Constants are inlined at compile-time and cannot be modified.",
  let: "Declares a local variable within a function. Variables are mutable unless explicitly made constant.",
  inline:
    "Marks a function to be expanded in place at the caller location during compile time. Inline functions can improve performance and save gas, but may increase bytecode size.",
  "#[view]":
    "Attribute for functions that only read state (no modifications). Can be called without gas fees.",
  "#[test]":
    "Marks a function as a test. Test functions are only compiled and run during testing.",
  "#[event]":
    "Marks a struct as an event that can be emitted. Events are stored in the transaction output.",
  acquires:
    "Declares which resources a function accesses from global storage. Required for using 'move_from' or 'borrow_global'.",
  move_to:
    "Publishes a resource under the specified address. Used to store data in global storage.",
  move_from:
    "Removes and returns a resource from an address. The resource must exist.",
  borrow_global:
    "Borrows a reference to a resource stored at an address. The resource must exist.",
  borrow_global_mut:
    "Borrows a mutable reference to a resource stored at an address. The resource must exist.",
  exists:
    "Checks if a resource exists at a specific address. Returns a boolean.",
  "assert!":
    "Aborts execution if the condition is false. Used for checking preconditions.",
  vector:
    "Built-in type for dynamic arrays. Can store any values that have 'store'.",
};

const MOVE_TYPE_DOCS: Record<string, string> = {
  u8: "8-bit unsigned integer (0 to 255)",
  u64: "64-bit unsigned integer",
  u128: "128-bit unsigned integer",
  bool: "Boolean value (true or false)",
  address: "32-byte account address",
  vector: "Dynamic array of elements of the same type",
  signer: "Special type representing transaction sender's identity",
};

// Add Move attributes documentation
const MOVE_ATTRIBUTES: Record<string, string> = {
  "#[view]":
    "Marks a function as read-only. View functions can only read blockchain state and cannot modify it. They can be called without gas fees.",
  "#[test]":
    "Marks a function as a test case. Test functions are only included during testing and are excluded from production builds.",
  "#[event]":
    "Marks a struct as an event that can be emitted. Events are stored in the transaction output and can be indexed by processors.",
  "#[expected_failure]":
    "Indicates that a test is expected to fail with a specific error code.",
  "#[test_only]":
    "Marks a function or struct as test-only code that will be excluded from production builds.",
  "#[private_generics]":
    "Restricts generic type parameters to be used only within the module.",
  "#[deprecated]":
    "Marks a function or struct as deprecated, indicating it should no longer be used.",
};

// Monaco theme configuration
export const MOVE_THEME: monaco.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "keyword", foreground: "C586C0" },
    { token: "type", foreground: "4EC9B0" },
    { token: "identifier", foreground: "9CDCFE" },
    { token: "number", foreground: "B5CEA8" },
    { token: "string", foreground: "CE9178" },
    { token: "comment", foreground: "6A9955" },
  ],
  colors: {
    "editor.background": "#1E1E1E",
    "editor.foreground": "#D4D4D4",
    "editor.lineHighlightBackground": "#2F3337",
    "editor.selectionBackground": "#264F78",
    "editor.inactiveSelectionBackground": "#3A3D41",
  },
};

// Default editor options
export const DEFAULT_EDITOR_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions =
  {
    readOnly: true,
    minimap: { enabled: true },
    lineNumbers: "on",
    scrollBeyondLastLine: false,
    fontSize: 14,
    tabSize: 4,
    occurrencesHighlight: "singleFile",
    glyphMargin: true,
    renderLineHighlight: "none",
    lineDecorationsWidth: 5,
    hover: {
      enabled: true,
      delay: 300,
      above: false,
    },
  };

// Configure Monaco editor with Move language support
export function configureMonaco(monaco: typeof import("monaco-editor")) {
  // Register the Move language
  monaco.languages.register({ id: "move" });

  // Set up Move language syntax highlighting
  monaco.languages.setMonarchTokensProvider("move", {
    defaultToken: "",
    tokenPostfix: ".move",
    keywords: MOVE_KEYWORDS,
    typeKeywords: MOVE_TYPE_KEYWORDS,

    tokenizer: {
      root: [
        // Handle attributes with or without parameters
        [/#\[[a-zA-Z_]+(\s*=\s*[^\]]+)?\]/, { token: "attribute" }],
        [
          /[a-zA-Z_$][\w$]*/,
          {
            cases: {
              "@keywords": { token: "keyword" },
              "@typeKeywords": { token: "type" },
              "@default": { token: "identifier" },
            },
          },
        ],
        [/\/\/.*$/, { token: "comment" }],
        [/"/, { token: "string", next: "@string" }],
        [/\d+/, { token: "number" }],
      ],
      string: [
        [/[^"]+/, { token: "string" }],
        [/"/, { token: "string", next: "@pop" }],
      ],
    },
  });

  // Add hover provider for Move keywords and types
  monaco.languages.registerHoverProvider("move", {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) {
        // Check if we're on an attribute
        const lineContent = model.getLineContent(position.lineNumber);
        const attributeMatch = /#\[[a-zA-Z_]+\]/.exec(lineContent);
        if (attributeMatch) {
          const attribute = attributeMatch[0];
          const doc = MOVE_ATTRIBUTES[attribute];
          if (doc) {
            return {
              contents: [
                { value: "**Move Attribute**" },
                { value: doc },
                { value: "\n*Example:*" },
                {
                  value: "```move\n" + getAttributeExample(attribute) + "\n```",
                },
              ],
            };
          }
        }
        return null;
      }

      const keyword = MOVE_KEYWORD_DOCS[word.word];
      const type = MOVE_TYPE_DOCS[word.word];

      if (keyword) {
        return {
          contents: [
            { value: "**Move Keyword**" },
            { value: keyword },
            { value: "\n*Example:*" },
            { value: "```move\n" + getKeywordExample(word.word) + "\n```" },
          ],
        };
      }

      if (type) {
        return {
          contents: [
            { value: "**Move Type**" },
            { value: type },
            { value: "\n*Example:*" },
            { value: "```move\n" + getTypeExample(word.word) + "\n```" },
          ],
        };
      }

      return null;
    },
  });

  // Set up theme
  monaco.editor.defineTheme("move-dark", MOVE_THEME);
  monaco.editor.setTheme("move-dark");
}

// Helper function to provide examples for keywords
function getKeywordExample(keyword: string): string {
  switch (keyword) {
    case "public":
      return "public fun transfer(from: &signer, to: address, amount: u64) { }";
    case "entry":
      return "public entry fun mint(account: &signer, amount: u64) { }";
    case "struct":
      return "struct Coin has key, store {\n    value: u64\n}";
    case "module":
      return "module my_addr::basic_coin {\n    struct Coin has key { value: u64 }\n}";
    case "fun":
      return "fun initialize(account: &signer) { }";
    case "has":
      return "struct NFT has key, store, copy {\n    id: u64,\n    description: String\n}";
    case "key":
      return "struct Balance has key {\n    coin: Coin\n}";
    case "store":
      return "struct Metadata has store {\n    name: String,\n    symbol: String\n}";
    case "copy":
      return "struct Point has copy {\n    x: u64,\n    y: u64\n}";
    case "drop":
      return "struct Data has drop {\n    value: vector<u8>\n}";
    case "use":
      return "use std::string::String;\nuse aptos_framework::coin::{Self, Coin};";
    case "friend":
      return "module addr::coins {\n    friend addr::market;\n    fun internal_transfer() { }\n}";
    case "#[view]":
      return "#[view]\npublic fun get_balance(owner: address): u64 { }";
    case "#[test]":
      return "#[test]\nfun test_mint() {\n    let amount = 100;\n    assert!(amount > 0, 0);\n}";
    case "#[event]":
      return "#[event]\nstruct TransferEvent {\n    from: address,\n    to: address,\n    amount: u64\n}";
    case "acquires":
      return "public fun withdraw(addr: address) acquires Balance {\n    let balance = borrow_global_mut<Balance>(addr);\n}";
    case "move_to":
      return "public fun initialize(account: &signer) {\n    move_to(account, Balance { coin: Coin { value: 0 } });\n}";
    case "move_from":
      return "public fun withdraw(addr: address): Coin {\n    let Balance { coin } = move_from<Balance>(addr);\n    coin\n}";
    case "borrow_global":
      return "public fun get_value(addr: address): u64 {\n    borrow_global<Balance>(addr).coin.value\n}";
    case "borrow_global_mut":
      return "public fun set_value(addr: address, value: u64) acquires Balance {\n    borrow_global_mut<Balance>(addr).coin.value = value;\n}";
    case "exists":
      return "public fun is_initialized(addr: address): bool {\n    exists<Balance>(addr)\n}";
    case "assert!":
      return "public fun transfer(amount: u64) {\n    assert!(amount > 0, 0);\n    // Transfer logic\n}";
    case "const":
      return "const MAX_SUPPLY: u64 = 1000000;\nconst DECIMALS: u8 = 8;";
    case "let":
      return "fun example() {\n    let value = 100;\n    let mut_value = 200;\n    mut_value = mut_value + 1;\n}";
    case "native":
      return "native public fun ed25519_verify(\n    signature: vector<u8>,\n    public_key: vector<u8>,\n    message: vector<u8>\n): bool;";
    case "inline":
      return `module 0x42::example {
    inline fun percent(x: u64, y: u64): u64 { 
        x * 100 / y 
    }

    // Example with function parameter
    public inline fun fold<Accumulator, Element>(
        v: vector<Element>,
        init: Accumulator,
        f: |Accumulator,Element|Accumulator
    ): Accumulator {
        let accu = init;
        for_each(v, |elem| accu = f(accu, elem));
        accu
    }
}`;
    default:
      return `// Example using ${keyword}`;
  }
}

// Helper function to provide examples for types
function getTypeExample(type: string): string {
  switch (type) {
    case "u8":
      return "let max_value: u8 = 255;";
    case "u64":
      return "let amount: u64 = 1000000;";
    case "address":
      return "let addr: address = @0x1;";
    case "vector":
      return "let items: vector<u64> = vector[1, 2, 3];";
    case "signer":
      return "public fun initialize(account: &signer) { }";
    // Add more examples as needed
    default:
      return `let value: ${type};`;
  }
}

// Add attribute examples
function getAttributeExample(attribute: string): string {
  switch (attribute) {
    case "#[view]":
      return `#[view]
public fun get_balance(owner: address): u64 {
    if (exists<Balance>(owner)) {
        borrow_global<Balance>(owner).amount
    } else {
        0
    }
}`;
    case "#[test]":
      return `#[test]
fun test_mint_and_burn() {
    let account = create_test_account();
    mint(&account, 100);
    assert!(get_balance(account) == 100, 0);
    burn(&account, 50);
    assert!(get_balance(account) == 50, 1);
}`;
    case "#[event]":
      return `#[event]
struct TransferEvent {
    from: address,
    to: address,
    amount: u64,
}

public fun transfer(from: &signer, to: address, amount: u64) {
    // ... transfer logic ...
    event::emit(TransferEvent { from, to, amount });
}`;
    case "#[expected_failure]":
      return `#[test]
#[expected_failure(abort_code = 1)]
fun test_insufficient_balance() {
    let account = create_test_account();
    mint(&account, 50);
    burn(&account, 100); // Should fail with code 1
}`;
    case "#[test_only]":
      return `#[test_only]
fun create_test_account(): signer {
    account::create_account_for_test(@0x1)
}`;
    case "#[private_generics]":
      return `#[private_generics]
public fun create_token<T: store>(value: T): Token<T> {
    Token { value }
}`;
    case "#[deprecated]":
      return `#[deprecated]
public fun old_transfer(from: &signer, to: address, amount: u64) {
    // Use new_transfer instead
}`;
    default:
      return `// Example using ${attribute}`;
  }
}

// Create hover provider for line descriptions
export function createLineDescriptionHoverProvider(
  lineDescriptions: LineDescription[],
) {
  return {
    provideHover: (
      model: monaco.editor.ITextModel,
      position: monaco.Position,
    ) => {
      const lineNumber = position.lineNumber;
      const description = lineDescriptions.find((desc) =>
        desc.lines.includes(lineNumber),
      );

      if (description) {
        return {
          contents: [
            { value: "**Line Description**" },
            { value: description.content },
            ...(description.image
              ? [
                  {
                    value: `![${description.image.altText || "Line illustration"}](${description.image.url})`,
                  },
                ]
              : []),
          ],
        };
      }

      return null;
    },
  };
}

// Create decorations for line descriptions
export function createLineDescriptionDecorations(
  lineDescriptions: LineDescription[],
): monaco.editor.IModelDeltaDecoration[] {
  return lineDescriptions.flatMap((desc) =>
    desc.lines.map((lineNumber) => ({
      range: new monaco.Range(lineNumber, 1, lineNumber, 1),
      options: {
        isWholeLine: true,
        className: "bg-info bg-opacity-10",
        linesDecorationsClassName: "border-l-4 border-info",
        overviewRuler: {
          color: "rgb(34, 211, 238)",
          position: monaco.editor.OverviewRulerLane.Left,
        },
        minimap: {
          color: "rgb(34, 211, 238)",
          position: monaco.editor.MinimapPosition.Inline,
        },
      },
    })),
  );
}
