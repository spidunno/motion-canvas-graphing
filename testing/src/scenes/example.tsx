import {Camera, Circle, makeScene2D} from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeOutCubic,
  map,
  remap,
  tween,
  Vector2,
} from '@motion-canvas/core';
import {
  MathSpace,
  MathGrid,
  MathAxis,
  MathGraphingCalculator,
  MathExpression,
} from '../../../src/index';

export default makeScene2D(function* (view) {
  const ms = createRef<MathSpace>();

  const end = createSignal(1);

  const min = createSignal(new Vector2([-8, -4.5]));
  const max = createSignal(new Vector2([8, 4.5]));

  const equation = createSignal(String.raw`f(x) = \sin(x)`);

  const spacing = createSignal(2);

  const expr = createRef<MathExpression>();
  const t = createSignal(0);
  const camera = createRef<Camera>();
  const point = createRef<Circle>();
  yield view.add(
    <Camera ref={camera}>
      <MathSpace
        width={() => view.width()}
        height={() => view.height()}
        min={() => min()}
        max={() => max()}
        ref={ms}
      >
        <MathGrid
          fontWeight={900}
          end={() => end()}
          lineWidth={1}
          spacing={() => [spacing() / 4, spacing() / 4]}
          stroke="#919cff"
          // xAxisStroke={'#f27949'}
          // yAxisStroke={'#71e377'}
        />
        <MathGrid
          fontWeight={900}
          end={() => end()}
          lineWidth={2}
          spacing={() => [spacing(), spacing()]}
          stroke="#919cff"
          xAxisStroke={'#f27949'}
          yAxisStroke={'#71e377'}
        />

        <MathAxis end={() => end()} spacing={() => spacing()} axis={'x'} />
        <MathAxis
          end={() => end()}
          spacing={() => spacing()}
          displayZero={false}
          axis={'y'}
        />

        <MathGraphingCalculator>
          <MathExpression
            ref={expr}
            opacity={() => end()}
            equation={String.raw`y = \sin(x)`}
          />
        </MathGraphingCalculator>
        <Circle
          ref={point}
          /* @ts-expect-error */
          middle={() => {if(expr().fn()) return ms().getPointFromPlotSpace([t(), expr().fn()(t())])}}
          size={64}
          fill={() => `rgba(53, 140, 241, ${map(0, 0.5, end())})`}
        >
          <Circle size={32} fill={() => `rgba(53, 140, 241, ${map(0, 1, end())})`} />
        </Circle>
      </MathSpace>
    </Camera>,
  );
  // // yield* t(2, 1);
  // yield* end(1, 3, easeOutCubic);
  // yield* all(t(2, 1).run(camera().centerOn(point(), 1)));
});
