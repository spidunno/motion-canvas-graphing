# Motion Canvas Graphing
Render expressions onto a graph (along with various other math utilities). Graphing powered by Desmos.
## Installation
`npm install @spidunno/motion-canvas-graphing`
## Usage
All math components must be descendants of a `MathSpace` component. The `MathSpace` provides coordinate transformations from "math space" to pixel space.

All `MathExpression` components must be descendants of a `MathGraphingCalculator`.
 
Here's a full example that creates a grid and adds a sine wave to it:
```tsx
import { makeScene2D } from "@motion-canvas/2d";
import { MathSpace } from "../components/MathSpace";
import { MathGrid } from "../components/MathGrid";
import { createRef, createSignal } from "@motion-canvas/core";
import { MathGraphingCalculator } from "../components/MathGraphingCalculator";
import { MathExpression } from "../components/MathExpression";

export default makeScene2D(function* (view) {
   // MathGraphingCalculator is asynchronous, so it must be yielded to ensure it's loaded before rendering.
	yield view.add(
		<MathSpace
			ref={ms}
			width={() => view.width()}
			height={() => view.height()}

         /* `min` and `max` specify the domain that the `MathSpace` should span across */
			min={new Vector2(-8, 8)}
			max={new Vector2(-4.5, 4.5)}
		>
         { /* Minor subdivisions */ }
         <MathGrid lineWidth={1} spacing={[1 / 2, 1 / 2]} stroke="#4e5485" />
         
         { /* Major subdivisions */ }
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

## Credits
spidunno - main developer
protowalker - helped with improving the codebase
desmos - made the tool that powers this one