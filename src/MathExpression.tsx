import {
	CanvasStyleSignal,
	canvasStyleSignal,
	initial,
	Node,
	NodeProps,
	PossibleCanvasStyle,
	signal,
} from "@motion-canvas/2d";
import "./calculator";
import { SignalValue, SimpleSignal } from "@motion-canvas/core";
import { nanoid } from "nanoid";

export interface MathExpressionProps extends NodeProps {
	equation?: SignalValue<string>;

	stroke?: SignalValue<PossibleCanvasStyle>;
	fill?: SignalValue<PossibleCanvasStyle>;

	lineWidth?: SignalValue<number>;

	domain?: SignalValue<[number, number]>;

	fillParametric?: SignalValue<boolean>;
}

/**
 * Represents an exression in the underlying Desmos instance.
 * Must be a child of `MathGraphingCalculator`
 */
export class MathExpression extends Node {
	@initial("y = \\sin(x)")
	@signal()
	public declare readonly equation: SimpleSignal<string, this>;
	
	@initial(false)
	@signal()
	public declare readonly fillParametric: SimpleSignal<boolean, this>;

	@initial(() => () => 0)
	@signal()
	public declare readonly fn: SimpleSignal<(...args: number[]) => number | number[] >

	@initial("rgba(53, 140, 241, 0.25)")
	@canvasStyleSignal()
  public declare readonly fill: CanvasStyleSignal<this>;

	@initial("rgb(53, 140, 241)")
  @canvasStyleSignal()
  public declare readonly stroke: CanvasStyleSignal<this>;

	@initial([0, 1])
	@signal()
	public declare readonly domain: SimpleSignal<[number, number], this>;

	@initial(5)
  @signal()
  public declare readonly lineWidth: SimpleSignal<number, this>;

	public readonly expressionId = nanoid();

	public constructor(props?: MathExpressionProps) {
		super(props);
	}
}


/**
 * Alias for {@link MathExpression}
 */
export const MathGraph = MathExpression;