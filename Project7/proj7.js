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
};

// Stores all the info about the world and functions for manipulating it
var world = {
    "width": 31,
    "height": 20,
    "depth": 31,
    "shiftX": null,
    "shiftZ": null,
    "blocks": [],
    "blockArray": [this.width],
    "lights": [],
    "generateArray": function () {
        for (var i=0; i<this.width; i++) {
            this.blockArray[i] = [this.height]
            for (var j=0; j<this.height; j++) {
                this.blockArray[i][j] = [this.depth];
                for (var k=0; k<this.depth; k++) {
                    this.blockArray[i][j][k] = null;
                }
            }
        }
        this.shiftX = Math.floor(this.width/2);
        this.shiftZ = Math.floor(this.depth/2);
    },
    "placeBlock": function (material, x, y, z) {
        var block = new Block(material, x, y, z);
        this.blocks.push(block);
        this.blockArray[x+this.shiftX][y][z+this.shiftZ] = block;
    },
    "getBlock": function (position) {
        var x = Math.floor(position[0]);
        var y = Math.floor(position[1]);
        var z = Math.floor(position[2]);
        return this.blockArray[x+this.shiftX][y][z+this.shiftZ];
    },
    "removeBlock": function (position) {
        console.log("Attempting to remove block at: ", position);
        var blockIndex = this.blocks.findIndex(function (element) {
            if (element.position == position)
                return true;
            return false;
        });
        if (blockIndex == -1)
        {
            console.log("Error: could not find the specified block in removeBlock()");
            return;
        }
        this.blockArray[position[0]+this.shiftX][position[1]][position[2]+this.shiftZ] = null;
        this.blocks.splice(blockIndex, 1);
        player.lookAtBlock = null;
    }
};
// Stores the most recently used material
var recentMaterial;
// Determines the accuracy of the lookAt function(higher is more precise)
var LOOKAT_PRECISION = 2.0;
// Sets the max distance that the lookAt function will check for a block
var LOOKAT_MAX_DIST = 4.0;

// Stores all the player-related info and abilities
var player = {
    "position": vec3(0.0, 0.0, 0.0),
    "lookAt": vec3(0.0, 2.0, -1.0),
    "eyeHeight": 2.0,
    "theta": 0.0,
    "phi": 0.0,
    "velocity": vec3(0.0, 0.0, 0.0),
    "movementSpeed": 3.5,
    "walkSpeed": 3.5,
    "sprintSpeed": 6,
    "lookAtBlock": null,
    "calculateLook": function(deltaX, deltaY) {
        this.theta += (deltaX/canvas.width)*SENSITIVITY*fovy;
        if (this.theta >= 360)
            this.theta -= 360;
        if (this.theta < 0)
            this.theta += 360;
        this.phi += (deltaY/canvas.height)*SENSITIVITY*fovy;
        if (this.phi >= 90)
            this.phi = 90;
        if (this.phi < -90)
            this.phi = -90;
        
        var absoluteChange = vec3(Math.sin(radians(this.theta)), (-Math.sin(radians(this.phi)) + this.eyeHeight), -Math.cos(radians(this.theta)));
        this.lookAt = add(this.position, absoluteChange);
    },
    "calculateLookBlock": function() {
        var startPoint = this.getEye();
        var delta = subtract(this.lookAt, startPoint);
        var dx = delta[0]/LOOKAT_PRECISION;
        var dy = delta[1]/LOOKAT_PRECISION;
        var dz = delta[2]/LOOKAT_PRECISION;
        var adjustedDelta = vec3(dx, dy, dz);

        // Adjust for world coordinates
        var vector = add(startPoint, vec3(0.5, 0.5, 0.5));
        var block = world.getBlock(vector);
        // Handle as parametric equation
        for (var i=0; i<LOOKAT_MAX_DIST; i+=1.0/LOOKAT_PRECISION) {
            if (block)
            {
                this.lookAtBlock = block;
                return block;
            }
            vector = add(vector, adjustedDelta);
            block = world.getBlock(vector);
        }
        this.lookAtBlock = null;
        return null;
    },
    "breakBlock": function() {
        if (this.lookAtBlock != null)
            world.removeBlock(this.lookAtBlock.position);
    },
    "placeBlock": function() {
        if (this.lookAtBlock != null)
        {
            var eyePos = this.getEye();
            var dx = Math.abs(this.lookAtBlock.position[0] - eyePos[0]);
            var dy = Math.abs(this.lookAtBlock.position[1] - eyePos[1]);
            var dz = Math.abs(this.lookAtBlock.position[2] - eyePos[2]);
            console.log(dx, dy, dz);
            var blockPosX = this.lookAtBlock.position[0];
            var blockPosY = this.lookAtBlock.position[1];
            var blockPosZ = this.lookAtBlock.position[2];
            if (dx > dy && dx > dz)
            {
                if (this.lookAtBlock.position[0] - eyePos[0] > 0)
                    blockPosX -= 1;
                else
                    blockPosX += 1;
            } else if (dy > dx && dy > dz) {
                if (this.lookAtBlock.position[1] - eyePos[1] > 0)
                    blockPosY -= 1;
                else
                    blockPosY += 1;
            } else {
                if (this.lookAtBlock.position[2] - eyePos[2] > 0)
                    blockPosZ -= 1;
                else
                    blockPosZ += 1;
            }
            if (world.getBlock(vec3(blockPosX, blockPosY, blockPosZ)) == null)
                world.placeBlock("cobblestone", blockPosX, blockPosY, blockPosZ);
        }
    },
    "getEye": function() {
        return add(this.position, vec3(0, this.eyeHeight, 0));
    },
    "moveLeft": function() {
        this.velocity[0] = -this.movementSpeed;
    },
    "moveRight": function() {
        this.velocity[0] = this.movementSpeed;
    },
    "moveForward": function() {
        this.velocity[2] = -this.movementSpeed;
    },
    "moveBackward": function() {
        this.velocity[2] = this.movementSpeed;
    },
    "moveUp": function() {
        this.velocity[1] = this.movementSpeed;
    },
    "moveDown": function() {
        this.velocity[1] = -this.movementSpeed;
    },
    "sprint": function() {
        this.movementSpeed = this.sprintSpeed;
    },
    "stopLeft": function() {
        this.velocity[0] = 0;
    },
    "stopRight": function() {
        this.velocity[0] = 0;
    },
    "stopForward": function() {
        this.velocity[2] = 0;
    },
    "stopBackward": function() {
        this.velocity[2] = 0;
    },
    "stopUp": function() {
        this.velocity[1] = 0;
    },
    "stopDown": function() {
        this.velocity[1] = 0;
    },
    "stopSprint": function() {
        this.movementSpeed = this.walkSpeed;
    }
};

