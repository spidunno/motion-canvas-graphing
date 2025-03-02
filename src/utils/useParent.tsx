import { Node } from "@motion-canvas/2d";

export function useFirstParent<N extends Node, T extends typeof Node>(node: N, contextNodeClass: T, maxRecursion: number = 100): InstanceType<T> | null {
	if (maxRecursion <= 0) throw new Error(`Max recursion depth for "useContext" exceeded!`);

	const parent = node.parent();

	if (typeof parent === 'undefined' || parent === null) return null;
	if (parent instanceof contextNodeClass) return parent as InstanceType<T>;
	return useFirstParent(parent, contextNodeClass, maxRecursion - 1);
}