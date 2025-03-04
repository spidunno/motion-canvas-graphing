# Motion Canvas Graphing
Render expressions onto a graph (along with various other math utilities). Graphing powered by Desmos.
## Installation
`npm install @spidunno/motion-canvas-graphing`
## Example
All math components must be descendants of a `MathSpace` component. The `MathSpace` provides coordinate transformations from "math space" to pixel space.

All `MathExpression` components must be descendants of a `MathGraphingCalculator`.
 
Here's a full example that creates a grid and adds a sine wave to it:
```tsx
import { makeScene2D } from "@motion-canvas/2d";
import { Vector2 } from "@motion-canvas/core";
import {
	MathGrid,
	MathExpression,
	MathSpace,
	MathGraphingCalculator,
} from "@spidunno/motion-canvas-graphing";

export default makeScene2D(function* (view) {
	// MathGraphingCalculator is asynchronous, so it must be yielded to ensure it's loaded before rendering.
	yield view.add(
		<MathSpace
			width={() => view.width()}
			height={() => view.height()}
			/* `min` and `max` specify the domain that the `MathSpace` should span across */
			min={new Vector2(-8, -4.5)}
			max={new Vector2(8, 4.5)}
		>
			{/* Minor subdivisions */}
			<MathGrid lineWidth={1} spacing={[1 / 2, 1 / 2]} stroke="#4e5485" />

			{/* Major subdivisions */}
			<MathGrid
				lineWidth={2}
				spacing={[1, 1]}
				stroke="#919cff"
				xAxisStroke={"#f27949"}
				yAxisStroke={"#71e377"}
			/>

			<MathGraphingCalculator>
				<MathExpression
					/* equations are passed in as LaTeX, an easy way to write these is to write it in Desmos and then copy/paste it here. */
					equation={String.raw`y = \sin(x)`}
					stroke="rgb(241, 249, 12)"
				/>
			</MathGraphingCalculator>
		</MathSpace>
	);
}); 
```

## Usage

### `MathSpace`
The main component of this library is `MathSpace`. It provides all descendant components with transformations from math coordinates to pixel coordinates (for people familiar with React, think of `MathSpace` like a context provider.)

Specify the domain in math coordinates with the `min` and `max` props, and it'll map that to the size of the `MathSpace` element.

Example:
```tsx
view.add(<MathSpace
	min={[
	// x,  y
		-10, 10
	]}
	max={[
	// x,  y
		-10, 10
	]}
	width={800}
	height={800}
	>
{ /* ... */ }
</MathSpace>);
```

### `MathGrid`
The `MathGrid` component renders grid lines to a `MathSpace`.

API:
```tsx
export interface MathGridProps extends ShapeProps {
	/** The color of the grid lines */
	stroke?: SignalValue<PossibleCanvasStyle>;

	/** The color to use for the x axis (the line where y=0) */
	xAxisStroke?: SignalValue<PossibleCanvasStyle>;

	/** The color to use for the y axis (the line where x=0) */
	yAxisStroke?: SignalValue<PossibleCanvasStyle>;

	/** Grid lines line width */
	lineWidth?: SignalValue<number>;

	/** Line width of the x and y axis lines */
	axesLineWidth?: SignalValue<number>;

	/** Spacing between grid lines */
	spacing?: SignalValue<PossibleVector2>;

	/** Start of the grid lines as percentage */
	start?: SignalValue<number>;

	/** End of the grid lines as percentage, animate this going from 0 to 1 for a nice animation */
	end?: SignalValue<number>;

	/** Opacity of the grid, use this instead of `opacity` because of weird behavior with `opacity` */
	alpha?: SignalValue<number>;
}
```

## Credits
spidunno - main developer
protowalker - helped with improving the codebase
desmos - made the tool that powers this one