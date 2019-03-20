/*
 * File:    spotlight.js
 * Author:  Zach Wassynger
 * Purpose: Part of project 4 in CS 435.
 * Input:   
 */

var numVertices = 6;    // Square (2 triangles per square) * (3 vertices per triangle)

var points = [], normals = [];

// Stage constants
var STAGE_WIDTH = 1, STAGE_HEIGHT = 1;

var lightPosition = vec4(0.0, 0.0, 1.0, 1.0);
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);
var lightDirection = vec3(0.0, 0.0, -1.0);
var lightAngle = 50;

delta = 0;

var materialAmbient = vec4(1.0, 0.0, 1.0, 1.0);
var materialDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4(0.1, 0.1, 0.1, 1.0);
var materialShininess = 100.0;

// Shader transformation matrices
var modelViewMatrix, projectionMatrix, normalMatrix;

var modelViewMatrixLoc, normalMatrixLoc;
var vPosition, vNormal;

var vBuffer, nBuffer;

var spotlightX = 2, spotlightY = 2;

var useVertexShading = false;

function createStage()
{
    var normal = vec3(0.0, 0.0, 1.0);
    
    points.push(vec4(-1.0, 1.0, 0.0, 1.0));
    normals.push(normal);
    points.push(vec4(-1.0, -1.0, 0.0, 1.0));
    normals.push(normal);
    points.push(vec4(1.0, -1.0, 0.0, 1.0));
    normals.push(normal);
    points.push(vec4(-1.0, 1.0, 0.0, 1.0));
    normals.push(normal);
    points.push(vec4(1.0, -1.0, 0.0, 1.0));
    normals.push(normal);
    points.push(vec4(1.0, 1.0, 0.0, 1.0));
    normals.push(normal);
}

function scale4(a, b, c) {
   var result = mat4();
   result[0][0] = a;
   result[1][1] = b;
   result[2][2] = c;
   return result;
}

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    
    gl = WebGLUtils.setupWebGL(canvas);
    if ( !gl ) { alert("WebGL isn't available"); }

    document.addEventListener("keydown", function(event)
    {
        if (event.keyCode == 37 || event.keyCode == 65)    // left, a
            onLeft();
        if (event.keyCode == 39 || event.keyCode == 68)    // right, d
            onRight();
        if (event.keyCode == 38 || event.keyCode == 87)    // up, w
            onUp();
        if (event.keyCode == 40 || event.keyCode == 83)    // down, s
            onDown();
        if (event.keyCode == 32)    // spacebar
        {
            delta += 5;
            render();
        }
    })
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST); 
    
    // Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader-f", "fragment-shader-f");
    
    gl.useProgram(program);

    createStage();

    // Create and initialize buffer objects
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");

    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);

    document.getElementById("ButtonUp").onclick = onUp;
    document.getElementById("ButtonDown").onclick = onDown;
    document.getElementById("ButtonLeft").onclick = onLeft;
    document.getElementById("ButtonRight").onclick = onRight;
    document.getElementById("ButtonVertex").onclick = onVertex;
    document.getElementById("ButtonFrag").onclick = onFragment;

    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform3fv(gl.getUniformLocation(program, "lightDirection"), flatten(lightDirection));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);
    gl.uniform1f(gl.getUniformLocation(program, "lightAngle"), lightAngle);

    projectionMatrix = ortho(-1.5, 1.5, -1.5, 1.5, -1.5, 1.5);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(projectionMatrix));

    render();
}

function onUp()
{
    if (spotlightY >= 4)
        spotlightY = 4;
    else
        spotlightY += 1;
}

function onDown()
{
    if (spotlightY <= 0)
        spotlightY = 0;
    else
        spotlightY -= 1;
}

function onLeft()
{
    if (spotlightX <= 0)
        spotlightX = 0;
    else
        spotlightX -= 1;
}

function onRight()
{
    if (spotlightX >= 4)
        spotlightX = 4;
    else
        spotlightX += 1;
}

function onVertex()
{
    useVertexShading = true;
    gl.useProgram(initShaders(gl, "vertex-shader-v", "fragment-shader-v"));
}

function onFragment()
{
    useVertexShading = false;
    gl.useProgram(initShaders(gl, "vertex-shader-f", "fragment-shader-f"));
}

var render = function()
{
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    if (useVertexShading)
    {
        // TODO
    }
    else
    {
        modelViewMatrix = scale4(STAGE_WIDTH, STAGE_HEIGHT, 0);
        modelViewMatrix = mult(translate(0.0, STAGE_HEIGHT / 2, 0.0), modelViewMatrix);
        //modelViewMatrix = mult(modelViewMatrix, rotate(20, 0, 1, 0));
        //modelViewMatrix = mult(modelViewMatrix, rotate(30, 1, 0, 0));
        modelViewMatrix = mult(modelViewMatrix, rotate(delta, 0, 1, 0));
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

        normalMatrix = [
            vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
            vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
            vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
        ];
        gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix));

        gl.drawArrays(gl.TRIANGLES, 0, numVertices);
    }

    //requestAnimFrame(render); // TODO ADD RENDER() ON CHANGES
}