// Controls how often the world is updated(in hz)
var TICKRATE = 60;
var updaterID;

var GRAVITY = 10;

var atPosition = vec3(0.0, 0.0, 0.0);
var AT_DELTA = 0.1;

var cameraPosition = vec3(1.0, 1.0, 1.0);
var CAMERA_DELTA = 0.1;

// Determines how much mouse movement changes the camera angle
var SENSITIVITY = 2.0;

var RENDER_DISTANCE = 30;

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
// Checks if the value has a base of 2
function isPowerOf2(value)
{
    return (value & (value - 1)) == 0;
}
// Converts the given value(in degrees) to radians
function radians(degrees)
{
    return (degrees / 180.0) * Math.PI;
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

    //frameCounterID = setInterval(updateFPS, 1000.0*FPS_REFRESH_RATE);
    updaterID = setInterval(updateWorld, 1000.0/TICKRATE);

    canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
    document.addEventListener("mousemove", updateLook, false);

    render();
}

window.onclick = function(event)
{
    canvas.requestPointerLock();
}

function setupInput()
{
    document.addEventListener("keydown", function (event)
    {
        switch(event.keyCode)
        {
            case 37:    // left
            case 65:    // a
                player.moveLeft();
                break;
            case 39:    // right
            case 68:    // d
                player.moveRight();
                break;
            case 38:    // up
            case 87:    // w
                player.moveForward();
                break;
            case 40:    // down
            case 83:    // s
                player.moveBackward();
                break;
            case 32:    // space
                player.moveUp();
                break;
            case 17:    // ctrl(left)
                player.moveDown();
                break;
            case 16:    // shift(left)
                //player.sprint();
                player.moveDown();
                break;
            case 81:    // q
                //far();
                break;
            case 69:    // e
                //near();
                break;
            case 73:    // i
                cameraUp();
                break;
            case 75:    // k
                pause();
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
        //render();
    });
    document.addEventListener("keyup", function (event)
    {
        switch(event.keyCode)
        {
            case 37:    // left
            case 65:    // a
                player.stopLeft();
                break;
            case 39:    // right
            case 68:    // d
                player.stopRight();
                break;
            case 38:    // up
            case 87:    // w
                player.stopForward();
                break;
            case 40:    // down
            case 83:    // s
                player.stopBackward();
                break;
            case 32:    // space
                player.stopUp();
                break;
            case 17:    // shift
                player.stopDown();
                break;
            case 16:    // shift(left)
                //player.stopSprint();
                player.stopDown();
                break;
            default:
                return;
        }
        //render();
    });
    document.addEventListener("mousedown", function(event) {
        switch (event.which)
        {
            case 1: // left mouse
                player.breakBlock();
                break;
            case 2: // middle mouse
                break;
            case 3: // right mouse
                player.placeBlock();
                break;
            default:
                break;
        }
    });
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
    world.generateArray();
    for (var i = -Math.floor(world.width/2); i < Math.floor(world.width/2); i++)
    {
        for (var j = -Math.floor(world.depth/2); j < Math.floor(world.depth/2); j++)
        {
            world.placeBlock("cobblestone", i, 0, j);
        }
    }
    world.placeBlock("cobblestone", 1, 1, 1);
    world.placeBlock("cobblestone", 1, 2, 1);
    world.placeBlock("cobblestone", 1, 3, 1);
    world.placeBlock("cobblestone", 1, 4, 1);
    world.placeBlock("cobblestone", 1, 5, 1);

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
    world.lights.push(sunlight);
}

function updateWorld()
{
    tickCounter++;

    // Simulate gravity
    //player.velocity[1] -= GRAVITY/TICKRATE;

    // Simulate sun movement
    var z = Math.cos(tickCounter/WORLD_DAY_CYCLE*Math.PI);
    var y = Math.sin(tickCounter/WORLD_DAY_CYCLE*Math.PI);
    world.lights[0].position = vec4(0.0, y, z, 0.0);
    world.lights[0].fresh = true;

    // Update player position
    var deltaPos = vec3(player.velocity[0]/TICKRATE, player.velocity[1]/TICKRATE, player.velocity[2]/TICKRATE);
    var deltaZ = deltaPos[2]*Math.cos(radians(player.theta)) + deltaPos[0]*Math.sin(radians(player.theta));
    var deltaY = player.velocity[1]/TICKRATE;
    var deltaX = -deltaPos[2]*Math.sin(radians(player.theta)) + deltaPos[0]*Math.cos(radians(player.theta));
    player.position[0] += deltaX;
    player.lookAt[0] += deltaX;
    player.position[1] += deltaY;
    player.lookAt[1] += deltaY;
    player.position[2] += deltaZ;
    player.lookAt[2] += deltaZ;

    // Find the block the player is looking at
    var block = player.calculateLookBlock();
    //console.log(block);

    /*
    // Check for collision
    var block = world.getBlock(add(player.position, vec3(0.3, 0.3, 0.3))) ||
                world.getBlock(add(player.position, vec3(0.3, 0.7, 0.3))) ||
                world.getBlock(add(player.position, vec3(0.3, 0.3, 0.3))) ||
                world.getBlock(add(player.position, vec3(0.7, 0.7, 0.7)));
    if (block != null)
    {
        player.position[0] -= deltaX;
        player.lookAt[0] -= deltaX;
        player.position[2] -= deltaZ;
        player.lookAt[2] -= deltaZ;
        console.log("collision detected");
    }
    */

    if (tickCounter >= WORLD_DAY_CYCLE)
    {
        tickCounter = 0;
        dayCounter++;
    }
}

function updateLook(event)
{
    player.calculateLook(event.movementX, event.movementY);
}

function render()
{
    var up = vec3(0.0, 1.0, 0.0);
    cameraPosition = player.getEye();
    var viewMatrix = lookAt(cameraPosition, player.lookAt, up);
    gl.uniformMatrix4fv(uniforms["viewMatrix"], false, flatten(viewMatrix));
    gl.uniform3fv(uniforms["viewPosition"], cameraPosition);

    // Update lights
    for (var i = 0; i < world.lights.length; i++)
    {
        if (world.lights[i].fresh)
        {
            updateLight(world.lights[i], i);
        }
    }

    // Draw blocks
    world.blocks.forEach(function (block) {
        if (block.material != recentMaterial)
        {
            gl.uniform4fv(uniforms["material.ambient"], flatten(block.material.ambient));
            gl.uniform4fv(uniforms["material.diffuse"], flatten(block.material.diffuse));
            gl.uniform4fv(uniforms["material.specular"], flatten(block.material.specular));
            gl.uniform1f(uniforms["material.shininess"], block.material.shininess);
            gl.uniform1i(uniforms["material.texture"], textureLocations[block.material.textureName]);

            recentMaterial = block.material;
        }
        
        modelMatrix = translate(block.position);
        gl.uniformMatrix4fv(uniforms["modelMatrix"], false, flatten(modelMatrix));
        
        gl.drawArrays(gl.TRIANGLES, 0, NUM_CUBE_VERTICES);

        // Outlines the highlighted block
        if (block == player.lookAtBlock)
        {
            modelMatrix = mult(modelMatrix, scale4(1.01, 1.01, 1.01));
            gl.uniform4fv(uniforms["material.ambient"], flatten(vec4(0.0, 0.0, 0.0, 1.0)));
            gl.uniform4fv(uniforms["material.diffuse"], flatten(vec4(0.0, 0.0, 0.0, 1.0)));
            gl.uniform4fv(uniforms["material.specular"], flatten(vec4(0.0, 0.0, 0.0, 1.0)));

            recentMaterial = null;

            gl.drawArrays(gl.LINES, 0, NUM_CUBE_VERTICES);
        }
    })

    numFrames++;
    if (!isPaused)
        requestAnimationFrame(render);
}

function updateLight(light, index)
{
    gl.uniform4fv(uniforms["lights[" + index + "].position"], flatten(light.position));
    gl.uniform1i(uniforms["lights[" + index + "].isActive"], light.isActive);
    gl.uniform4fv(uniforms["lights[" + index + "].ambient"], flatten(light.ambient));
    gl.uniform4fv(uniforms["lights[" + index + "].diffuse"], flatten(light.diffuse));
    gl.uniform4fv(uniforms["lights[" + index + "].specular"], flatten(light.specular));
    gl.uniform1f(uniforms["lights[" + index + "].attenuationCoef"], light.attenuationCoef);
    light.fresh = false;
}
