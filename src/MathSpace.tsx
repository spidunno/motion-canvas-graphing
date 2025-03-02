import {
	computed,
	initial,
	Layout,
	LayoutProps,
	vector2Signal,
} from "@motion-canvas/2d";
import {
	createComputedAsync,
	createEffect,
	DependencyContext,
	PossibleVector2,
	SignalValue,
	Vector2,
	Vector2Signal,
} from "@motion-canvas/core";
import "./calculator";

export interface MathSpaceProps extends LayoutProps {
	minX?: SignalValue<number>;
	minY?: SignalValue<number>;
	min?: SignalValue<PossibleVector2>;

	maxX?: SignalValue<number>;
	maxY?: SignalValue<number>;
	max?: SignalValue<PossibleVector2>;
}

export class MathSpace extends Layout {
	@initial(Vector2.zero)
	@vector2Signal("min")
	public declare readonly min: Vector2Signal<this>;

	@initial(Vector2.one.mul(100))
	@vector2Signal("max")
	public declare readonly max: Vector2Signal<this>;

	// public readonly calculator = createComputedAsync<Desmos.Calculator>(() => {
	// 	return new Promise((resolve) =>
	// 		resolve(
	// 			Desmos.GraphingCalculator(null, {
	// 				expressions: false,
	// 			})
	// 		)
	// 	);
	// });

	public constructor(props?: MathSpaceProps) {
		super(props);
		
		// // createEffect(() => {
		// 	// if (!this.calculator) return;

		// 	// @ts-expect-error the type defs don't have this
		// 	const orig = this.calculator.controller.evaluator.onEvaluatorResults;

		// 	// @ts-expect-error the type defs don't have this
		// 	this.calculator.controller.evaluator.onEvaluatorResults = (u: any) => {
		// 		console.log(this.listeners);

		// 		this.listeners.forEach((cb) => cb(u));
		// 		return orig(u);
		// 	};
		// });
	}

  @computed()
	public cs() {
		return this.computedSize();
	}

	public getPointFromPlotSpace(point: PossibleVector2) {
		const bottomLeft = this.computedSize().mul([-0.5, 0.5]);

		return this.toRelativeGridSize(point)
			.mul([1, -1])
			.mul(this.computedSize())
			.add(bottomLeft);
	}

	private toRelativeGridSize(p: PossibleVector2) {
		return new Vector2(p).sub(this.min()).div(this.max().sub(this.min()));
	}
}
