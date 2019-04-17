var gl, canvas;

// Stores all the vertices in the cube
var cubeVertices = [];
var NUM_CUBE_VERTICES = 36;
var cubeNormals = [];

// Uniform locations
var uniforms = {};

// Camera variables
var fovy = 60.0;
var aspect;

var modelViewMatrix;

// Light shader struct info
var MAX_LIGHTS = 3;
var LIGHT_FIELDS = [
    "position",
    "isActive",
    "ambient",
    "diffuse",
    "specular",
    "shininess",
    "attenuationCoef"
];
// Material shader struct info
var MATERIAL_FIELDS = [
    "ambient",
    "diffuse",
    "specular"
];

var lightPosition = vec4(0.0, 1.0, 0.0, 1.0);
var LIGHT_DELTA = 0.1;

var cameraPosition = vec3(1.0, 1.0, 1.0);
var CAMERA_DELTA = 0.1;

window.onload = function()
{
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl)
        alert("WebGL is not available");
    
    // Set up keyboard input
    setupInput();
    
    // Set up gl instance
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // Set up shaders
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    createGeometry();
    createBuffers(program);

    setUniforms(program);

    aspect = canvas.width/canvas.height;
    var projectionMatrix = perspective(fovy, aspect, 0.1, 10);
    gl.uniformMatrix4fv(uniforms["projectionMatrix"], false, flatten(projectionMatrix));

    render();
}

function setupInput()
{
    document.addEventListener("keydown", function(event)
    {
        switch(event.keyCode)
        {
            case 37:    // left
            case 65:    // a
                left();
                break;;
            case 39:    // right
            case 68:    // d
                right();
                break;
            case 38:    // up
            case 87:    // w
                up();
                break;
            case 40:    // down
            case 83:    // s
                down();
                break;
            case 81:    // q
                far();
                break;
            case 69:    // e
                near();
                break;
            case 73:    // i
                cameraUp();
                break;
            case 75:    // k
                cameraDown();
                break;
            case 74:    // j
                moveLeft();
                break;
            case 76:    // l
                moveRight();
                break;
            case 85:    // u
                forward();
                break;
            case 79:    // o
                backward();
                break;
            default:
                return;
        }
        render();
    })
}

function left()
{
    lightPosition[0] -= LIGHT_DELTA;
}
function right()
{
    lightPosition[0] += LIGHT_DELTA;
}
function up()
{
    lightPosition[1] += LIGHT_DELTA;
}
function down()
{
    lightPosition[1] -= LIGHT_DELTA;
}
function near()
{
    lightPosition[2] += LIGHT_DELTA;
}
function far()
{
    lightPosition[2] -= LIGHT_DELTA;
}

function forward()
{
    cameraPosition[2] -= LIGHT_DELTA;
}
function backward()
{
    cameraPosition[2] += LIGHT_DELTA;
}
function moveLeft()
{
    cameraPosition[0] -= LIGHT_DELTA;
}
function moveRight()
{
    cameraPosition[0] += LIGHT_DELTA;
}
function cameraUp()
{
    cameraPosition[1] += LIGHT_DELTA;
}
function cameraDown()
{
    cameraPosition[1] -= LIGHT_DELTA;
}

function createGeometry()
{
    var cubePoints = [
        vec4(0.5, 0.5, 0.5, 1.0),   // 0
        vec4(0.5, 0.5, -0.5, 1.0),  // 1
        vec4(0.5, -0.5, 0.5, 1.0),  // 2
        vec4(-0.5, 0.5, 0.5, 1.0),  // 3
        vec4(0.5, -0.5, -0.5, 1.0), // 4
        vec4(-0.5, 0.5, -0.5, 1.0), // 5
        vec4(-0.5, -0.5, 0.5, 1.0), // 6
        vec4(-0.5, -0.5, -0.5, 1.0) // 7
    ]

    function addFace(a, b, c, d)
    {
        cubeVertices.push(cubePoints[a]);
        cubeVertices.push(cubePoints[b]);
        cubeVertices.push(cubePoints[c]);
        cubeVertices.push(cubePoints[d]);
        cubeVertices.push(cubePoints[a]);
        cubeVertices.push(cubePoints[c]);

        var t1 = subtract(cubePoints[c], cubePoints[b]);
        var t2 = subtract(cubePoints[b], cubePoints[a]);
        var normal = vec3(cross(t1, t2));
        for (var i = 0; i < 6; i++)
        {
            cubeNormals.push(normal);
        }
    }

    addFace(5, 7, 4, 1);    // -z
    addFace(3, 5, 1, 0);    // y
    addFace(1, 4, 2, 0);    // x
    addFace(7, 6, 2, 4);    // -y
    addFace(3, 6, 7, 5);    // -x
    addFace(0, 2, 6, 3);    // z
}

