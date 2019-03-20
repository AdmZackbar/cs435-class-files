var canvas;
var gl;

var pointsArray = [];
var normalsArray = [];

var delta = 0;
var delta2 = 0;
    
var lightPosition = vec4(0.0, 0.0, 1.0, 1.0 );
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

var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var spotlightX = 2, spotlightY = 2;

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
    var program = initShaders(gl, "vertex-shader-f", "fragment-shader-f");
    
    gl.useProgram(program);

    createStage();

    // Create and initialize buffer objects
    var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );
    
    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "worldInvTrans" );

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

    projectionMatrix = ortho(-3, 3, -3, 3, -3, 3);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

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

function render() {
    
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    //eye = vec3(radius*Math.sin(theta)*Math.cos(phi), 
    //    radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));

    eye = vec3(0, 0, 2);

    modelViewMatrix = lookAt(eye, at, up);
    modelViewMatrix = mult(modelViewMatrix, scale4(2, 2, 1));
    modelViewMatrix = mult(modelViewMatrix, rotate(delta, 0, 1, 0));
    modelViewMatrix = mult(modelViewMatrix, rotate(delta2, 1, 0, 0));
    //projectionMatrix = ortho(left, right, bottom, ytop, near, far);
    
    normalMatrix = [
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
    ];
    normalMatrix = transpose(inverse3(normalMatrix));

            
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    //gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix) );
        
    //for( var i=0; i<index; i+=3) 
    //    gl.drawArrays( gl.TRIANGLES, i, 3 );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    window.requestAnimFrame(render);
}