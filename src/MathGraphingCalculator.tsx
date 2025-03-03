import {
	initial,
	Layout,
	LayoutProps,
	resolveCanvasStyle,
	signal,
} from "@motion-canvas/2d";
import "./calculator";
import {
	Computed,
	createComputedAsync,
	createEffect,
	createSignal,
	PossibleVector2,
	SignalValue,
	SimpleSignal,
	Vector2,
} from "@motion-canvas/core";
import { MathExpression } from "./MathExpression";
import { useFirstParent } from "./utils/useParent";
import { MathSpace } from "./MathSpace";

export interface MathGraphingCalculatorProps extends LayoutProps {
	complex?: SignalValue<boolean>;
}

const enum GraphModes {
	ImplicitStroke = 8,
	ImplicitFill = 7,
	FromXToY = 2,
	FromYToX = 1,
	Parametric = 5,
}

// not permanent
type Branches = any;

export class MathGraphingCalculator extends Layout {
	calculator: Desmos.Calculator;

	plots: Computed<Record<string, Branches>>;

	@initial(false)
	@signal()
	public declare readonly complex: SimpleSignal<boolean, this>;

	@signal()
	private mathSpace: SimpleSignal<MathSpace, this> = createSignal(() =>
		useFirstParent(this, MathSpace)
	);

	public constructor(props?: MathGraphingCalculatorProps) {
		super(props);
		const container = document.createElement("div");
		const elem = document.createElement("div");
		createEffect(() => {
			document.body.appendChild(elem);
			if (!this.mathSpace()) return;
			elem.style.width = `${
				this.mathSpace().cs().x * this.mathSpace().absoluteScale().x
			}px`;
			elem.style.height = `${
				this.mathSpace().cs().y * this.mathSpace().absoluteScale().y
			}px`;
			this.calculator.resize();
			document.body.removeChild(elem);
		});
		this.calculator = Desmos.GraphingCalculator(elem, {
			expressions: false,

			// @ts-expect-error not up to date type defs
			complex: this.complex(),
		});
		createEffect(() => {
			this.calculator.setState(
				Object.assign(this.calculator.getState(), {
					// @ts-expect-error not up to date type defs
					graph: Object.assign(this.calculator.getState().graph, {
						complex: true,
					}),
				})
			);
		});
		createEffect(() => {
			const mathSpace = this.mathSpace();
			if (!mathSpace) return;
			const min = mathSpace.min();
			const max = mathSpace.max();
			this.calculator.setMathBounds({
				left: min.x - 1,
				right: max.x + 1,
				bottom: min.y - 1,
				top: max.y + 1,
			});
		});

		// @ts-expect-error type defs don't have this
		const orig = this.calculator.controller.evaluator.onEvaluatorResults;

		this.plots = createComputedAsync(async () => {
			const children = this.childrenAs<MathExpression>();
			const p: Record<string, Branches> = {};

			return new Promise((resolve) => {
				// @ts-expect-error type defs don't have this
				this.calculator.controller.evaluator.onEvaluatorResults = (u: any) => {
					for (const [key, value] of Object.entries(u.graphData.addedGraphs)) {
						p[key] = value;
						// @ts-expect-error
						if (value.compiled?.fn) {
							for (const child of children) {
								if (child.expressionId === key) {
									// @ts-expect-error
									child.fn(value.compiled?.fn);
								}
							}
						}
					}

					resolve(p);

					return orig(u);
				};

				for (const child of children) {
					this.calculator.setExpression({
						id: child.expressionId,
						latex: child.equation(),
						parametricDomain: {
							min: child.domain()[0],
							max: child.domain()[1],
						},
					});
					this.calculator.setExpression({
						id: child.expressionId,
						hidden: true,
					});
					this.calculator.setExpression({
						id: child.expressionId,
						hidden: false,
					});
				}
			});
		});
	}

