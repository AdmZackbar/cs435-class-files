/*
 * File:    buildingblocks.js
 * Author:  Zach Wassynger
 * Purpose: Part of Project 2 in CS 435. Lets the user create and manipulate
 *          a set of building blocks on a canvas.
 */

var canvas;
var gl;

var projection; // projection matrix uniform shader variable location
var transformation; // projection matrix uniform shader variable location
var vPosition;
// var vColor;
var fColor;

// state representation
var blocks; // seven blocks
var blockIdToBeMoved; // this black is moving
var MoveCount;
var OldX;
var OldY;

var rotIndex = 1; // default
var rotDegrees = [ 1, 5, 10, 30, 45, 90];

// Circle constants
var numCircleTriangles = 40;
var twoPi = 6.2832;
var diskRadius = 50;
// Square constants
var squareSideLength = 40;
// Color constants
var RED     = vec4(1.0, 0.0, 0.0, 1.0);
var GREEN   = vec4(0.0, 1.0, 0.0, 1.0);
var BLUE    = vec4(0.0, 0.0, 1.0, 1.0);
var MAGENTA = vec4(1.0, 0.0, 1.0, 1.0);
var CYAN    = vec4(0.0, 1.0, 1.0, 1.0);
var YELLOW  = vec4(1.0, 1.0, 0.0, 1.0);

var keysPressed = [
    false,
    false,
    false,
    false,
    false,
    false
]

function Square (color, x0, y0, x1, y1, x2, y2, x3, y3) {
    this.NumVertices = 4;
    this.color = color;
    this.points=[];
    this.points.push(vec2(x0, y0));
    this.points.push(vec2(x1, y1));
    this.points.push(vec2(x2, y2));
    this.points.push(vec2(x3, y3));
    // this.colors=[];
    // for (var i=0; i<4; i++) this.colors.push(color);

    this.vBuffer=0;
    // this.cBuffer=0;

    this.OffsetX=0;
    this.OffsetY=0;
    this.Angle=0;

    this.UpdateOffset = function(dx, dy) {
        this.OffsetX += dx;
        this.OffsetY += dy;
    }

    this.SetOffset = function(dx, dy) {
        this.OffsetX = dx;
        this.OffsetY = dy;
    }

    this.UpdateAngle = function(deg) {
        this.Angle += deg;
    }

    this.SetAngle = function(deg) {
        this.Angle = deg;
    }

    this.isLeft = function(x, y, id) {	// Is Point (x, y) located to the left when walking from id to id+1?
        var id1=(id+1)%this.NumVertices;
        return (y-this.points[id][1])*(this.points[id1][0]-this.points[id][0])>(x-this.points[id][0])*(this.points[id1][1]-this.points[id][1]);
    }

    this.transform = function(x, y) {
        var theta = -Math.PI/180*this.Angle;	// in radians
        var x2 = this.points[0][0] + (x - this.points[0][0]-this.OffsetX) * Math.cos(theta) - (y - this.points[0][1]-this.OffsetY) * Math.sin(theta);
        var y2 = this.points[0][1] + (x - this.points[0][0]-this.OffsetX) * Math.sin(theta) + (y - this.points[0][1]-this.OffsetY) * Math.cos(theta);
        return vec2(x2, y2);
    }

    this.isInside = function(x, y) {
        var p=this.transform(x, y);
        for (var i=0; i<this.NumVertices; i++) {
            if (!this.isLeft(p[0], p[1], i)) return false;
        }
        return true;
    }

    this.init = function() {
        this.vBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, this.vBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, flatten(this.points), gl.STATIC_DRAW );

        // this.cBuffer = gl.createBuffer();
        // gl.bindBuffer( gl.ARRAY_BUFFER, this.cBuffer );
        //gl.bufferData( gl.ARRAY_BUFFER, flatten(this.colors), gl.STATIC_DRAW );
    }

    this.draw = function() {
        var tm=translate(this.points[0][0]+this.OffsetX, this.points[0][1]+this.OffsetY, 0.0);
        tm=mult(tm, rotate(this.Angle, vec3(0, 0, 1)));
        tm=mult(tm, translate(-this.points[0][0], -this.points[0][1], 0.0));
        gl.uniformMatrix4fv( transformation, gl.TRUE, flatten(tm) );

        // send the color as a uniform variable
        gl.uniform4fv( fColor, flatten(this.color) );

        gl.bindBuffer( gl.ARRAY_BUFFER, this.vBuffer );
        gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( vPosition );

        // gl.bindBuffer( gl.ARRAY_BUFFER, this.cBuffer );
        // gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
        //gl.enableVertexAttribArray( vColor );

        gl.drawArrays(gl.TRIANGLE_FAN, 0, this.NumVertices);
    }
}

