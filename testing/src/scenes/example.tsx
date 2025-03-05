import {Circle, makeScene2D} from '@motion-canvas/2d';
import {createRef, createSignal, easeOutCubic, remap, Vector2} from '@motion-canvas/core';
import {MathSpace, MathGrid, MathAxis, MathGraphingCalculator, MathExpression} from '../../../src/index';

export default makeScene2D(function* (view) {
  const ms = createRef<MathSpace>();

  const end = createSignal(0);

  const min = createSignal(new Vector2([-8, -4.5]));
  const max = createSignal(new Vector2([8, 4.5]));

  yield view.add(
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
        spacing={[0.5, 0.5]}
        stroke="#919cff"
        // xAxisStroke={'#f27949'}
        // yAxisStroke={'#71e377'}
      />
      <MathGrid
        fontWeight={900}
        end={() => end()}
        lineWidth={2}
        spacing={[2, 2]}
        stroke="#919cff"
        xAxisStroke={'#f27949'}
        yAxisStroke={'#71e377'}
      />

      <MathAxis end={() => end()} spacing={2} axis={'x'} />
      <MathAxis end={() => end()} spacing={2} displayZero={false} axis={'y'} />

      <MathGraphingCalculator>
        <MathExpression domain={() => [min().x - 0.1, remap(0, 1, min().x - 0.1, max().x + 0.25, end())]} equation={String.raw`(t, \tan(t))`}/>
      </MathGraphingCalculator>
    </MathSpace>,
  );

  yield* end(1, 3, easeOutCubic);
});
