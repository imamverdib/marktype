/**
 * The maths nodes are atoms with only an `onClick` hook, so editing needs UI of
 * our own. The extensions are built once, outside React, so clicks travel
 * through this tiny bus to whichever component is currently mounted.
 */
export type MathTarget = {
  kind: "inline" | "block";
  latex: string;
  pos: number;
};

type Listener = (target: MathTarget) => void;

const listeners = new Set<Listener>();

export function emitMathClick(target: MathTarget) {
  listeners.forEach((listener) => listener(target));
}

export function onMathClick(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
