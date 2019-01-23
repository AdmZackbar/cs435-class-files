/*
 * File: snowflake.js
 * Author: Zach Wassynger
 * Class: CS 435
 * Purpose: Part of Project #1. Contains the program for generating a Koch snowflake.
 */

var canvas;
var gl;

// Holds all the points defining the snowflake
var points = [];

// Defines the vertices of the starting triangle
var vertices = [
    vec2(-0.9, -0.45),
    vec2(0, 1),
    vec2(0.9, -0.45)
];

// Defines the number of times to recurse through the algorithm
var numIter = 5;

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    // Create the edges in a counter-clockwise direction
    var edges = [
        [vertices[2], vertices[1]],
        [vertices[1], vertices[0]],
        [vertices[0], vertices[2]]
    ]
    
    for(var i = 0; i < edges.length; i++)
    {
        generateTriangle(edges[i][0], edges[i][1], numIter);
    }
    
    //  Configure WebGL
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    //  Load shaders and initialize attribute buffers
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Load the data into the GPU
    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    // Associate out shader variables with our data buffer
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    render();
};

function generateTriangle(vertexOne, vertexTwo, iterLeft)
{
    if (iterLeft === 0) // Base case: add the given points to the array
    {
        points.push(vertexOne, vertexTwo);
    }
    else
    {
        var newVertexOne = divide(add(multiply(vertexOne, 2), vertexTwo), 3);
        var newVertexThree = divide(add(multiply(vertexTwo, 2), vertexOne), 3);
        var midpoint = divide(add(vertexOne, vertexTwo), 2);
        
        var V1 = divide(minus(midpoint, vertexOne), length(midpoint, vertexOne));
        var V2 = [V1[1], -V1[0]];

        var newVertexTwo = add(multiply(V2, Math.sqrt(3)/6 * length(vertexTwo, vertexOne)), midpoint);

        generateTriangle(vertexOne, newVertexOne, iterLeft-1);
        generateTriangle(newVertexOne, newVertexTwo, iterLeft-1);
        generateTriangle(newVertexTwo, newVertexThree, iterLeft-1);
        generateTriangle(newVertexThree, vertexTwo, iterLeft-1);
    }
}

function multiply(v, num){
    return [v[0]*num, v[1]*num];
};

function divide(v, num){
    return [v[0]/num, v[1]/num];
};
 
function add(a, b){
    return [a[0]+b[0], a[1]+b[1]];
};

function minus(a, b){
    return [a[0]-b[0], a[1]-b[1]];
};

function length(a, b){
    return Math.sqrt(Math.pow(a[0] - b[0],2) + Math.pow(a[1] - b[1],2));
};

function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.LINES, 0, points.length );
}
