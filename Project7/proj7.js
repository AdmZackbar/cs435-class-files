var gl, canvas;

// Stores all the vertices in the cube
var cubeVertices = [];
var NUM_CUBE_VERTICES = 36;
var cubeNormals = [];
var cubeTexturePoints = [];

// Uniform locations
var uniforms = {};

// Camera variables
var fovy = 60.0;
var aspect;

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

// Material textures
var TEXTURES = [
    "test",
    "cobblestone"
];
// Contains the location that the texture was loaded into
var textureLocations = {};

// Contains info about types of materials
function Material(ambient, diffuse, specular, shininess, textureName)
{
    this.ambient = ambient;
    this.diffuse = diffuse;
    this.specular = specular;
    this.shininess = shininess;
    this.textureName = textureName;
}
// Contains info about each "block"
function Block(materialName, x, y, z)
{
    this.material = MATERIALS[materialName];
    this.position = vec3(x, y, z);
}
// Contains info about each light source
function Light(ambient, diffuse, specular, attenuationCoef, x, y, z, isPoint=true, isActive=true)
{
    this.ambient = ambient;
    this.diffuse = diffuse;
    this.specular = specular;
    this.attenuationCoef = attenuationCoef;
    if (isPoint)
        this.position = vec4(x, y, z, 1.0);
    else
        this.position = vec4(x, y, z, 0.0);
    // Determines if the light information needs to be pushed
    this.fresh = true;
    // Determines if the light is used
    this.isActive = isActive;
}

// Available materials
var MATERIALS = {
    "cobblestone": new Material(
        vec4(0.8, 0.8, 0.8, 1.0),
        vec4(0.8, 0.8, 0.8, 1.0),
        vec4(0.9, 0.9, 0.9, 1.0),
        10.0,
        "cobblestone"
    )
}

// Contains all the "blocks" in the world
var blocks = [];
// Contains all the lights in the world
var lights = [];
// Stores the most recently used material
var recentMaterial;

// Stores all the player-related info
var player = {
    "position": vec3(0.0, 0.0, 0.0),
    "lookAt": vec3(0.0, 0.0, -1.0),
    "velocity": vec3(0.0, 0.0, 0.0)
}

// Controls how often the world is updated(in hz)
var TICKRATE = 60;
var updaterID;

var atPosition = vec3(0.0, 0.0, 0.0);
var AT_DELTA = 0.1;

var cameraPosition = vec3(1.0, 1.0, 1.0);
var CAMERA_DELTA = 0.1;

var RENDER_DISTANCE = 30;

var WORLD_WIDTH = 31;
var WORLD_DEPTH = 31;
// Amount of time in a full "day"(in ticks)
var WORLD_DAY_CYCLE = 10.0*TICKRATE;
var tickCounter = 0;
var dayCounter = 0;

// Transform for model view matrices
function scale4(a, b, c) {
    var result = mat4();
    result[0][0] = a;
    result[1][1] = b;
    result[2][2] = c;
    return result;
}

var isPaused = false;
// Counter for the number of frames during the most recent second
var numFrames = 0;
// Multipler for how often the FPS counter updates
var FPS_REFRESH_RATE = 0.5;
var frameCounterID;

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
    //gl.enable(gl.BLEND);
    //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Set up shaders
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    createGeometry();
    createBuffers(program);
    setUniforms(program);
    setProjection();
    loadTextures(program);

    generateWorld();

    frameCounterID = setInterval(updateFPS, 1000.0*FPS_REFRESH_RATE);
    updaterID = setInterval(updateWorld, 1000.0/TICKRATE);

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
            case 32:    // space
                pause();
                break;
            default:
                return;
        }
        //render();
    })
}

function left()
{
    atPosition[0] -= AT_DELTA;
}
function right()
{
    atPosition[0] += AT_DELTA;
}
function up()
{
    atPosition[1] += AT_DELTA;
}
function down()
{
    atPosition[1] -= AT_DELTA;
}
function near()
{
    atPosition[2] += AT_DELTA;
}
function far()
{
    atPosition[2] -= AT_DELTA;
}

function forward()
{
    cameraPosition[2] -= CAMERA_DELTA;
}
function backward()
{
    cameraPosition[2] += CAMERA_DELTA;
}
function moveLeft()
{
    cameraPosition[0] -= CAMERA_DELTA;
}
function moveRight()
{
    cameraPosition[0] += CAMERA_DELTA;
}
function cameraUp()
{
    cameraPosition[1] += CAMERA_DELTA;
}
function cameraDown()
{
    cameraPosition[1] -= CAMERA_DELTA;
}

function pause()
{
    isPaused = !isPaused;
    if (!isPaused)
        render();
}

