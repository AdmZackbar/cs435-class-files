/*
 * File:    blending.js
 * Author:  Zach Wassynger
 * Purpose: Part of project 6 in CS 435. Creates a room with 3 walls and a floor. One of the walls
 *          has a window, which faces a landscape. The viewer can move around the back of the room
 *          to see different parts of the landscape through the window.
 * Input:   Use the WASD or arrow keys(or buttons) to manipulate the
 *          location of the viewer.
 *          Use the IJKL keyset to manipulate the rotation of the room.
 */

var canvas;
var gl;

var numVertices = 36;

var program;

var pointsArray = [];
var colorsArray = [];
var texCoordsArray = [];

var modelViewMatrixLoc;
var projectionMatrixLoc;
var textureLoc;

var eye = vec3(0.0, 0.8, 8.0);
var at = vec3(0.0, 0.0, 0.0);
var UP = vec3(0.0, 1.0, 0.0);

var fovy = 90.0;
var near = -8.0;
var far = 8.0;
var aspect;

// How much the camera shifts on command
var CAM_DELTA = 0.1;

// Determine orientation of room
var theta = 0;
var phi = 0;

// Contains the links to the loaded images
var carpetImage, wallpaperImage, windowImage, landscapeImage;

// Holds the ID of the interval that changes the frame
var intervalID;

var texCoord = [
    vec2(0, 0),
    vec2(0, 1),
    vec2(1, 1),
    vec2(1, 0)
];

var vertices = [
    vec4(-0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, 0.5, 0.5, 1.0),
    vec4(0.5, 0.5, 0.5, 1.0),
    vec4(0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, -0.5, -0.5, 1.0),
    vec4(-0.5, 0.5, -0.5, 1.0),
    vec4(0.5, 0.5, -0.5, 1.0),
    vec4(0.5, -0.5, -0.5, 1.0)
];

var WHITE = vec4(1.0, 1.0, 1.0, 1.0);

var FLOOR_WIDTH = 16.0, FLOOR_HEIGHT = 0.2;
var WALL_WIDTH = 1.0, WALL_HEIGHT = 10.0, WALL_LENGTH = FLOOR_WIDTH;
var WINDOW_WIDTH = WALL_LENGTH/2, WINDOW_HEIGHT = WALL_HEIGHT/2;
var BACKGROUND_DIST = 12.0, BACKGROUND_HEIGHT = 1.0, BACKGROUND_WIDTH = 14.0, BACKGROUND_HEIGHT = 9.0, BACKGROUND_DEPTH = 1.0;

function isPowerOf2(value)
{
    return (value & (value - 1)) == 0;
}

function configureTexture(image) {
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    if (isPowerOf2(image.width) && isPowerOf2(image.height))
        gl.generateMipmap(gl.TEXTURE_2D);
    else
    {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.uniform1i(textureLoc, texture);
}

function scale4(a, b, c) {
    var result = mat4();
    result[0][0] = a;
    result[1][1] = b;
    result[2][2] = c;
    return result;
 }

function quad(a, b, c, d) {
    pointsArray.push(vertices[a]); 
    colorsArray.push(WHITE);
    texCoordsArray.push(texCoord[0]);

    pointsArray.push(vertices[b]); 
    colorsArray.push(WHITE);
    texCoordsArray.push(texCoord[1]); 

    pointsArray.push(vertices[c]); 
    colorsArray.push(WHITE);
    texCoordsArray.push(texCoord[2]); 

    pointsArray.push(vertices[a]); 
    colorsArray.push(WHITE);
    texCoordsArray.push(texCoord[0]); 

    pointsArray.push(vertices[c]); 
    colorsArray.push(WHITE);
    texCoordsArray.push(texCoord[2]); 

    pointsArray.push(vertices[d]); 
    colorsArray.push(WHITE);
    texCoordsArray.push(texCoord[3]);   
}

function createCube()
{
    quad(1, 0, 3, 2);
    quad(2, 3, 7, 6);
    quad(3, 0, 4, 7);
    quad(6, 5, 1, 2);
    quad(4, 5, 6, 7);
    quad(5, 4, 0, 1);
}


window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    
    //gl.enable(gl.DEPTH_TEST);
    //gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    createCube();
    
    aspect = canvas.width/canvas.height;

    // Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW);
    
    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);
    
    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    carpetImage = document.getElementById("carpetImage");
    wallpaperImage = document.getElementById("wallpaperImage");
    windowImage = document.getElementById("windowImage");
    landscapeImage = document.getElementById("landscapeImage");

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    textureLoc = gl.getUniformLocation(program, "texture");
    
    document.getElementById("ButtonLeft").onclick = left;
    document.getElementById("ButtonRight").onclick = right;
    document.getElementById("ButtonUp").onclick = up;
    document.getElementById("ButtonDown").onclick = down;

    document.addEventListener("keydown", function(event)
    {
        switch(event.keyCode)
        {
            case 37:    // left
            case 65:    // a
                left();
                return;
            case 39:    // right
            case 68:    // d
                right();
                return;
            case 38:    // up
            case 87:    // w
                up();
                return;
            case 40:    // down
            case 83:    // s
                down();
                return;
            case 74:    // j
                theta -= 5;
                break;
            case 76:    // l
                theta += 5;
                break;
            case 73:    // i
                phi -= 5;
                break;
            case 75:    // k
                phi += 5;
                break;
            default:
                break;
        }
        render();
    })

    projectionMatrix = perspective(fovy, aspect, near, far);
    //projectionMatrix = ortho(-10, 10, -10, 10, -20, 20);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    render();
}

