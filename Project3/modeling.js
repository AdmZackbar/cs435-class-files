/*
 * File:    modeling.js
 * Author:  Zach Wassynger
 * Purpose: Part of project 3 in CS 435. Creates a 3D text displayer in which a string of words
 *          is displayed at a given rate. The display can be manipulated in space.
 */

var numCubeVertices = 36; //(6 faces)(2 triangles/face)(3 vertices/triangle)
var numCylinderSideVertices = 42;   // (21 outside circle points/circle)(2 circles)
var numCylinderTopVertices = 22;    // (20 outside vertices + center + duplicate)
var numCylinderTopVertices = 22;    // (20 outside vertices + center + duplicate)

var cubePoints = [], cubeColors = [];
var cylinderTopPoints = [], cylinderBottomPoints = [], cylinderSidePoints = [];
var cylinderTopColors = [], cylinderBottomColors = [], cylinderSideColors = [];

var words, word;
var wordLetters = [12];

var vertices = [
    vec4( -0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5,  0.5,  0.5, 1.0 ),
    vec4(  0.5,  0.5,  0.5, 1.0 ),
    vec4(  0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5, -0.5, -0.5, 1.0 ),
    vec4( -0.5,  0.5, -0.5, 1.0 ),
    vec4(  0.5,  0.5, -0.5, 1.0 ),
    vec4(  0.5, -0.5, -0.5, 1.0 )
];

// RGBA cubeColors
var vertexColors = [
    vec4( 0.0, 0.0, 0.0, 1.0 ),  // black
    vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
    vec4( 0.0, 1.0, 0.0, 1.0 ),  // green
    vec4( 1.0, 1.0, 0.0, 1.0 ),  // yellow
    vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
    vec4( 1.0, 0.0, 1.0, 1.0 ),  // magenta
    vec4( 0.6, 0.7, 1.0, 1.0 ),  // light blue
    vec4( 0.0, 1.0, 1.0, 1.0 )   // cyan
];

