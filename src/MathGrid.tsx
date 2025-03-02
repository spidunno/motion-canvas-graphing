import {
	CanvasStyle,
	CanvasStyleSignal,
	colorSignal,
	initial,
	PossibleCanvasStyle,
	resolveCanvasStyle,
	Shape,
	ShapeProps,
	signal,
	vector2Signal,
} from "@motion-canvas/2d";
import {
	clamp,
	Color,
	ColorSignal,
	createEffect,
	createSignal,
	map,
	PossibleVector2,
	remap,
	SignalValue,
	SimpleSignal,
	Vector2Signal,
} from "@motion-canvas/core";
import { MathSpace } from "./MathSpace";
import { useFirstParent } from "./utils/useParent";

export interface MathGridProps extends ShapeProps {
	xAxisStroke?: SignalValue<PossibleCanvasStyle>;
	yAxisStroke?: SignalValue<PossibleCanvasStyle>;
	axesLineWidth?: SignalValue<number>;

	spacing?: SignalValue<PossibleVector2>;

	start?: SignalValue<number>;

	end?: SignalValue<number>;

	alpha?: SignalValue<number>;
}

export class MathGrid extends Shape {
	@initial(1)
	@vector2Signal("spacing")
	public declare readonly spacing: Vector2Signal<this>;

	@initial(1)
	@signal()
	public declare readonly alpha: SimpleSignal<number, this>;

	@initial(new Color("rgba(255, 255, 255, 0.8)"))
	@colorSignal()
	public declare readonly xAxisStroke: CanvasStyleSignal<this>;

	@initial(new Color("rgba(255, 255, 255, 0.8)"))
	@colorSignal()
	public declare readonly yAxisStroke: CanvasStyleSignal<this>;

	@initial(4)
	@signal()
	public declare readonly axesLineWidth: SimpleSignal<number, this>;

	/**
	 * The percentage that should be clipped from the beginning of each grid line.
	 *
	 * @remarks
	 * The portion of each grid line that comes before the given percentage will
	 * be made invisible.
	 *
	 * This property is useful for animating the grid appearing on-screen.
	 */
	@initial(0)
	@signal()
	public declare readonly start: SimpleSignal<number, this>;

	/**
	 * The percentage that should be clipped from the end of each grid line.
	 *
	 * @remarks
	 * The portion of each grid line that comes after the given percentage will
	 * be made invisible.
	 *
	 * This property is useful for animating the grid appearing on-screen.
	 */
	@initial(1)
	@signal()
	public declare readonly end: SimpleSignal<number, this>;

	@signal()
	private mathSpace: SimpleSignal<MathSpace, this> = createSignal(() =>
		useFirstParent(this, MathSpace)
	);

	public constructor(props: MathGridProps) {
		super(props);
	}

	protected override drawShape(context: CanvasRenderingContext2D) {
		context.save();
		this.applyStyle(context);
		context.globalAlpha = this.alpha();
		// this.transformContext(context);

		const mathSpace = this.mathSpace();
		const spacing = this.spacing();
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

		const [fromVertical, toVertical] = this.mapPoints(
			mathSpace.min().y,
			mathSpace.max().y,
			(1 - (1/1.5))
		);
		const [fromHorizontal, toHorizontal] = this.mapPoints(
			mathSpace.min().x,
			mathSpace.max().x,
		);

		for (
			let i = -spacing.x * (Math.floor(-min.x / spacing.x) + 1);
			i < max.x + 1;
			i += spacing.x
		) {
			const [fromVertical, toVertical] = this.mapPoints(
				mathSpace.min().y,
				mathSpace.max().y,
				(Math.abs(
					remap(
						-spacing.x * (Math.floor(-min.x / spacing.x) + 1),
						spacing.x * (Math.floor(max.x / spacing.x) + 1),
						0,
						2,
						i
					) - 1
				)/1.5) + (1 - (1/1.5))
			);
			const fromPoint = mathSpace.getPointFromPlotSpace([i, fromVertical]);
			const toPoint = mathSpace.getPointFromPlotSpace([i, toVertical]);

			context.beginPath();
			context.moveTo(fromPoint.x, fromPoint.y);
			context.lineTo(toPoint.x, toPoint.y);
			context.stroke();
		}

		for (
			let i = -spacing.y * (Math.floor(-min.y / spacing.y) + 1);
			i < max.y + 1;
			i += spacing.y
		) {
			const [fromHorizontal, toHorizontal] = this.mapPoints(
				mathSpace.min().x,
				mathSpace.max().x,
				Math.abs(
					remap(
						-spacing.y * (Math.floor(-min.y / spacing.y) + 1),
						spacing.y * (Math.floor(max.y / spacing.y) + 1),
						0,
						2,
						i
					) - 1
				)
			);

			const fromPoint = mathSpace.getPointFromPlotSpace([fromHorizontal, i]);
			const toPoint = mathSpace.getPointFromPlotSpace([toHorizontal, i]);

			context.beginPath();
			context.moveTo(fromPoint.x, fromPoint.y);
			context.lineTo(toPoint.x, toPoint.y);
			context.stroke();
		}

		context.save();
		context.lineWidth = this.axesLineWidth();

		const yAxisFrom = mathSpace.getPointFromPlotSpace([0, fromVertical]);
		const yAxisTo = mathSpace.getPointFromPlotSpace([0, toVertical]);

		const xAxisFrom = mathSpace.getPointFromPlotSpace([fromHorizontal, 0]);
		const xAxisTo = mathSpace.getPointFromPlotSpace([toHorizontal, 0]);

		context.strokeStyle = resolveCanvasStyle(this.yAxisStroke(), context);

		context.beginPath();
		context.moveTo(yAxisFrom.x, yAxisFrom.y);
		context.lineTo(yAxisTo.x, yAxisTo.y);
		context.stroke();

		context.strokeStyle = resolveCanvasStyle(this.xAxisStroke(), context);


		context.beginPath();
		context.moveTo(xAxisFrom.x, xAxisFrom.y);
		context.lineTo(xAxisTo.x, xAxisTo.y);
		context.stroke();

		context.restore();

		context.restore();
	}

	private mapPoints(
		start: number,
		end: number,
		d: number = 0
	): [number, number] {
		let from = map(start, end, this.start());
		let to = map(start, end, clamp(0, 1, this.end() * 2 - d));

		if (to < from) {
			[from, to] = [to, from];
		}

		return [from, to];
	}
}

function frac(x: number) {
	return x % 1;
}
