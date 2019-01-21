/*
 * File: snowflake.js
 * Author: Zach Wassynger
 * Class: CS 435
 * Purpose: Part of Project #1. Contains the program for generating a Koch snowflake.
 */

var canvas;
var gl;

var points = []; // Holds all the points defining the snowflake

var vertices = [
    vec2(-0.9, -0.45), // Defines the verticies of the starting triangle
    vec2(0, 1),
    vec2(0.9, -0.45)
];

var numIter = 5; // Defines the number of times to recurse through the algorithm

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    var edges = [
        [vertices[2], vertices[1]],
        [vertices[1], vertices[0]],
        [vertices[0], vertices[2]]
    ]
    
    for(var i = 0; i < edges.length; i++)
    {
        generateTriangle(edges[i][0], edges[i][1], numIter);
    }
    
    //
    //  Configure WebGL
    //
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

function generateTriangle(A, B, iterLeft)
{
    if (iterLeft === 0)
    {
        points.push(A, B);
    }
    else
    {
        var C = divide(add(multiply(A, 2), B), 3);
        var D = divide(add(multiply(B, 2), A), 3);
        var F = divide(add(A, B), 2);
        
        var V1 = divide(minus(F, A), length(F, A));
        var V2 = [V1[1], -V1[0]];

        var E = add(multiply(V2, Math.sqrt(3)/6 * length(B, A)), F);

        generateTriangle(A, C, iterLeft-1);
        generateTriangle(C, E, iterLeft-1);
        generateTriangle(E, D, iterLeft-1);
        generateTriangle(D, B, iterLeft-1);
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