var letters = {
    "a": [
		[0, 1, 1, 0],
		[1, 0, 0, 1],
		[1, 1, 1, 1],
		[1, 0, 0, 1],
		[1, 0, 0, 1]
	],
	"b": [
		[1, 1, 1, 0],
		[1, 0, 0, 1],
		[1, 1, 1, 0],
		[1, 0, 0, 1],
		[1, 1, 1, 0]
	],
	"c": [
		[1, 1, 1, 1],
		[1, 0, 0, 1],
		[1, 0, 0, 0],
		[1, 0, 0, 1],
		[1, 1, 1, 1]
	],
	"d": [
		[1, 1, 1, 0],
		[1, 0, 0, 1],
		[1, 0, 0, 1],
		[1, 0, 0, 1],
		[1, 1, 1, 0]
	],
	"e": [
		[1, 1, 1],
		[1, 0, 0],
		[1, 1, 1],
		[1, 0, 0],
		[1, 1, 1]
	],
	"f": [
		[1, 1, 1],
		[1, 0, 0],
		[1, 1, 1],
		[1, 0, 0],
		[1, 0, 0]
	],
	"g": [
		[1, 1, 1, 1],
		[1, 0, 0, 0],
		[1, 0, 1, 1],
		[1, 0, 0, 1],
		[1, 1, 1, 1]
	],
	"h": [
		[1, 0, 0, 1],
		[1, 0, 0, 1],
		[1, 1, 1, 1],
		[1, 0, 0, 1],
		[1, 0, 0, 1]
	],
	"i": [
		[1],
		[1],
		[1],
		[1],
		[1]
	],
	"j": [
		[0, 1, 1],
		[0, 0, 1],
		[0, 0, 1],
		[1, 0, 1],
		[1, 1, 1]
	],
	"k": [
		[1, 0, 0, 1],
		[1, 0, 1, 0],
		[1, 1, 0, 0],
		[1, 0, 1, 0],
		[1, 0, 0, 1]
	],
	"l": [
		[1, 0, 0],
		[1, 0, 0],
		[1, 0, 0],
		[1, 0, 0],
		[1, 1, 1]
	],
	"m": [
		[1, 0, 0, 0, 1],
		[1, 1, 0, 1, 1],
		[1, 0, 1, 0, 1],
		[1, 0, 0, 0, 1],
		[1, 0, 0, 0, 1]
	],
	"n": [
		[1, 0, 0, 1],
		[1, 1, 0, 1],
		[1, 0, 1, 1],
		[1, 0, 0, 1],
		[1, 0, 0, 1]
	],
	"o": [
		[1, 1, 1, 1],
		[1, 0, 0, 1],
		[1, 0, 0, 1],
		[1, 0, 0, 1],
		[1, 1, 1, 1]
	],
	"p": [
		[1, 1, 1],
		[1, 0, 1],
		[1, 1, 1],
		[1, 0, 0],
		[1, 0, 0]
	],
	"q": [
		[1, 1, 1],
		[1, 0, 1],
		[1, 1, 1],
		[0, 0, 1],
		[0, 0, 1]
	],
	"r": [
		[1, 1, 1, 0],
		[1, 0, 0, 1],
		[1, 0, 0, 1],
		[1, 1, 1, 0],
		[1, 0, 0, 1]
	],
	"s": [
		[1, 1, 1, 1],
		[1, 0, 0, 0],
		[1, 1, 1, 1],
		[0, 0, 0, 1],
		[1, 1, 1, 1]
	],
	"t": [
		[1, 1, 1, 1, 1],
		[0, 0, 1, 0, 0],
		[0, 0, 1, 0, 0],
		[0, 0, 1, 0, 0],
		[0, 0, 1, 0, 0]
	],
	"u": [
		[1, 0, 0, 1],
		[1, 0, 0, 1],
		[1, 0, 0, 1],
		[1, 0, 0, 1],
		[1, 1, 1, 1]
	],
	"v": [
		[1, 0, 0, 0, 1],
		[1, 0, 0, 0, 1],
		[1, 0, 0, 0, 1],
		[0, 1, 0, 1, 0],
		[0, 0, 1, 0, 0]
	],
	"w": [
        [1, 0, 0, 0, 1],
		[1, 0, 0, 0, 1],
		[1, 0, 1, 0, 1],
		[1, 1, 0, 1, 1],
		[1, 0, 0, 0, 1]
	],
	"x": [
		[1, 0, 0, 0, 1],
		[0, 1, 0, 1, 0],
		[0, 0, 1, 0, 0],
		[0, 1, 0, 1, 0],
		[1, 0, 0, 0, 1]
	],
	"y": [
		[1, 0, 0, 0, 1],
		[0, 1, 0, 1, 0],
		[0, 0, 1, 0, 0],
		[0, 0, 1, 0, 0],
		[0, 0, 1, 0, 0]
	],
	"z": [
		[1, 1, 1, 1],
		[0, 0, 1, 0],
		[0, 1, 0, 0],
		[1, 0, 0, 0],
		[1, 1, 1, 1]
    ],
    "0": [
        [1, 1, 1, 1],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
        [1, 1, 1, 1]
    ],
    "1": [
        [1, 1, 0],
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 0],
        [1, 1, 1]
    ],
    "2": [
        [1, 1, 1, 1],
        [1, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 1, 0, 1],
        [1, 1, 1, 1]
    ],
    "3": [
        [1, 1, 1],
        [0, 0, 1],
        [0, 1, 1],
        [0, 0, 1],
        [1, 1, 1]
    ],
    "4": [
        [1, 0, 1],
        [1, 0, 1],
        [1, 1, 1],
        [0, 0, 1],
        [0, 0, 1]
    ],
    "5": [
        [1, 1, 1],
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 1],
        [1, 1, 1]
    ],
    "6": [
        [1, 1, 1],
        [1, 0, 0],
        [1, 1, 1],
        [1, 0, 1],
        [1, 1, 1]
    ],
    "7": [
        [1, 1, 1],
        [0, 0, 1],
        [0, 0, 1],
        [0, 0, 1],
        [0, 0, 1]
    ],
    "8": [
        [1, 1, 1],
        [1, 0, 1],
        [1, 1, 1],
        [1, 0, 1],
        [1, 1, 1]
    ],
    "9": [
        [1, 1, 1],
        [1, 0, 1],
        [1, 1, 1],
        [0, 0, 1],
        [1, 1, 1]
    ]
}

// Size of the base, cylinder, and display
var BASE_HEIGHT         = 1.0;
var BASE_WIDTH          = 14;
var LOWER_ARM_HEIGHT    = 4;
var LOWER_ARM_WIDTH     = 1;
var DISPLAY_HEIGHT      = 0.7;
var DISPLAY_WIDTH       = 13;
var NUM_SEGMENTS        = 20;

