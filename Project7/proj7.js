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

window.onload = function()
{
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl)
        alert("WebGL is not available");
    
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
        var normal = vec3(cross(t2, t1));
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
    uniforms["projectionMatrix"] = gl.getUniformLocation(program, "projectionMatrix");
}

function render()
{
    gl.drawArrays(gl.TRIANGLES, 0, NUM_CUBE_VERTICES);
}