	protected override draw(context: CanvasRenderingContext2D) {
		context.save();
		context.lineJoin = "round";
		const mathSpace = this.mathSpace();
		const children = this.childrenAs<MathExpression>().filter(
			(v) => v instanceof MathExpression
		);
		const plots = this.plots();
		if (!plots) return;

		const min = mathSpace.min();
		const max = mathSpace.max();

		const clippingRegionTopLeft = mathSpace.getPointFromPlotSpace([
			min.x,
			max.y,
		]);
		const clippingRegionBottomRight = mathSpace.getPointFromPlotSpace([
			max.x,
			min.y,
		]);

		const s = clippingRegionBottomRight.sub(clippingRegionTopLeft);

		context.beginPath();
		context.rect(
			clippingRegionTopLeft.x - context.lineWidth / 2,
			clippingRegionTopLeft.y - context.lineWidth / 2,
			s.x + context.lineWidth,
			s.y + context.lineWidth
		);
		context.clip();

		for (const child of children) {
			const plot = plots[child.expressionId];
			if (!plot) continue;

			for (const branch of plot) {
				context.save();
				context.globalAlpha = child.opacity();
				if ((branch?.segments?.length || 0) > 0) {
					const segments = branch.segments;
					context.beginPath();
					context.fillStyle = "transparent";

					this.drawSegments(branch, segments, context, child);

					context.fill();
					context.stroke();
				}
				context.restore();
			}
		}

		context.restore();
	}