// Size of the characters
var CHAR_HEIGHT = 1;
var CHAR_DEPTH = 0.5
var DOT_SUBDIVISION = 5;

var CONNECTOR_HEIGHT    = 1;
var CONNECTOR_RADIUS    = 0.5;
var DOT_HEIGHT          = 0.5;
var DOT_RADIUS          = CHAR_HEIGHT/DOT_SUBDIVISION/2;

var MAX_WORD_LENGTH = 12;   // Max number of characters per word
var WORD_DELAY = 1000;  // Milliseconds per word

// Shader transformation matrices
var modelViewMatrix, projectionMatrix;

// Array of rotation angles (in degrees) for each rotation axis
var baseTheta = 45;
var offsetAngle = 0;
var cylinderTheta = 15;
var displayTheta = 0;

var paused = false;

var modelViewMatrixLoc;

var cubeVBuffer, cubeCBuffer;
var cylinderVBuffer, cylinderCBuffer;

function quad(  a,  b,  c,  d ) {
    cubeColors.push(vertexColors[a]); 
    cubePoints.push(vertices[a]); 
    cubeColors.push(vertexColors[a]); 
    cubePoints.push(vertices[b]); 
    cubeColors.push(vertexColors[a]); 
    cubePoints.push(vertices[c]);
    cubeColors.push(vertexColors[a]); 
    cubePoints.push(vertices[a]); 
    cubeColors.push(vertexColors[a]); 
    cubePoints.push(vertices[c]); 
    cubeColors.push(vertexColors[a]); 
    cubePoints.push(vertices[d]); 
}

function colorCube() {
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}

function colorCylinder()
{
    var theta = 2 * Math.PI / NUM_SEGMENTS;

    cylinderBottomPoints.push(vec4(0.0, 0.0, 0.0, 1.0));
    cylinderBottomColors.push(vertexColors[2]);
    cylinderTopPoints.push(vec4(0.0, 1, 0.0, 1.0));
    cylinderTopColors.push(vertexColors[1]);

    for (var i = 0; i < NUM_SEGMENTS; i++)
    {
        var x = Math.cos(theta * i), z = Math.sin(theta * i);

        cylinderBottomPoints.push(vec4(x, 0.0, z, 1.0));
        cylinderBottomColors.push(vertexColors[2]);
        cylinderTopPoints.push(vec4(x, 1, z, 1.0));
        cylinderTopColors.push(vertexColors[1]);
        cylinderSidePoints.push(vec4(x, 0.0, z, 1.0));
        cylinderSidePoints.push(vec4(x, 1, z, 1.0));
        cylinderSideColors.push(vertexColors[6]);
        cylinderSideColors.push(vertexColors[6]);
    }

    cylinderBottomPoints.push(vec4(1, 1, 0.0, 1.0));
    cylinderBottomColors.push(vertexColors[2]);
    cylinderTopPoints.push(vec4(1, 1, 0.0, 1.0));
}

function scale4(a, b, c) {
   var result = mat4();
   result[0][0] = a;
   result[1][1] = b;
   result[2][2] = c;
   return result;
}

window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    var paragraph = document.getElementById("paragraph").textContent;
    words = paragraph.split(" ").reverse();

    document.addEventListener("keydown", function(event)
    {
        if (event.keyCode == 37)    // left
            onLeftKey();
        if (event.keyCode == 39)    // right
            onRightKey();
        if (event.keyCode == 38)    // up
            onUpKey();
        if (event.keyCode == 40)    // down
            onDownKey();
        if (event.keyCode == 32)    // spacebar
            onSpacebar();
    })
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    gl.enable( gl.DEPTH_TEST ); 
    
    // Load shaders and initialize attribute buffers
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    
    gl.useProgram( program );

    colorCube();
    colorCylinder();

    // Create and initialize cube buffer objects
    cubeVBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cubeVBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(cubePoints), gl.STATIC_DRAW );
    
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    cubeCBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cubeCBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(cubeColors), gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    document.getElementById("ButtonUp").onclick = onUpKey;
    document.getElementById("ButtonDown").onclick = onDownKey;
    document.getElementById("ButtonLeft").onclick = onLeftKey;
    document.getElementById("ButtonRight").onclick = onRightKey;
    
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");

    projectionMatrix = ortho(-10, 10, -10, 10, -10, 10);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(projectionMatrix));

    if (words.length > 0)
        word = words[words.length-1].toLowerCase().replace(/[^a-z0-9]/g, "");
    else
        word = "";

    setInterval(function() {changeWord();}, WORD_DELAY);

    render();
}

