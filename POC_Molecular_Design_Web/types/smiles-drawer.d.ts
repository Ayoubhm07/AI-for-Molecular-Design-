// Declaration minimale : le paquet smiles-drawer ne fournit pas ses types.
declare module "smiles-drawer" {
  export class Drawer {
    constructor(options?: Record<string, unknown>);
    draw(
      tree: unknown,
      target: HTMLCanvasElement | string,
      theme?: string,
      infoOnly?: boolean
    ): void;
  }
  export function parse(
    smiles: string,
    success: (tree: unknown) => void,
    error?: (err: unknown) => void
  ): void;
  const _default: {
    Drawer: typeof Drawer;
    parse: typeof parse;
  };
  export default _default;
}