function createBuffers(program)
{
    createVertexBuffer(program, cubeVertices);
}

function createVertexBuffer(program, points)
{
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cubeNormals), gl.STATIC_DRAW);
    
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);
}

function setUniforms(program)
{
    uniformNames = [
        "projectionMatrix",
        "modelViewMatrix",
        "viewPosition"
    ];

    // Add lights array with its fields
    for (var i = 0; i < MAX_LIGHTS; i++)
    {
        var lightName = "lights[" + i + "].";
        for (var j = 0; j < LIGHT_FIELDS.length; j++)
        {
            uniformNames.push(lightName + LIGHT_FIELDS[j]);
        }
    }

    // Add material fields
    for (var i = 0; i < MATERIAL_FIELDS.length; i++)
    {
        uniformNames.push("material." + MATERIAL_FIELDS[i]);
    }
    
    uniformNames.forEach(function (name) {
        uniforms[name] = gl.getUniformLocation(program, name);
    });
}

function render()
{
    var at = vec3(0.0, 0.0, 0.0);
    var up = vec3(0.0, 1.0, 0.0);
    modelViewMatrix = lookAt(cameraPosition, at, up);
    gl.uniformMatrix4fv(uniforms["modelViewMatrix"], false, flatten(modelViewMatrix));
    gl.uniform3fv(uniforms["viewPosition"], cameraPosition);

    var lightPos2 = vec4(-1.0, -1.0, -1.0, 0.0);
    var lightPos3 = vec4(0.0, 0.0, 2.0, 1.0);
    gl.uniform4fv(uniforms["lights[0].position"], flatten(lightPosition));
    gl.uniform4fv(uniforms["lights[1].position"], flatten(lightPos2));
    gl.uniform4fv(uniforms["lights[2].position"], flatten(lightPos3));

    var attenuationCoef = 0.5;
    var ambient = vec4(0.1, 0.1, 0.2, 1.0);
    var diffuse = vec4(0.6, 0.6, 0.7, 1.0);
    var specular = vec4(0.9, 0.9, 0.95, 1.0);
    var shininess = 100.0;

    var activeLights = [
        true,
        true,
        true
    ];

    for (var i = 0; i < 3; i++)
    {
        gl.uniform1i(uniforms["lights[" + i + "].isActive"], activeLights[i]);
        gl.uniform4fv(uniforms["lights[" + i + "].ambient"], flatten(ambient));
        gl.uniform4fv(uniforms["lights[" + i + "].diffuse"], flatten(diffuse));
        gl.uniform4fv(uniforms["lights[" + i + "].specular"], flatten(specular));
        gl.uniform1f(uniforms["lights[" + i + "].attenuationCoef"], attenuationCoef);
        gl.uniform1f(uniforms["lights[" + i + "].shininess"], shininess);
    }

    ambient = vec4(0.5, 0.5, 0.55, 1.0);
    diffuse = vec4(0.8, 0.8, 0.85, 1.0);
    specular = vec4(1.0, 1.0, 1.0, 1.0);

    gl.uniform4fv(uniforms["material.ambient"], flatten(ambient));
    gl.uniform4fv(uniforms["material.diffuse"], flatten(diffuse));
    gl.uniform4fv(uniforms["material.specular"], flatten(specular));

    gl.drawArrays(gl.TRIANGLES, 0, NUM_CUBE_VERTICES);
}
