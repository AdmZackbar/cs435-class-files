/*
 * File:    buildingblocks.js
 * Author:  Zach Wassynger
 * Purpose: Part of Project 2 in CS 435. Lets the user create and manipulate
 *          a set of building blocks on a canvas.
 */

var canvas;
var gl;

var numCircleTriangles = 20;
var twoPi = 6.28;
var diskRadius = 20;

var blocks;

var keysPressed = [
    false,
    false,
    false,
    false,
    false,
    false
]

class Block
{
    constructor(color, centerX, centerY, radius)
    {
        this.isDisk = true;
        this.isSquare = false;
        this.color = color;
        this.points = [vec2(centerX, centerY)];
        for (var i = 0; i < numCircleTriangles; i++)
        {
            x = centerX + (radius * cos(i * twoPi / numCircleTriangles));
            y = centerY + (radius * sin(i * twoPi / numCircleTriangles));
            this.points.push(vec2(x, y));
        }
    }
    constructor(color, x0, y0, x1, y1, x2, y2, x3, y3)
    {
        this.isDisk = false;
        this.isSquare = true;
        this.color = color;
        this.points = [
            vec2(x0, y0),
            vec2(x1, y1),
            vec2(x2, y2),
            vec2(x3, y3)
        ];
    }

    init = function()
    {
        this.vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.points), gl.STATIC_DRAW);
    };

    draw = function()
    {
        var tm = translate(this.points[0][0] + this.OffsetX, this.points[0][1] + this.OffsetY, 0.0);
        tm = mult(tm, rotate(this.Angle, vec3(0, 0, 1)));
        tm = mult(tm, translate(-this.points[0][0], -this.points[0][1], 0.0));
        gl.uniformMatrix4fv(transformation, gl.TRUE, flatten(tm));
        gl.uniform4fv(fColor, flatten(this.color));
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);
        
        gl.drawArrays(gl.TRIANGLE_FAN, 0, this.points.length);
    };
}

class BlockOld
{
    constructor(numVertex, color, x0, y0, x1, y1, x2, y2, x3, y3)
    {
        this.NumVertices = numVertex;
        this.color = color;
        this.points = [
            vec2(x0, y0),
            vec2(x1, y1),
            vec2(x2, y2),
            vec2(x3, y3)
        ];
    }

    vBuffer = 0;
    OffsetX = 0;
    OffsetY = 0;
    Angle = 0;
    UpdateOffset = function(dx, dy)
    {
        this.OffsetX += dx;
        this.OffsetY += dy;
    };
    SetOffset = function(dx, dy)
    {
        this.OffsetX = dx;
        this.OffsetY = dy;
    };
    UpdateAngle = function(deg)
    {
        this.Angle += deg;
    };
    SetAngle = function(deg)
    {
        this.Angle = deg;
    };
    isLeft = function(x, y, id)
    {
        var id1 = (id + 1) % this.NumVertices;
        return (y - this.points[id][1]) * (this.points[id1][0] - this.points[id][0]) > (x - this.points[id][0]) * (this.points[id1][1] - this.points[id][1]);
    };
    transform = function(x, y)
    {
        var theta = -Math.PI / 180 * this.Angle; // in radians
        var x2 = this.points[0][0] + (x - this.points[0][0] - this.OffsetX) * Math.cos(theta) - (y - this.points[0][1] - this.OffsetY) * Math.sin(theta);
        var y2 = this.points[0][1] + (x - this.points[0][0] - this.OffsetX) * Math.sin(theta) + (y - this.points[0][1] - this.OffsetY) * Math.cos(theta);
        return vec2(x2, y2);
    };
    isInside = function(x, y)
    {
        var p = this.transform(x, y);
        for (var i = 0; i < this.NumVertices; i++) {
            if (!this.isLeft(p[0], p[1], i))
                return false;
        }
        return true;
    };
    init = function()
    {
        this.vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.points), gl.STATIC_DRAW);
    };
    draw = function()
    {
        var tm = translate(this.points[0][0] + this.OffsetX, this.points[0][1] + this.OffsetY, 0.0);
        tm = mult(tm, rotate(this.Angle, vec3(0, 0, 1)));
        tm = mult(tm, translate(-this.points[0][0], -this.points[0][1], 0.0));
        gl.uniformMatrix4fv(transformation, gl.TRUE, flatten(tm));
        gl.uniform4fv(fColor, flatten(this.color));
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);
        if (this.NumVertices == 3) {
            gl.drawArrays(gl.TRIANGLES, 0, this.NumVertices);
        }
        else {
            gl.drawArrays(gl.TRIANGLE_FAN, 0, this.NumVertices);
        }
    };
}

window.onload = function init()
{
    canvas = document.getElementById("gl-canvas");
    
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert( "WebGL isn't available" ); }

    canvas.addEventListener("keydown", function(event)
    {
        // If numbers 1-6 are pressed, update the array
        if (event.keyCode >= 49 && event.keyCode <= 54)
            keysPressed[event.keyCode-49] = true;
    })

    canvas.addEventListener("keyup", function(event)
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
        
    })
};

function render()
{
    gl.clear(gl.COLOR_BUFFER_BIT);

    for (var i=0; i<blocks.length; i++) {
        blocks[i].draw();
    }
}