function Disk (color, centerX, centerY, radius) {
    this.NumVertices = numCircleTriangles+2;
    this.color = color;
    this.points = [vec2(centerX, centerY)];
    for (var i = 0; i <= numCircleTriangles; i++)
    {
        var x = centerX + (radius * Math.cos(i * twoPi / numCircleTriangles));
        var y = centerY + (radius * Math.sin(i * twoPi / numCircleTriangles));
        this.points.push(vec2(x, y));
    }
    // this.colors=[];
    // for (var i=0; i<4; i++) this.colors.push(color);

    this.vBuffer=0;
    // this.cBuffer=0;

    this.OffsetX=0;
    this.OffsetY=0;
    this.Angle=0;

    this.UpdateOffset = function(dx, dy) {
        this.OffsetX += dx;
        this.OffsetY += dy;
    }

    this.SetOffset = function(dx, dy) {
        this.OffsetX = dx;
        this.OffsetY = dy;
    }

    this.UpdateAngle = function(deg) {
        this.Angle += deg;
    }

    this.SetAngle = function(deg) {
        this.Angle = deg;
    }

    this.transform = function(x, y) {
        var theta = -Math.PI/180*this.Angle;	// in radians
        var x2 = this.points[0][0] + (x - this.points[0][0]-this.OffsetX) * Math.cos(theta) - (y - this.points[0][1]-this.OffsetY) * Math.sin(theta);
        var y2 = this.points[0][1] + (x - this.points[0][0]-this.OffsetX) * Math.sin(theta) + (y - this.points[0][1]-this.OffsetY) * Math.cos(theta);
        return vec2(x2, y2);
    }

    this.isInside = function(x, y) {
        var p=this.transform(x, y);
        var distance = Math.sqrt(Math.pow(p[0]-this.points[0][0], 2) + Math.pow(p[1]-this.points[0][1], 2));
        return distance < diskRadius;
    }

    this.init = function() {
        this.vBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, this.vBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, flatten(this.points), gl.STATIC_DRAW );

        // this.cBuffer = gl.createBuffer();
        // gl.bindBuffer( gl.ARRAY_BUFFER, this.cBuffer );
        //gl.bufferData( gl.ARRAY_BUFFER, flatten(this.colors), gl.STATIC_DRAW );
    }

    this.draw = function() {
        var tm=translate(this.points[0][0]+this.OffsetX, this.points[0][1]+this.OffsetY, 0.0);
        tm=mult(tm, rotate(this.Angle, vec3(0, 0, 1)));
        tm=mult(tm, translate(-this.points[0][0], -this.points[0][1], 0.0));
        gl.uniformMatrix4fv( transformation, gl.TRUE, flatten(tm) );

        // send the color as a uniform variable
        gl.uniform4fv( fColor, flatten(this.color) );

        gl.bindBuffer( gl.ARRAY_BUFFER, this.vBuffer );
        gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( vPosition );

        // gl.bindBuffer( gl.ARRAY_BUFFER, this.cBuffer );
        // gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
        //gl.enableVertexAttribArray( vColor );

        gl.drawArrays(gl.TRIANGLE_FAN, 0, this.NumVertices);
    }
}

window.onload = function initialize() {
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

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

    canvas.addEventListener("mousedown", function(event){
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
                    for (var j = i; j < blocks.length-1; j++)
                        blocks[j] = blocks[j+1];
                    blocks[blocks.length-1] = temp;
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
                    for (var j = i; j < blocks.length-1; j++)
                        blocks[j] = blocks[j+1];
                    blocks[blocks.length-1] = temp;
                    
                    blockIdToBeMoved = blocks.length-1;
                    OldX = x;
                    OldY = y;
                    
                    window.requestAnimationFrame(render);
                    return;
                }
            }
        }
    });

    canvas.addEventListener("mouseup", function(event){
        if (blockIdToBeMoved>=0) {
    /*
        var x = event.pageX - canvas.offsetLeft;
        var y = event.pageY - canvas.offsetTop;
        y=canvas.height-y;
        console.log("mouseup, x="+x+", y="+y);
    */
            blockIdToBeMoved=-1;
        }
    });

    canvas.addEventListener("mousemove", function(event){
        if (blockIdToBeMoved>=0) {  // if dragging
        var x = event.pageX - canvas.offsetLeft;
        var y = event.pageY - canvas.offsetTop;
        y=canvas.height-y;
        blocks[blockIdToBeMoved].UpdateOffset(x-OldX, y-OldY);
        MoveCount++;
        OldX=x;
        OldY=y;
        window.requestAnimFrame(render);
        // render();
        }
    });

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.5, 0.5, 0.5, 1.0 );

    // Load shaders and initialize attribute buffers
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Initial State
    blocks=[];

    blockIdToBeMoved=-1; // no piece selected

    projection = gl.getUniformLocation( program, "projection" );
    var pm = ortho( 0.0, canvas.width, 0.0, canvas.height, -1.0, 1.0 );
    gl.uniformMatrix4fv( projection, gl.TRUE, flatten(pm) );

    transformation = gl.getUniformLocation( program, "transformation" );

    fColor = gl.getUniformLocation( program, "fColor" );

    vPosition = gl.getAttribLocation( program, "vPosition" );
    // vColor = gl.getAttribLocation( program, "vColor" );

    render();
}

function spawnDisk(color, x, y) {
    var block = new Disk(color, x, y, diskRadius);
    block.init();
    blocks.push(block);
    window.requestAnimationFrame(render);
}

function spawnSquare(color, x, y) {
    var block = new Square( color, x-squareSideLength, y+squareSideLength, x-squareSideLength, 
                            y-squareSideLength, x+squareSideLength, y-squareSideLength, 
                            x+squareSideLength, y+squareSideLength);
    block.init();
    blocks.push(block);
    window.requestAnimationFrame(render);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    for (var i=0; i<blocks.length; i++) {
        blocks[i].draw();
    }

    // window.requestAnimFrame(render);
}