	private drawSegments(
		branch: any,
		segments: any,
		context: CanvasRenderingContext2D,
		child: MathExpression
	): void {
		const mathSpace = this.mathSpace();
		const max = mathSpace.max();
		const min = mathSpace.min();

		switch (branch.graphMode) {
			case GraphModes.ImplicitStroke: {
				for (const s of segments) {
					if (branch.operator === ">" || branch.operator === "<") {
						const size = new Vector2(0.5)
							.div(mathSpace.max().sub(mathSpace.min()))
							.mul(mathSpace.cs()).x;
						const gap = new Vector2(0.1)
							.div(mathSpace.max().sub(mathSpace.min()))
							.mul(mathSpace.cs()).x;

						context.setLineDash([size, gap]);
					}
					const segment = pairs<number>(s).map((p) =>
						mathSpace.getPointFromPlotSpace(p)
					);

					context.lineWidth = child.lineWidth();
					context.strokeStyle = resolveCanvasStyle(child.stroke(), context);
					drawLineFromPoints(context, segment);
				}
				break;
			}
			case GraphModes.ImplicitFill: {
				for (const s of segments) {
					const segment = pairs<number>(s).map((p) =>
						mathSpace.getPointFromPlotSpace(p)
					);

					context.lineWidth = 0;
					context.strokeStyle = "transparent";
					context.fillStyle = resolveCanvasStyle(child.fill(), context);

					drawLineFromPoints(context, segment);
				}
				break;
			}
			case GraphModes.FromXToY: {
				for (const s of segments) {
					const rawSegment = pairs<number>(s);

					if (branch.operator === "<=" || branch.operator === "<") {
						context.fillStyle = resolveCanvasStyle(child.fill(), context);
						const startPoint: [number, number] = [rawSegment[0][0], min.y];
						const endPoint: [number, number] = [
							rawSegment[rawSegment.length - 1][0],
							min.y,
						];

						const segment = [startPoint, ...rawSegment, endPoint].map((p) =>
							mathSpace.getPointFromPlotSpace(p)
						);

						drawLineFromPoints(context, segment);
					} else if (branch.operator === ">=" || branch.operator === ">") {
						context.fillStyle = resolveCanvasStyle(child.fill(), context);

						const startPoint: [number, number] = [rawSegment[0][0], max.y];
						const endPoint: [number, number] = [
							rawSegment[rawSegment.length - 1][0],
							max.y,
						];

						const segment = [startPoint, ...rawSegment, endPoint].map((p) =>
							mathSpace.getPointFromPlotSpace(p)
						);

						drawLineFromPoints(context, segment);
					} else if (branch.operator === "=") {
						const segment = rawSegment.map((p) =>
							mathSpace.getPointFromPlotSpace(p)
						);
						drawLineFromPoints(context, segment);
					}

					if (branch.operator === ">" || branch.operator === "<") {
						const size = new Vector2(0.5)
							.div(mathSpace.max().sub(mathSpace.min()))
							.mul(mathSpace.cs()).x;
						const gap = new Vector2(0.1)
							.div(mathSpace.max().sub(mathSpace.min()))
							.mul(mathSpace.cs()).x;

						context.setLineDash([size, gap]);
					}
					context.strokeStyle = resolveCanvasStyle(child.stroke(), context);
					context.lineWidth = child.lineWidth();
				}
				break;
			}
			case GraphModes.FromYToX: {
				for (const s of segments) {
					const rawSegment = pairs<number>(s).map(
						([x, y]) => [y, x] satisfies [number, number]
					);

					if (branch.operator === "<=" || branch.operator === "<") {
						context.fillStyle = resolveCanvasStyle(child.fill(), context);
						const startPoint: [number, number] = [min.x, rawSegment[0][1]];
						const endPoint: [number, number] = [
							min.x,
							rawSegment[rawSegment.length - 1][1],
						];

						const segment = [startPoint, ...rawSegment, endPoint].map((p) =>
							mathSpace.getPointFromPlotSpace(p)
						);

						drawLineFromPoints(context, segment);
					} else if (branch.operator === ">=" || branch.operator === ">") {
						context.fillStyle = resolveCanvasStyle(child.fill(), context);

						const startPoint: [number, number] = [max.x, rawSegment[0][1]];
						const endPoint: [number, number] = [
							max.x,
							rawSegment[rawSegment.length - 1][1],
						];

						const segment = [startPoint, ...rawSegment, endPoint].map((p) =>
							mathSpace.getPointFromPlotSpace(p)
						);

						drawLineFromPoints(context, segment);
					} else if (branch.operator === "=") {
						const segment = rawSegment.map((p) =>
							mathSpace.getPointFromPlotSpace(p)
						);
						drawLineFromPoints(context, segment);
					}
					if (branch.operator === ">" || branch.operator === "<") {
						const size = new Vector2(0.5)
							.div(mathSpace.max().sub(mathSpace.min()))
							.mul(mathSpace.cs()).x;
						const gap = new Vector2(0.1)
							.div(mathSpace.max().sub(mathSpace.min()))
							.mul(mathSpace.cs()).x;

						context.setLineDash([size, gap]);
					}
					context.strokeStyle = resolveCanvasStyle(child.stroke(), context);
					context.lineWidth = child.lineWidth();
				}
				break;
			}
			case GraphModes.Parametric: {
				for (const s of segments) {
					const segment = pairs<number>(s).map((p) =>
						mathSpace.getPointFromPlotSpace(p)
					);

					context.lineWidth = child.lineWidth();
					context.strokeStyle = resolveCanvasStyle(child.stroke(), context);
					if (child.fillParametric())
						context.fillStyle = resolveCanvasStyle(child.fill(), context);
					drawLineFromPoints(context, segment);
				}
				break;
			}
		}
	}
}

function pairs<T>(values: T[]): [T, T][] {
	return values.reduce(
		(accumulator: [T, T][], _, currentIndex: number, array: T[]) => {
			if (currentIndex % 2 === 0) {
				accumulator.push(array.slice(currentIndex, currentIndex + 2) as [T, T]);
			}
			return accumulator;
		},
		[]
	);
}

function drawLineFromPoints(
	context: CanvasRenderingContext2D,
	points: PossibleVector2[]
): void {
	const firstPoint = new Vector2(points[0]);
	context.moveTo(firstPoint.x, firstPoint.y);
	for (const rawPoint of points.slice(1)) {
		const point = new Vector2(rawPoint);
		context.lineTo(point.x, point.y);
	}
}