function onUpKey()
{
    displayTheta -= 5;
}

function onDownKey()
{
    displayTheta += 5;
}

function onLeftKey()
{
    cylinderTheta -= 5;
}

function onRightKey()
{
    cylinderTheta += 5;
}

function onSpacebar()
{
    if (paused)
        paused = false;
    else
        paused = true;
}

function changeWord()
{
    if (words.length > 0 && !paused)
        word = words.pop().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function base() {
    var s = scale4(BASE_WIDTH, BASE_HEIGHT, BASE_WIDTH);
    var instanceMatrix = mult( translate( 0.0, 0.5 * BASE_HEIGHT, 0.0 ), s);
    var t = mult(modelViewMatrix, instanceMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(t) );
    gl.drawArrays( gl.TRIANGLES, 0, numCubeVertices );
}

// TODO CHANGE TO CYLINDER
function lowerArm()
{
    var s = scale4(LOWER_ARM_WIDTH, LOWER_ARM_HEIGHT, LOWER_ARM_WIDTH);
    var instanceMatrix = mult( translate( 0.0, 0.5 * LOWER_ARM_HEIGHT, 0.0 ), s);
    var t = mult(modelViewMatrix, instanceMatrix);
    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(t) );
    gl.drawArrays( gl.TRIANGLES, 0, numCubeVertices );
}

function display()
{
    var s = scale4(DISPLAY_WIDTH, DISPLAY_HEIGHT, DISPLAY_WIDTH/2);
    var instanceMatrix = mult( translate( 0.0, 0.5 * DISPLAY_HEIGHT, 0.0 ), s);
    var t = mult(modelViewMatrix, instanceMatrix);
    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(t) );
    gl.drawArrays( gl.TRIANGLES, 0, numCubeVertices );
}

function text()
{
    for (var i = 0; i < word.length && i < MAX_WORD_LENGTH; i++)
    {
        modelViewMatrix = mult(modelViewMatrix, translate(CHAR_HEIGHT, 0, 0.0));
        character(word.charAt(i));
    }
}

function character(char)
{
    var charArray = letters[char];
    var rowMVM = mult(modelViewMatrix, translate(0, 0, -CHAR_HEIGHT/3));
    for (var i = 0; i < charArray.length; i++)  // Per row
    {
        rowMVM = mult(rowMVM, translate(0, 0, CHAR_HEIGHT/6));
        var columnMVM = mult(rowMVM, translate(-CHAR_HEIGHT/3, 0, 0));
        for (var j = 0; j < charArray[i].length; j++)   // Per column
        {
            columnMVM = mult(columnMVM, translate(CHAR_HEIGHT/6, 0, 0.0));
            if (charArray[i][j])
                charDot(columnMVM);
        }
    }
}

function charDot(localMVM)
{
    var s = scale4(CHAR_HEIGHT/DOT_SUBDIVISION, CHAR_DEPTH, CHAR_HEIGHT/DOT_SUBDIVISION);
    var instanceMatrix = mult( translate( 0.0, 0.5 * CHAR_HEIGHT/DOT_SUBDIVISION, 0.0 ), s);
    var t = mult(localMVM, instanceMatrix);
    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(t) );
    gl.drawArrays( gl.TRIANGLES, 0, numCubeVertices );
}

var render = function()
{
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    modelViewMatrix = rotate(offsetAngle, 0, 1, 0);
    modelViewMatrix = mult(modelViewMatrix, rotate(baseTheta, 1, 0, 0));
    base();
 
    modelViewMatrix = mult(modelViewMatrix, translate(0.0, BASE_HEIGHT, 0.0)); 
    modelViewMatrix = mult(modelViewMatrix, rotate(cylinderTheta, 0, 1, 0));
    lowerArm();

    modelViewMatrix = mult(modelViewMatrix, translate(0.0, LOWER_ARM_HEIGHT, 0.0));
    modelViewMatrix = mult(modelViewMatrix, rotate(displayTheta, 1, 0, 0));
    display();

    modelViewMatrix = mult(modelViewMatrix, translate(-DISPLAY_WIDTH/2, DISPLAY_HEIGHT, 0.0));
    text();

    requestAnimFrame(render);
}
