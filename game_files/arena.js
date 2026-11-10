
const ARENA_CENTER_X = canvas.width / 2;

const WORLD_CONFIG = {

    groundOffset: 260
};

const ARENA_CONFIG = {

    width: 8000,
    leftBoundary: -1900,
    rightBoundary: 1900,
    maximumWidth: 8000,

    wallEscapePadding: 120
};

const ARENA_GROUND_Y = canvas.height - WORLD_CONFIG.groundOffset;


let arenaPlayerRef = null;


function setPlayerReference(player){

    arenaPlayerRef = player;
}

function drawArena(cameraX = 0){

    let leftX =
        ARENA_CENTER_X +
        (
            ARENA_CONFIG.leftBoundary -
            cameraX
        );

    let rightX =
        ARENA_CENTER_X +
        (
            ARENA_CONFIG.rightBoundary -
            cameraX
        );

    let compressionRatio =
        1 -
        (
            ARENA_CONFIG.width /
            ARENA_CONFIG.maximumWidth
        );

    let wallColor = "#33ff66";

    if(compressionRatio > 0.35){

        wallColor = "#ffcc33";
    }

    if(compressionRatio > 0.6){

        wallColor = "#ff4444";
    }

    // OUTSIDE VOID

    ctx.fillStyle = "black";

    ctx.fillRect(
        0,
        0,
        leftX,
        canvas.height
    );

    ctx.fillRect(
        rightX,
        0,
        canvas.width - rightX,
        canvas.height
    );

    // WALLS

    ctx.fillStyle = wallColor;

    ctx.fillRect(
        leftX - 20,
        0,
        20,
        canvas.height
    );

    ctx.fillRect(
        rightX,
        0,
        20,
        canvas.height
    );
}

function updateArenaBoundaries(){

    if(!arenaPlayerRef)
        return;

    // LEFT WALL

    if(
        arenaPlayerRef.x <
        ARENA_CONFIG.leftBoundary
    ){

        arenaPlayerRef.x =
            ARENA_CONFIG.leftBoundary + 40;

        arenaPlayerRef.velocityX = 8;
        arenaPlayerRef.dashVelocity = 8;

        arenaPlayerRef.openerForwardVelocity = 8;
        arenaPlayerRef.sweepVelocityX = 8;

        arenaPlayerRef.rushTargetX =
            arenaPlayerRef.x + 40;
    }

    // RIGHT WALL

    if(
        arenaPlayerRef.x >
        ARENA_CONFIG.rightBoundary
    ){

        arenaPlayerRef.x =
            ARENA_CONFIG.rightBoundary - 40;

        arenaPlayerRef.velocityX = -8;
        arenaPlayerRef.dashVelocity = -8;

        arenaPlayerRef.openerForwardVelocity = -8;
        arenaPlayerRef.sweepVelocityX = -8;

        arenaPlayerRef.rushTargetX =
            arenaPlayerRef.x - 40;
    }
}


function drawWorld(){

    // FLOOR GRADIENT
    let gradient =
        ctx.createLinearGradient(
            0,
            ARENA_GROUND_Y - 200,
            0,
            canvas.height
        );

    let compressionRatio =
        1 -
        (
            ARENA_CONFIG.width /
            ARENA_CONFIG.maximumWidth
        );

    let topColor = "#1f2b1f";
    let bottomColor = "#0f140f";

    if(compressionRatio > 0.35){

        topColor = "#3a3316";
        bottomColor = "#1d1808";
    }

    if(compressionRatio > 0.6){

        topColor = "#3d1616";
        bottomColor = "#1a0808";
    }

    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);

    ctx.fillStyle = gradient;

    ctx.fillRect(
        0,
        ARENA_GROUND_Y,
        canvas.width,
        canvas.height - ARENA_GROUND_Y
    );

    // GROUND LINE
    ctx.strokeStyle = topColor;
    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.moveTo(0, ARENA_GROUND_Y + 20);
    ctx.lineTo(canvas.width, ARENA_GROUND_Y + 20);

    ctx.stroke();
}


function getCenterX(){

    return ARENA_CENTER_X;
}

function getGroundY(){

    return ARENA_GROUND_Y;
}

function getLeftBoundary(){

    return ARENA_CONFIG.leftBoundary;
}

function getRightBoundary(){

    return ARENA_CONFIG.rightBoundary;
}

function getWidth(){
    return ARENA_CONFIG.width;
}

window.ArenaSystem = {

    getGroundY,
    getCenterX,
    getLeftBoundary,
    getRightBoundary,
    getWidth,

    setPlayerReference,
    drawArena,
    updateArenaBoundaries,
    
    drawWorld
};