function left()
{
    eye[0] -= CAM_DELTA;
    if (eye[0] < -FLOOR_WIDTH/2+0.05)
        eye[0] = -FLOOR_WIDTH/2+0.05;
    render();
}
function right()
{
    eye[0] += CAM_DELTA;
    if (eye[0] > FLOOR_WIDTH/2-0.05)
        eye[0] = FLOOR_WIDTH/2-0.05;
    render();
}

function up()
{
    eye[1] += CAM_DELTA;
    if (eye[1] > WALL_HEIGHT/2+2.1)
        eye[1] = WALL_HEIGHT/2+2.1;
    render();
}
function down()
{
    eye[1] -= CAM_DELTA;
    if (eye[1] < -2.5)
        eye[1] = -2.5;
    render();
}

function floor(matrix)
{
    var s = scale4(FLOOR_WIDTH, FLOOR_HEIGHT, FLOOR_WIDTH);
    var instanceMatrix = mult(translate(0.0, 0.5 * FLOOR_HEIGHT, 0.0), s);
    var t = mult(matrix, instanceMatrix);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(t));
    configureTexture(carpetImage);
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

function walls(matrix)
{
    configureTexture(wallpaperImage);
    
    var instanceMatrix = mult(matrix, translate(-FLOOR_WIDTH/2-WALL_WIDTH/2, 0, 0));
    wall(instanceMatrix);

    instanceMatrix = mult(matrix, translate(FLOOR_WIDTH/2-WALL_WIDTH/2, 0, 0));
    wall(instanceMatrix);

    configureTexture(windowImage);
    instanceMatrix = mult(matrix, translate(0, 0, WALL_WIDTH/2-FLOOR_WIDTH/2));
    instanceMatrix = mult(instanceMatrix, rotate(90, 0, 1, 0));
    wall(instanceMatrix);
    //instanceMatrix = mult(instanceMatrix, translate(0, (WALL_HEIGHT - WINDOW_HEIGHT)/2, 0));
    //wallWindow(instanceMatrix);
}

function wall(mvm)
{
    var s = scale4(WALL_WIDTH, WALL_HEIGHT, WALL_LENGTH);
    var instanceMatrix = mult(translate(0.0, 0.5 * WALL_HEIGHT, 0.0), s);
    var t = mult(mvm, instanceMatrix);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(t));
    gl.drawArrays(gl.TRIANGLES, 6, 6);
}

function wallWindow(mvm)
{
    configureTexture(windowImage);

    var s = scale4(1, WINDOW_HEIGHT, WINDOW_WIDTH);
    var instanceMatrix = mult(translate(0.0, 0.5 * WINDOW_HEIGHT, 0.0), s);
    var t = mult(mvm, instanceMatrix);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(t));
    gl.drawArrays(gl.TRIANGLES, 6, 6);
}

function background(matrix)
{
    configureTexture(landscapeImage);
    var s = scale4(BACKGROUND_WIDTH, BACKGROUND_HEIGHT, BACKGROUND_DEPTH);
    var instanceMatrix = mult(translate(0.0, 0.5 * BACKGROUND_HEIGHT, 0.0), s);
    var t = mult(matrix, instanceMatrix);
    t = mult(t, rotate(180, 0, 0, 1));

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(t));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

var render = function(){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    modelViewMatrix = lookAt(eye, at, UP);
    modelViewMatrix = mult(modelViewMatrix, rotate(theta, 0, 1, 0));
    modelViewMatrix = mult(modelViewMatrix, rotate(phi, 1, 0, 0));

    var floorMatrix = mult(modelViewMatrix, translate(0, -3, 0))
    //floor();

    var wallMatrix = mult(floorMatrix, translate(0, FLOOR_HEIGHT/2, 0));
    //walls();

    var backgroundMatrix = mult(wallMatrix, translate(0, 1, -BACKGROUND_DIST));
    background(backgroundMatrix);
    walls(wallMatrix);
    floor(floorMatrix);
}
