/*
 * File:    buildingblocks.js
 * Author:  Zach Wassynger
 * Purpose: Part of Project 2 in CS 435. Lets the user create and manipulate
 *          a set of building blocks on a canvas.
 */

var canvas;
var gl;

// Circle constants
var numCircleTriangles = 20;
var twoPi = 6.28;
var diskRadius = 20;
// Square constants
var squareSideLength = 40;
// Color constants
var RED     = vec4(1.0, 0.0, 0.0, 1.0);
var GREEN   = vec4(0.0, 1.0, 0.0, 1.0);
var BLUE    = vec4(0.0, 0.0, 1.0, 1.0);
var MAGENTA = vec4(1.0, 0.0, 1.0, 1.0);
var CYAN    = vec4(0.0, 1.0, 1.0, 1.0);
var YELLOW  = vec4(1.0, 1.0, 0.0, 1.0);

var blocks = [];
var movingBlockIndex = -1;
var oldX, oldY;

var vPosition;

var keysPressed = [
    false,
    false,
    false,
    false,
    false,
    false
]

/*
 * Abstract base class for building blocks.
 * NOT meant to be instantiated.
 */
class Block
{
    constructor(color)
    {
        this.color = color;
        this.offsetX = 0;
        this.offsetY = 0;
        this.vBuffer;
    }
    
    init()
    {
        this.vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.points), gl.STATIC_DRAW);
    }
    
    draw()
    {
        //var tm = translate(this.points[0][0] + this.offsetX, this.points[0][1] + this.offsetY, 0.0);
        //gl.uniform4fv(fColor, flatten(this.color));
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);
        
        gl.drawArrays(gl.TRIANGLE_FAN, 0, this.points.length);
    }
    
    updateOffset(dx, dy)
    {
        this.offsetX += dx;
        this.offsetY += dy;
    }
}

class Disk extends Block
{
    constructor(color, centerX, centerY, radius)
    {
        super(color);
        this.isDisk = true;
        this.isSquare = false;
        this.points = [vec2(centerX, centerY)];
        for (var i = 0; i < numCircleTriangles; i++)
        {
            var x = centerX + (radius * Math.cos(i * twoPi / numCircleTriangles));
            var y = centerY + (radius * Math.sin(i * twoPi / numCircleTriangles));
            this.points.push(vec2(x, y));
        }
    }
}

class Square extends Block
{
    constructor(color, centerX, centerY, sideLength)
    {
        super(color);
        this.isDisk = false;
        this.isSquare = true;
        this.points = [
            vec2(centerX-(sideLength/2), centerY+(sideLength/2)),
            vec2(centerX-(sideLength/2), centerY-(sideLength/2)),
            vec2(centerX+(sideLength/2), centerY-(sideLength/2)),
            vec2(centerX+(sideLength/2), centerY+(sideLength/2))
        ];
    }
}

window.onload = function init()
{
    canvas = document.getElementById("gl-canvas");
    
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.9, 0.9, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    document.addEventListener("keydown", function(event)
    {
        // If numbers 1-6 are pressed, update the array
        if (event.keyCode >= 49 && event.keyCode <= 54)
            keysPressed[event.keyCode-49] = true;
    })

    document.addEventListener("keyup", function(event)
    {
        // If numbers 1-6 are released, update the array
        if (event.keyCode >= 49 && event.keyCode <= 54)
            keysPressed[event.keyCode-49] = false;
    })

    canvas.addEventListener("mousedown", function(event)
    {
        if (event.button != 0)  return;

        var x = event.pageX - canvas.offsetLeft;
        var y = event.pageY - canvas.offsetTop;
        y=canvas.height-y;

        // Check if a block is to be deleted
        if (event.shiftKey)
        {
            for (var i = blocks.length-1; i >= 0; i--)
            {
                if (blocks[i].isInside(x, y))
                {
                    // Move block to top
                    var temp = blocks[i];
                    for (var j = i; j < blocks.length; j++)
                        blocks[j] = blocks[j+1];
                    blocks[blocks.length] = temp;
                    // Remove block
                    blocks.pop();
                    window.requestAnimationFrame(render);
                    return;
                }
            }
            return;
        }
        // Check if a block is to be added
        if (keysPressed[0]) spawnDisk(RED, x, y);
        else if (keysPressed[1]) spawnDisk(GREEN, x, y);
        else if (keysPressed[2]) spawnDisk(BLUE, x, y);
        else if (keysPressed[3]) spawnSquare(MAGENTA, x, y);
        else if (keysPressed[4]) spawnSquare(CYAN, x, y);
        else if (keysPressed[5]) spawnSquare(YELLOW, x, y);
        else    // Try to move block
        {
            for (var i = blocks.length-1; i >= 0; i--)
            {
                if (blocks[i].isInside(x, y))
                {
                    // Move block to top
                    var temp = blocks[i];
                    for (var j = i; j < blocks.length; j++)
                        blocks[j] = blocks[j+1];
                    blocks[blocks.length] = temp;
                    
                    movingBlockIndex = blocks.length;
                    oldX = x;
                    oldY = y;
                    
                    window.requestAnimationFrame(render);
                }
            }
        }
    })
    
    canvas.addEventListener("mouseup", function(event)
    {
        if (movingBlockIndex >= 0)
            movingBlockIndex = -1;
    })
    
    canvas.addEventListener("mousemove", function(event)
    {
        if (movingBlockIndex >= 0)
        {
            var x = event.pageX - canvas.offsetLeft;
            var y = event.pageY - canvas.offsetTop;
            y=canvas.height-y;
            
            blocks[movingBlockIndex].updateOffset(x-oldX, y-oldY);
            oldX=x;
            oldY=y;
            window.requestAnimFrame(render);
        }
    })
};

function spawnDisk(color, x, y)
{
    blocks.push(new Disk(color, x, y, diskRadius));
    window.requestAnimationFrame(render);
}

function spawnSquare(color, x, y)
{
    blocks.push(new Square(color, x, y, squareSideLength));
    window.requestAnimationFrame(render);
}

function render()
{
    gl.clear(gl.COLOR_BUFFER_BIT);

    for (var i=0; i<blocks.length; i++) {
        blocks[i].draw();
    }
}