function updateFPS()
{
    var fps = numFrames / FPS_REFRESH_RATE;
    console.log("FPS: ", fps);

    numFrames = 0;
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
    var texturePoints = [
        vec2(1.0, 1.0),
        vec2(1.0, 0.0),
        vec2(0.0, 1.0),
        vec2(0.0, 0.0)
    ];

    function addFace(a, b, c, d)
    {
        cubeVertices.push(cubePoints[a]);
        cubeTexturePoints.push(texturePoints[0]);
        cubeVertices.push(cubePoints[b]);
        cubeTexturePoints.push(texturePoints[1]);
        cubeVertices.push(cubePoints[c]);
        cubeTexturePoints.push(texturePoints[3]);
        cubeVertices.push(cubePoints[d]);
        cubeTexturePoints.push(texturePoints[2]);
        cubeVertices.push(cubePoints[a]);
        cubeTexturePoints.push(texturePoints[0]);
        cubeVertices.push(cubePoints[c]);
        cubeTexturePoints.push(texturePoints[3]);

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
    addFace(6, 3, 0, 2);    // z
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

    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cubeTexturePoints), gl.STATIC_DRAW);
    
    var vTexPos = gl.getAttribLocation(program, "vTexPos");
    gl.vertexAttribPointer(vTexPos, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexPos);
}

function setUniforms(program)
{
    uniformNames = [
        "projectionMatrix",
        "modelMatrix",
        "viewMatrix",
        "viewPosition",
        "material.texture"
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

function setProjection()
{
    aspect = canvas.width/canvas.height;
    var projectionMatrix = perspective(fovy, aspect, 0.1, RENDER_DISTANCE);
    gl.uniformMatrix4fv(uniforms["projectionMatrix"], false, flatten(projectionMatrix));
}

function loadTextures(program)
{
    for (var i = 0; i < TEXTURES.length; i++)
    {
        configureTexture(document.getElementById(TEXTURES[i]), TEXTURES[i], i);
    }
}

function isPowerOf2(value)
{
    return (value & (value - 1)) == 0;
}

function configureTexture(image, name, index) {
    texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + index);
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

    textureLocations[name] = index;
}

function generateWorld()
{
    for (var i = -Math.floor(WORLD_WIDTH/2); i < Math.floor(WORLD_WIDTH/2); i++)
    {
        for (var j = -Math.floor(WORLD_DEPTH/2); j < Math.floor(WORLD_DEPTH/2); j++)
        {
            blocks.push(new Block("cobblestone", i, 0, j));
        }
    }
    blocks.push(new Block("cobblestone", 0, 1, 0));

    var sunlight = new Light(
        vec4(0.3, 0.3, 0.3, 1.0),
        vec4(0.9, 0.9, 0.9, 1.0),
        vec4(1.0, 1.0, 1.0, 1.0),
        0.0,
        0.0,
        1.0,
        0.0,
        false
    );
    lights.push(sunlight);
}

function updateWorld()
{
    tickCounter++;
    //var velocity = vec3(player.velocity[0]/TICKRATE, player.velocity[1]/TICKRATE, player.velocity[2]/TICKRATE);
    //player.position = add(player.position, velocity);
    var z = Math.cos(tickCounter/WORLD_DAY_CYCLE*Math.PI);
    var y = Math.sin(tickCounter/WORLD_DAY_CYCLE*Math.PI);
    lights[0].position = vec4(0.0, y, z, 0.0);
    lights[0].fresh = true;

    if (tickCounter >= WORLD_DAY_CYCLE)
    {
        tickCounter = 0;
        dayCounter++;
    }
}

function render()
{
    var up = vec3(0.0, 1.0, 0.0);
    var viewMatrix = lookAt(cameraPosition, atPosition, up);
    gl.uniformMatrix4fv(uniforms["viewMatrix"], false, flatten(viewMatrix));
    gl.uniform3fv(uniforms["viewPosition"], cameraPosition);

    // Update lights
    for (var i = 0; i < lights.length; i++)
    {
        if (lights[i].fresh)
        {
            gl.uniform4fv(uniforms["lights[" + i + "].position"], flatten(lights[i].position));
            gl.uniform1i(uniforms["lights[" + i + "].isActive"], lights[i].isActive);
            gl.uniform4fv(uniforms["lights[" + i + "].ambient"], flatten(lights[i].ambient));
            gl.uniform4fv(uniforms["lights[" + i + "].diffuse"], flatten(lights[i].diffuse));
            gl.uniform4fv(uniforms["lights[" + i + "].specular"], flatten(lights[i].specular));
            gl.uniform1f(uniforms["lights[" + i + "].attenuationCoef"], lights[i].attenuationCoef);
            lights[i].fresh = false;
        }
    }

    // Draw blocks
    blocks.forEach(function (block) {
        if (block.material != recentMaterial)
        {
            gl.uniform4fv(uniforms["material.ambient"], flatten(block.material.ambient));
            gl.uniform4fv(uniforms["material.diffuse"], flatten(block.material.diffuse));
            gl.uniform4fv(uniforms["material.specular"], flatten(block.material.specular));
            gl.uniform1f(uniforms["material.shininess"], block.material.shininess);
            gl.uniform1i(uniforms["material.texture"], textureLocations[block.material.textureName]);

            recentMaterial = block.material;
        }

        var modelMatrix = translate(block.position);
        gl.uniformMatrix4fv(uniforms["modelMatrix"], false, flatten(modelMatrix));

        gl.drawArrays(gl.TRIANGLES, 0, NUM_CUBE_VERTICES);
    })

    numFrames++;
    if (!isPaused)
        requestAnimationFrame(render);
}
