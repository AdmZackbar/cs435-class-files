/*
 * File:    texmap.js
 * Author:  Zach Wassynger
 * Purpose: Part of project 5 in CS 435. Creates a room with a table and TV
 *          that displays a series of frames. The TV can be turned on and off,
 *          and the frames can be paused and resumed.
 * Input:   Use the left/right arrows(or buttons) to change the current
 *          frame.
 *          Use the spacebar(or button) to pause and resume the gif.
 *          Use e(or button) to power on and off the TV.
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

var eye = vec3(0.2, 0.4, 1.0);
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var theta = 0;
var phi = 0;

var woodImage, carpetImage, wallpaperImage, plasticImage;
var woodTexture, carpetTexture, wallpaperTexture, plasticTexture;

var frames = [];
var frameIndex = 0;
var NUM_FRAMES = 7;

var tvOn = true;

var isPaused = false;
var FRAMES_PER_SECOND = 1.0;

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

var FLOOR_WIDTH = 12.0, FLOOR_HEIGHT = 0.2;
var WALL_WIDTH = 1.0, WALL_HEIGHT = 5.0, WALL_LENGTH = 12.0;
var TABLE_WIDTH = 4.0, TABLE_HEIGHT = 0.5;
var TABLE_LEG_WIDTH = 0.5, TABLE_LEG_HEIGHT = 2.0;
var TV_WIDTH = 3.5, TV_HEIGHT = 2.0, TV_LENGTH = 3.0;

function configureTexture(image) {
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

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
    
    gl.enable(gl.DEPTH_TEST);

    createCube();

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

    woodImage = document.getElementById("woodImage");
    carpetImage = document.getElementById("carpetImage");
    wallpaperImage = document.getElementById("wallpaperImage");
    plasticImage = document.getElementById("plasticImage");

    for(var i=0; i<NUM_FRAMES; i++)
    {
        frames[i] = document.getElementById("frame".concat(i+1))
    }

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    textureLoc = gl.getUniformLocation(program, "texture");
    
    document.getElementById("ButtonBack").onclick = prev;
    document.getElementById("ButtonNext").onclick = next;
    document.getElementById("ButtonPower").onclick = power;
    document.getElementById("ButtonPause").onclick = pause;

    document.addEventListener("keydown", function(event)
    {
        if (event.keyCode == 37 || event.keyCode == 65)    // left, a
            prev();
        if (event.keyCode == 39 || event.keyCode == 68)    // right, d
            next();
        if (event.keycode == 32)    // space
            pause();
        if (event.keycode == 69)    // e
            power();
        if (event.keyCode == 74)    // j
        {
            theta -= 5;
        }
        if (event.keyCode == 76)    // l
        {
            theta += 5;
        }
        if (event.keyCode == 73)    // i
        {
            phi -= 5;
        }
        if (event.keyCode == 75)    // k
        {
            phi += 5;
        }
    })

    projectionMatrix = ortho(-8, 8, -8, 8, -8, 8);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    intervalID = setInterval(updateFrame, 1000.0 / FRAMES_PER_SECOND);

    render();
}

function prev()
{
    decrementFrame();
}

function next()
{
    updateFrame();
}

function pause()
{
    if (isPaused)
    {
        document.getElementById("ButtonPause").textContent = "Pause";
        intervalID = setInterval(updateFrame, 1000.0 / FRAMES_PER_SECOND);
        isPaused = false;
    }
    else
    {
        document.getElementById("ButtonPause").textContent = "Resume";
        clearInterval(intervalID);
        isPaused = true;
    }
}

function power()
{
    if (tvOn)
    {
        document.getElementById("ButtonPower").textContent = "Turn on";
        tvOn = false;
    }
    else
    {
        document.getElementById("ButtonPower").textContent = "Turn off";
        tvOn = true;
    }
}

function floor()
{
    var s = scale4(FLOOR_WIDTH, FLOOR_HEIGHT, FLOOR_WIDTH);
    var instanceMatrix = mult(translate(0.0, 0.5 * FLOOR_HEIGHT, 0.0), s);
    var t = mult(modelViewMatrix, instanceMatrix);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(t));
    configureTexture(carpetImage);
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

function walls()
{
    configureTexture(wallpaperImage);
    
    var instanceMatrix = mult(modelViewMatrix, translate(WALL_WIDTH/2-FLOOR_WIDTH/2, 0, 0));
    wall(instanceMatrix);

    instanceMatrix = mult(modelViewMatrix, translate(FLOOR_WIDTH/2-WALL_WIDTH/2, 0, 0));
    wall(instanceMatrix);

    instanceMatrix = mult(modelViewMatrix, translate(0, 0, WALL_WIDTH/2-FLOOR_WIDTH/2));
    instanceMatrix = mult(instanceMatrix, rotate(90, 0, 1, 0));
    wall(instanceMatrix);
}

function wall(mvm)
{
    var s = scale4(WALL_WIDTH, WALL_HEIGHT, WALL_LENGTH);
    var instanceMatrix = mult(translate(0.0, 0.5 * WALL_HEIGHT, 0.0), s);
    var t = mult(mvm, instanceMatrix);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(t));
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

function table()
{
    configureTexture(woodImage);

    legs();

    modelViewMatrix = mult(modelViewMatrix, translate(0, TABLE_LEG_HEIGHT, 0))
    tabletop();
}

function legs()
{
    var instanceMatrix = mult(modelViewMatrix, translate(TABLE_LEG_WIDTH/2-TABLE_WIDTH/2, 0, TABLE_LEG_WIDTH/2-TABLE_WIDTH/2));
    leg(instanceMatrix);

    instanceMatrix = mult(modelViewMatrix, translate(TABLE_WIDTH/2-TABLE_LEG_WIDTH/2, 0, TABLE_LEG_WIDTH/2-TABLE_WIDTH/2));
    leg(instanceMatrix);
    
    instanceMatrix = mult(modelViewMatrix, translate(TABLE_LEG_WIDTH/2-TABLE_WIDTH/2, 0, TABLE_WIDTH/2-TABLE_LEG_WIDTH/2));
    leg(instanceMatrix);

    instanceMatrix = mult(modelViewMatrix, translate(TABLE_WIDTH/2-TABLE_LEG_WIDTH/2, 0, TABLE_WIDTH/2-TABLE_LEG_WIDTH/2));
    leg(instanceMatrix);
}

function leg(mvm)
{
    var s = scale4(TABLE_LEG_WIDTH, TABLE_LEG_HEIGHT, TABLE_LEG_WIDTH);
    var instanceMatrix = mult(translate(0.0, 0.5 * TABLE_LEG_HEIGHT, 0.0), s);
    var t = mult(mvm, instanceMatrix);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(t));
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

function tabletop()
{
    var s = scale4(TABLE_WIDTH, TABLE_HEIGHT, TABLE_WIDTH);
    var instanceMatrix = mult(translate(0.0, 0.5 * TABLE_HEIGHT, 0.0), s);
    var t = mult(modelViewMatrix, instanceMatrix);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(t));
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

function tv()
{
    configureTexture(plasticImage);
    var s = scale4(TV_WIDTH, TV_HEIGHT, TV_LENGTH);
    var instanceMatrix = mult(translate(0.0, 0.5 * TV_HEIGHT, 0.0), s);
    var t = mult(modelViewMatrix, instanceMatrix);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(t));
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    if (tvOn)
        tvScreen(t);
}

function tvScreen(mvm)
{
    configureTexture(frames[frameIndex]);   // Configure TV graphic
    mvm = mult(mvm, translate(0.0, 0.0, 0.01));     // Bring screen forward
    mvm = mult(mvm, rotate(180, 0.0, 0.0, 1.0));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mvm));
    gl.drawArrays(gl.TRIANGLES, 0, 6);          // Draw ONLY the front face
}

function updateFrame()
{
    frameIndex++;
    if (frameIndex >= NUM_FRAMES) frameIndex = 0;
}

function decrementFrame()
{
    frameIndex--;
    if (frameIndex < 0) frameIndex = (NUM_FRAMES-1);
}

var render = function(){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    modelViewMatrix = lookAt(eye, at, up);
    modelViewMatrix = mult(modelViewMatrix, rotate(theta, 0, 1, 0));
    modelViewMatrix = mult(modelViewMatrix, rotate(phi, 1, 0, 0));

    modelViewMatrix = mult(modelViewMatrix, translate(0, -3, 0))
    floor();

    modelViewMatrix = mult(modelViewMatrix, translate(0, FLOOR_HEIGHT/2, 0));
    walls();

    table();

    modelViewMatrix = mult(modelViewMatrix, translate(0, TABLE_HEIGHT/2, 0));
    tv();

    requestAnimationFrame(render);
}
