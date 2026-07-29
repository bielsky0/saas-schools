declare module "undo-manager" {
  export interface UndoManagerOptions {
    limit?: number;
  }

  export default class UndoManager {
    constructor(options?: UndoManagerOptions);
    add(command: { undo: () => void; redo: () => void }): void;
    undo(): void;
    redo(): void;
    clear(): void;
    hasUndo(): boolean;
    hasRedo(): boolean;
    getCommands(): any[];
    getIndex(): number;
    setLimit(limit: number): void;
    setCallback(callback: () => void): void;
  }
}

declare module "himalaya" {
  export interface HimalayaAttribute {
    key: string;
    value: string;
  }

  export interface HimalayaNode {
    type: "element" | "text" | "comment";
    tagName?: string;
    attributes?: HimalayaAttribute[];
    children?: HimalayaNode[];
    content?: string;
  }

  export function parse(html: string): HimalayaNode[];
  export function stringify(nodes: HimalayaNode[]): string;
}
