General render pipeline:
Fractal settings + image settings
vv fractal calculations vv
Escape time buffer
vv colorizing vv
Image data buffer


Fractal calculations:
* Low precision
  * CPU
    * 
* High precision

CPU and GPU pipeline similar; both will use kernel generation.


store structure / slices:
viewport
canvas dimensions
fractal type + params
hardware (CPU / GPU)
perturbation theory?
render scheme (full block, increasing res, blocks, layers)
gradient
orbit traps / escape time coloring


Kernel generators:
CPU: float64, full Dap, Dap perturbed
GPU: float32, AP, AP perturbed

Fractal metadata:
mehtods: escape time, buddha, newton
iteration styles: mandelbrot / julia
params: exponents, julia constants
