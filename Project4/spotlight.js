/*
 * File:    spotlight.js
 * Author:  Zach Wassynger
 * Purpose: Part of project 4 in CS 435. Creates a spotlight on a stage that can be
 *          moved around a select set of points. The shader can be toggled between
 *          Vertex based and fragment based shading.
 * Input:   Use the arrow keys/WASD/buttons to move the spotlight's direction.
 *          Use the IJKL keys to rotate the stage.
 *          Use the buttons at the top to change the shaders.
 */

var canvas;
var gl;

var pointsArray = [];
var normalsArray = [];

var delta = 0;
var delta2 = 0;
    
var lightPosition = vec4(0.0, 0.0, 4.0, 1.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var lightDirection = vec3(0.0, 0.0, -1.0);
var lightAngle = 20;

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 0.3, 0.3, 0.3, 1.0 );
var materialShininess = 100.0;

var ambientColor, diffuseColor, specularColor;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var normalMatrix, normalMatrixLoc;

var ambientProductLoc, diffuseProductLoc, specularProductLoc;
var lightPositionLoc, shininessLoc, lightAngleLoc;

var lightDirectionLoc;

var eye = vec3(0.0, 0.0, 1.0);
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

// Number of spotlight positions
var NUM_POS = 9;
var spotlightX = Math.floor(NUM_POS/2), spotlightY = Math.floor(NUM_POS/2);

var numSubdivisions = 50;

var useVertexShading = false;

function scale4(a, b, c) {
    var result = mat4();
    result[0][0] = a;
    result[1][1] = b;
    result[2][2] = c;
    return result;
}

function createStage()
{
    var normal = vec4(0.0, 0.0, 1.0, 0.0);
    
    pointsArray.push(vec4(-1.0, 1.0, 0.0, 1.0));
    normalsArray.push(normal);
    pointsArray.push(vec4(-1.0, -1.0, 0.0, 1.0));
    normalsArray.push(normal);
    pointsArray.push(vec4(1.0, -1.0, 0.0, 1.0));
    normalsArray.push(normal);
    pointsArray.push(vec4(-1.0, 1.0, 0.0, 1.0));
    normalsArray.push(normal);
    pointsArray.push(vec4(1.0, -1.0, 0.0, 1.0));
    normalsArray.push(normal);
    pointsArray.push(vec4(1.0, 1.0, 0.0, 1.0));
    normalsArray.push(normal);
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
        if (event.keyCode == 74)    // j
        {
            delta += 5;
            render();
        }
        if (event.keyCode == 76)    // l
        {
            delta -= 5;
            render();
        }
        if (event.keyCode == 73)    // i
        {
            delta2 += 5;
            render();
        }
        if (event.keyCode == 75)    // k
        {
            delta2 -= 5;
            render();
        }
    })
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    
    createStage();
    
    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);
    
    onFragment();

    document.getElementById("ButtonUp").onclick = onUp;
    document.getElementById("ButtonDown").onclick = onDown;
    document.getElementById("ButtonLeft").onclick = onLeft;
    document.getElementById("ButtonRight").onclick = onRight;
    document.getElementById("ButtonVertex").onclick = onVertex;
    document.getElementById("ButtonFrag").onclick = onFragment;
    
    document.getElementById("SliderSubdivision").onchange = function() {
        numSubdivisions = event.srcElement.value;
        render();
    }

    render();
}

function onUp()
{
    if (spotlightY >= NUM_POS-1)
        spotlightY = NUM_POS-1;
    else
        spotlightY += 1;
    render();
}

function onDown()
{
    if (spotlightY <= 0)
        spotlightY = 0;
    else
        spotlightY -= 1;
    render();
}

function onLeft()
{
    if (spotlightX <= 0)
        spotlightX = 0;
    else
        spotlightX -= 1;
    render();
}

function onRight()
{
    if (spotlightX >= NUM_POS-1)
        spotlightX = NUM_POS-1;
    else
        spotlightX += 1;
    render();
}

