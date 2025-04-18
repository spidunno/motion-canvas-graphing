import {
  initial,
  Layout,
  LayoutProps,
  resolveCanvasStyle,
  signal,
} from '@motion-canvas/2d';
import './calculator';
import {
  clamp,
  Computed,
  createComputedAsync,
  createEffect,
  createSignal,
  DependencyContext,
  errorToLog,
  PossibleVector2,
  SignalValue,
  SimpleSignal,
  useLogger,
  Vector2,
} from '@motion-canvas/core';
import {MathExpression} from './MathExpression';
import {useFirstParent} from './utils/useParent';
import {MathSpace} from './MathSpace';

export interface MathGraphingCalculatorProps extends LayoutProps {
  complex?: SignalValue<boolean>;
  debug?: SignalValue<boolean>;
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

  @initial(false)
  @signal()
  public declare readonly debug: SimpleSignal<boolean, this>;

  @signal()
  private mathSpace: SimpleSignal<MathSpace, this> = createSignal(() =>
    useFirstParent(this, MathSpace),
  );

  public constructor(props?: MathGraphingCalculatorProps) {
    super(props);
    const container = document.createElement('div');
    const elem = document.createElement('div');
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
        }),
      );
    });
    // createEffect(() => {
    //   const mathSpace = this.mathSpace();
    //   if (!mathSpace) return;
    //   const min = mathSpace.min();
    //   const max = mathSpace.max();
    //   this.calculator.setMathBounds({
    //     left: min.x,
    //     right: max.x,
    //     bottom: min.y,
    //     top: max.y,
    //   });
    // });

    // @ts-expect-error type defs don't have this
    const orig = this.calculator.controller.evaluator.onEvaluatorResults;

    this.plots = createComputedAsync(async () => {
      const children = this.childrenAs<MathExpression>();
      const p: Record<string, Branches> = {};

      return await new Promise((resolve, reject) => {
        const errors: string[] = [];
        const neededChanges = new Set(
          children
            .filter(v => v instanceof MathExpression)
            .map(v => v.expressionId),
        );
        // @ts-expect-error type defs don't have this
        this.calculator.controller.evaluator.onEvaluatorResults = (u: any) => {
          for (const [key, value] of Object.entries(u.evaluationStates)) {
            // console.log(key, value);
            // @ts-expect-error type defs don't have this
            if (value.error) {
              // @ts-expect-error type defs don't have this
              errors.push(`Desmos Error: ${this.calculator.controller.s(value.error.key, value.error.vars)}`);

              neededChanges.delete(key);
            }
            // @ts-expect-error type defs don't have this
            if (value.is_graphable === false) neededChanges.delete(key);
          }
          for (const [key, value] of Object.entries(u.graphData.addedGraphs)) {
            let resolved = true;
            // @ts-expect-error type defs again
            for (const graph of value) {
              	if (graph.resolved === false) resolved = false;
            }
            p[key] = value;
            if (resolved && neededChanges.has(key)) neededChanges.delete(key);
						// @ts-expect-error
            if (value?.[0].compiled?.fn) {
              for (const child of children) {
                if (child.expressionId === key) {
                  // @ts-expect-error
                  child.fn(() => value?.[0].compiled?.fn);
                }
              }
            }
          }
          if (neededChanges.size === 0) resolve({plots: p, errors});

          return orig(u);
        };

        const mathSpace = this.mathSpace();
        // if (!mathSpace) return;
        const min = mathSpace.min();
        const max = mathSpace.max();

        const mathCoordinates =
          // @ts-expect-error type defs
          this.calculator._calc.graphpaperBounds.mathCoordinates;
        if (
          mathCoordinates.left !== min.x ||
          mathCoordinates.right !== max.x ||
          mathCoordinates.top !== max.x ||
          mathCoordinates.bottom !== min.y
        ) {
          this.calculator.setMathBounds({
            left: min.x,
            right: max.x,
            bottom: min.y,
            top: max.y,
          });
        }

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
    context.lineJoin = 'round';
    const mathSpace = this.mathSpace();
    const children = this.childrenAs<MathExpression>().filter(
      v => v instanceof MathExpression,
    );
    const obj = this.plots();
    if (!obj) return;
    const { plots, errors } = obj;
    if (errors.length > 0) useLogger().error(errors.join("\n"))

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

    if (!this.debug()) {
      context.beginPath();
      context.rect(
        clippingRegionTopLeft.x - context.lineWidth / 2,
        clippingRegionTopLeft.y - context.lineWidth / 2,
        s.x + context.lineWidth,
        s.y + context.lineWidth,
      );
      context.clip();
    }

    for (const child of children) {
      const plot = plots[child.expressionId];
      if (!plot) continue;

			// Sort the order of the branches so that the stroke of an implicit is always drawn above the fill
			const pSorted = plot.toSorted((a: any, b: any) => {
				if (a.graphMode === GraphModes.ImplicitStroke && b.graphMode === GraphModes.ImplicitFill) {
					return 1;
				} else if (b.graphMode === GraphModes.ImplicitStroke && a.graphMode === GraphModes.ImplicitFill) {
					return -1
				} else {
					return 0;
				}

		});

      for (const branch of pSorted) {
        context.save();
        context.globalAlpha = child.opacity();
        if ((branch?.segments?.length || 0) > 0) {
          const segments = branch.segments;
          // context.beginPath();
          context.fillStyle = 'transparent';
          const fillPath = new Path2D();
          const strokePath = new Path2D();
          this.drawSegments(
            fillPath,
            strokePath,
            branch,
            segments,
            context,
            child,
          );
					context.lineCap = "round";
          context.fill(fillPath);
          context.stroke(strokePath);
        }
        context.restore();
      }
    }

    context.restore();
  }

  private drawSegments(
    fillPath: Path2D,
    strokePath: Path2D,
    branch: any,
    segments: any,
    context: CanvasRenderingContext2D,
    child: MathExpression,
  ): void {
    const mathSpace = this.mathSpace();
    const max = mathSpace.max();
    const min = mathSpace.min();

    switch (branch.graphMode) {
      case GraphModes.ImplicitStroke: {
				// console.log(branch);
        for (const s of segments) {
          if (branch.operator === '>' || branch.operator === '<') {
            // const size = new Vector2(0.5)
            //   .div(mathSpace.max().sub(mathSpace.min()))
            //   .mul(mathSpace.cs()).x;
            // const gap = new Vector2(0.1)
            //   .div(mathSpace.max().sub(mathSpace.min()))
            //   .mul(mathSpace.cs()).x;

            context.setLineDash(child.lineDash());
          }
          const segment = pairs<number>(s).map(p =>
            mathSpace.getPointFromPlotSpace(p),
          );

          context.lineWidth = child.lineWidth();
          context.strokeStyle = resolveCanvasStyle(child.stroke(), context);
          drawLineFromPoints(strokePath, segment);
        }
        break;
      }
      case GraphModes.ImplicitFill: {
        for (const s of segments) {
          const segment = pairs<number>(s).map(p =>
            mathSpace.getPointFromPlotSpace(p),
          );

          context.lineWidth = 0;
          context.strokeStyle = 'transparent';
          context.fillStyle = resolveCanvasStyle(child.fill(), context);

          drawLineFromPoints(fillPath, segment);
        }
        break;
      }
      case GraphModes.FromXToY: {
        for (const s of segments) {
          const rawSegment = pairs<number>(s);

          if (branch.operator === '<=' || branch.operator === '<') {
            context.fillStyle = resolveCanvasStyle(child.fill(), context);
            const startPoint: [number, number] = [rawSegment[0][0], min.y];
            const endPoint: [number, number] = [
              rawSegment[rawSegment.length - 1][0],
              min.y,
            ];

            const segment = [startPoint, ...rawSegment, endPoint]
              .map(v => {
                const min = mathSpace.min();
                const max = mathSpace.max();

                return new Vector2(
                  clamp(min.x - 1, max.x + 1, v[0]),
                  clamp(min.y - 1, max.y + 1, v[1]),
                );
              })
              .map(p => mathSpace.getPointFromPlotSpace(p));
            drawLineFromPoints(fillPath, segment);
          } else if (branch.operator === '>=' || branch.operator === '>') {
            context.fillStyle = resolveCanvasStyle(child.fill(), context);

            const startPoint: [number, number] = [rawSegment[0][0], max.y];
            const endPoint: [number, number] = [
              rawSegment[rawSegment.length - 1][0],
              max.y,
            ];

            const segment = [startPoint, ...rawSegment, endPoint]
              .map(v => {
                const min = mathSpace.min();
                const max = mathSpace.max();

                return new Vector2(
                  clamp(min.x - 1, max.x + 1, v[0]),
                  clamp(min.y - 1, max.y + 1, v[1]),
                );
              })
              .map(p => mathSpace.getPointFromPlotSpace(p));

            drawLineFromPoints(fillPath, segment);
          }
          if (branch.operator === '>' || branch.operator === '<') {
            // const size = new Vector2(0.5)
            //   .div(mathSpace.max().sub(mathSpace.min()))
            //   .mul(mathSpace.cs()).x;
            // const gap = new Vector2(0.1)
            //   .div(mathSpace.max().sub(mathSpace.min()))
            //   .mul(mathSpace.cs()).x;

            context.setLineDash(child.lineDash());
          }
          const segment = rawSegment
            .map(v => {
              const min = mathSpace.min();
              const max = mathSpace.max();

              return new Vector2(
                clamp(min.x - 1, max.x + 1, v[0]),
                clamp(min.y - 1, max.y + 1, v[1]),
              );
            })
            .map(p => mathSpace.getPointFromPlotSpace(p));
          drawLineFromPoints(strokePath, segment);
          context.strokeStyle = resolveCanvasStyle(child.stroke(), context);
          context.lineWidth = child.lineWidth();
        }
        break;
      }
      case GraphModes.FromYToX: {
        for (const s of segments) {
          const rawSegment = pairs<number>(s).map(
            ([x, y]) => [y, x] satisfies [number, number],
          );

          if (branch.operator === '<=' || branch.operator === '<') {
            context.fillStyle = resolveCanvasStyle(child.fill(), context);
            const startPoint: [number, number] = [min.x, rawSegment[0][1]];
            const endPoint: [number, number] = [
              min.x,
              rawSegment[rawSegment.length - 1][1],
            ];

            const segment = [startPoint, ...rawSegment, endPoint]
              .map(v => {
                const min = mathSpace.min();
                const max = mathSpace.max();

                return new Vector2(
                  clamp(min.x - 1, max.x + 1, v[0]),
                  clamp(min.y - 1, max.y + 1, v[1]),
                );
              })
              .map(p => mathSpace.getPointFromPlotSpace(p));

            drawLineFromPoints(fillPath, segment);
          } else if (branch.operator === '>=' || branch.operator === '>') {
            context.fillStyle = resolveCanvasStyle(child.fill(), context);

            const startPoint: [number, number] = [max.x, rawSegment[0][1]];
            const endPoint: [number, number] = [
              max.x,
              rawSegment[rawSegment.length - 1][1],
            ];

            const segment = [startPoint, ...rawSegment, endPoint]
              .map(v => {
                const min = mathSpace.min();
                const max = mathSpace.max();

                return new Vector2(
                  clamp(min.x - 1, max.x + 1, v[0]),
                  clamp(min.y - 1, max.y + 1, v[1]),
                );
              })
              .map(p => mathSpace.getPointFromPlotSpace(p));

            drawLineFromPoints(fillPath, segment);
          }
          if (branch.operator === '>' || branch.operator === '<') {
            // const size = new Vector2(0.5)
            //   .div(mathSpace.max().sub(mathSpace.min()))
            //   .mul(mathSpace.cs()).x;
            // const gap = new Vector2(0.1)
            //   .div(mathSpace.max().sub(mathSpace.min()))
            //   .mul(mathSpace.cs()).x;

            context.setLineDash(child.lineDash());
          }

          const segment = rawSegment
            .map(v => {
              const min = mathSpace.min();
              const max = mathSpace.max();

              return new Vector2(
                clamp(min.x - 1, max.x + 1, v[0]),
                clamp(min.y - 1, max.y + 1, v[1]),
              );
            })
            .map(p => mathSpace.getPointFromPlotSpace(p));
          drawLineFromPoints(strokePath, segment);

          context.strokeStyle = resolveCanvasStyle(child.stroke(), context);
          context.lineWidth = child.lineWidth();
        }
        break;
      }
      case GraphModes.Parametric: {
        for (const s of segments) {
          const segment = pairs<number>(s).map(p =>
            mathSpace.getPointFromPlotSpace(p),
          );

          context.lineWidth = child.lineWidth();
          context.strokeStyle = resolveCanvasStyle(child.stroke(), context);
          if (child.fillParametric())
            context.fillStyle = resolveCanvasStyle(child.fill(), context);
          drawLineFromPoints(strokePath, segment);
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
    [],
  );
}

function drawLineFromPoints(path: Path2D, points: PossibleVector2[]): void {
  const firstPoint = new Vector2(points[0]);
  path.moveTo(firstPoint.x, firstPoint.y);
  for (const rawPoint of points.slice(1)) {
    const point = new Vector2(rawPoint);
    path.lineTo(point.x, point.y);
  }
}