function onVertex()
{
    useVertexShading = true;
    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader-v", "fragment-shader-v");
    
    gl.useProgram(program);

    initBufferObjects(program);
    
    render();
}

function onFragment()
{
    useVertexShading = false;
    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader-f", "fragment-shader-f");
    
    gl.useProgram(program);

    initBufferObjects(program);
    
    render();
}

function initBufferObjects(program)
{
    // Create and initialize buffer objects
    var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    
    var vNormal = gl.getAttribLocation( program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "worldInvTrans");
    lightDirectionLoc = gl.getUniformLocation(program, "lightDirection");
    ambientProductLoc = gl.getUniformLocation(program, "ambientProduct");
    diffuseProductLoc = gl.getUniformLocation(program, "diffuseProduct");
    specularProductLoc = gl.getUniformLocation(program, "specularProduct");
    lightPositionLoc = gl.getUniformLocation(program, "lightPosition");
    shininessLoc = gl.getUniformLocation(program, "shininess");
    lightAngleLoc = gl.getUniformLocation(program, "lightAngle");
    
    gl.uniform4fv(ambientProductLoc, flatten(ambientProduct));
    gl.uniform4fv(diffuseProductLoc, flatten(diffuseProduct));
    gl.uniform4fv(specularProductLoc, flatten(specularProduct));
    gl.uniform4fv(lightPositionLoc, flatten(lightPosition));
    gl.uniform1f(shininessLoc, materialShininess);
    gl.uniform1f(lightAngleLoc, lightAngle);
    
    projectionMatrix = ortho(-3, 3, -3, 3, -10, 10);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
}

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    //eye = vec3(radius*Math.sin(theta)*Math.cos(phi), 
    //    radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));
    
    lightDirection = vec3(subtract(vec4(spotlightX-Math.floor(NUM_POS/2), spotlightY-Math.floor(NUM_POS/2), 0, 0), lightPosition));
    gl.uniform3fv(lightDirectionLoc, flatten(lightDirection));
    
    if (useVertexShading)
    {
        var width = 6/numSubdivisions;
        var offset = -3 + (width/2);
        var templateMatrix = lookAt(eye, at, up);
        templateMatrix = mult(templateMatrix, rotate(delta, 0, 1, 0));
        templateMatrix = mult(templateMatrix, rotate(delta2, 1, 0, 0));
        var rowMatrix = mult(templateMatrix, translate(offset, 0, 0));
        for (var i = 0; i < numSubdivisions; i++)
        {
            var columnMatrix = mult(rowMatrix, translate(0, offset, 0));
            for (var j = 0; j < numSubdivisions; j++)
            {
                modelViewMatrix = mult(columnMatrix, scale4(width/2, width/2, 1));
                
                normalMatrix = [
                    vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
                    vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
                    vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
                ];
                normalMatrix = transpose(inverse3(normalMatrix));
                
                gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
                gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix));
                
                gl.drawArrays(gl.TRIANGLES, 0, 6);
                
                columnMatrix = mult(columnMatrix, translate(0, width, 0));
            }
            rowMatrix = mult(rowMatrix, translate(width, 0, 0))
        }
    }
    else
    {
        modelViewMatrix = lookAt(eye, at, up);
        modelViewMatrix = mult(modelViewMatrix, scale4(3, 3, 1));
        //modelViewMatrix = mult(modelViewMatrix, translate(0, 3/2, 0));
        modelViewMatrix = mult(modelViewMatrix, rotate(delta, 0, 1, 0));
        modelViewMatrix = mult(modelViewMatrix, rotate(delta2, 1, 0, 0));
        //projectionMatrix = ortho(left, right, bottom, ytop, near, far);
        
        normalMatrix = [
            vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
            vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
            vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
        ];
        normalMatrix = transpose(inverse3(normalMatrix));

                
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
        //gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
        gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix));
            
        //for( var i=0; i<index; i+=3) 
        //    gl.drawArrays( gl.TRIANGLES, i, 3 );
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        //window.requestAnimFrame(render);
    }
}
