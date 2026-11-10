
const ENEMY_COLLISION_CONFIG = {

    collisionPushStrength: 0.005,
    minimumEnemySpacing: -12
};

const ENEMY_REACTION_CONFIG = {

    sideLockDistance: 40,

    waveDecay: 0.92,
    minimumWaveForce: 0.5,

    airWaveMultiplier: 0.5,

    displacementDelayDivisor: 18
};

const ENEMY_MOVEMENT_CONFIG = {

    separationRadius: 180,
    separationStrength: 0.45,

    playerAvoidRadius: 250,
    playerAvoidStrength: 1.0,

    flowRadius: 180,
    flowStrength: 0.45
};

const ENEMY_TYPES = {

    normal: {

        radius: 20,
        health: 50,
        speed: 0.8,
        contactDamage: 1,
        weight: 1,
        color: "#ff5555",
        preferredDistance: 80
    },

    fast: {

        radius: 12,
        health: 25,
        speed: 1.6,
        contactDamage: 1,
        weight: 1,
        color: "#ffaa33",
        preferredDistance: 40
    },

    tank: {

        radius: 50,
        health: 100,
        speed: 0.4,
        contactDamage: 1,
        weight: 2,
        color: "#66ccff",
        preferredDistance: 140
    }
};

const WAVE_CONFIG = {

    startingEnemies: 10,
    maximumEnemies: 40,
    spawnInterval: 240,
    fastThreshold: 20,
    tankThreshold: 30
};


// ======================================================
// GLOBAL FX
// ======================================================
let currentWave = 1; 

let enemyPlayerRef = null;

function setPlayerReference(player){

    enemyPlayerRef = player;
}
    


// ======================================================
// COMBAT STATE
// ======================================================
let kills = 0;

// ======================================================
// ENEMY UPDATE
// ======================================================


function updateEnemies(){

    if(!enemyPlayerRef)
        return;

    for (let enemy of enemies){

        updateEnemyStates(enemy);
    }
    removeDeadEnemies();
}
   
function updateEnemyStates(enemy){

    updateEnemyHitstun(enemy);
    updateEnemyAir(enemy);
    updateEnemyDisplacement(enemy);

    updateEnemySideLock(enemy);

    updateEnemyMovement(enemy);

    updateEnemyCollision(enemy);
}

// HITSTUN 
function updateEnemyHitstun(e){

    if (e.hitTimer > 0){

        e.hitTimer--;
    }
}

// AIR STATE
function updateEnemyAir(e){

    if (
        e.launchY > 0 ||
        e.launchVelocity > 0
    ){

        e.launchY += e.launchVelocity;

        e.launchVelocity -= 0.8;

        if(e.launchVelocity < 0){
            e.launchVelocity -= 4;
        }

        if (e.launchY <= 0){

            e.launchY = 0;
            e.launchVelocity = 0;
        }
    }
}

// WAVE KNOCKBACK
function updateEnemyDisplacement(e){

    //if (enemyPlayerRef.rushing) return;

    if (e.displacementDelay > 0){

        e.displacementDelay--;
    }

    else if (e.displacementForce > 0){

        let airMultiplier = 1;

        if (e.launchY > 0){

            airMultiplier =
                ENEMY_REACTION_CONFIG.airWaveMultiplier;
        }

        e.x +=
            e.displacementDirection *
            e.displacementForce *
            airMultiplier;

        e.displacementForce *= ENEMY_REACTION_CONFIG.waveDecay;

        if (
            e.displacementForce <
            ENEMY_REACTION_CONFIG.minimumWaveForce
        ){

            e.displacementForce = 0;
        }
    }
}

// SIDE LOCK
function updateEnemySideLock(e){

    //if (enemyPlayerRef.rushing) return;

    if (e.lockedSide === -1){

        e.x = Math.min(
            e.x,
            enemyPlayerRef.x -
            ENEMY_REACTION_CONFIG.sideLockDistance
        );
    }

    if (e.lockedSide === 1){

        e.x = Math.max(
            e.x,
            enemyPlayerRef.x +
            ENEMY_REACTION_CONFIG.sideLockDistance
        );
    }
}

function updateEnemyMovement(e){

    // do not move during rush capture
    //if (enemyPlayerRef.rushing) return;

    // do not move while hit
    if (e.hitTimer > 0)
        return;

    // do not move while airborne
    if (e.launchY > 0)
        return;

    // ----------------------------------
    // LOCAL FLOW
    // ----------------------------------

    let localFlow = 0;

    for(let other of enemies){

        if(other === e)
            continue;

        let dist =
            Math.abs(
                other.x - e.x
            );

        if(
            dist >
            ENEMY_MOVEMENT_CONFIG.flowRadius
        )
            continue;

        localFlow +=
            Math.sign(
                enemyPlayerRef.x - other.x
            ) *
            ENEMY_MOVEMENT_CONFIG.flowStrength;
    }

    e.x += localFlow;

    let distToPlayer =
        Math.abs(
            e.x - enemyPlayerRef.x
        );

    let directionToPlayer =
        Math.sign(
            enemyPlayerRef.x - e.x
        );

    // too far

    if(
        distToPlayer >
        e.preferredDistance + 20
    ){

        e.x +=
            directionToPlayer *
            e.speed;
    }

    // too close

    else if(
        distToPlayer <
        e.preferredDistance - 20
    ){

        e.x -=
            directionToPlayer *
            e.speed *
            0.6;
    }
}

function updateEnemyCollision(enemy){

    for (let other of enemies){

        if (enemy === other)
            continue;

        let dx =
            enemy.x - other.x;

        let dist =
            Math.abs(dx);

        let minDist =
            enemy.radius +
            other.radius +
            ENEMY_COLLISION_CONFIG.minimumEnemySpacing;

        if (dist >= minDist)
            continue;

        let overlap =
            minDist - dist;

        let direction =
            Math.sign(dx);

        if (direction === 0){

            direction =
                Math.random() < 0.5
                ? -1
                : 1;
        }

        enemy.x +=
            direction *
            overlap *
            ENEMY_COLLISION_CONFIG.collisionPushStrength;
    }

    enemy.x =
        Math.max(
            ArenaSystem.getLeftBoundary(),
            enemy.x
        );

    enemy.x =
        Math.min(
            ArenaSystem.getRightBoundary(),
            enemy.x
        );

}

function removeDeadEnemies(){

    for(let i = enemies.length - 1; i >= 0; i--){

        if(enemies[i].health <= 0){

            kills++;

            enemies.splice(i,1);
        }
    }

    // -------------------------
    // NEXT LEVEL
    // -------------------------

    if(enemies.length === 0){

        currentWave++;

        spawnWave();
    }
}


function createEnemy(
    x,
    type = "normal"
){

    const config =
        ENEMY_TYPES[type];
    
    return {

        preferredDistance: config.preferredDistance,

        x: x,
        y: ArenaSystem.getGroundY(),

        type: type,

        radius: config.radius,

        health: config.health,
        maxHealth: config.health,

        speed: config.speed,
        contactDamage: config.contactDamage,
        weight: config.weight,

        color: config.color,

        // STATES
        marked: false,

        // HIT REACTION
        hitTimer: 0,

        // WAVE KNOCKBACK
        displacementForce: 0,
        displacementDelay: 0,
        displacementDirection: 0,

        // AIR
        launchY: 0,
        launchVelocity: 0,

        // SIDE CONTROL
        lockedSide: 0
    };
}

let enemies = [];

function drawEnemies(cameraX = 0){

    for (let e of enemies){

        let screenX =
            ArenaSystem.getCenterX() +
            (e.x - cameraX);

        // SHADOW
        ctx.fillStyle =
            "rgba(0,0,0,0.35)";

        ctx.beginPath();

        ctx.ellipse(
            screenX,
            ArenaSystem.getGroundY() + 8,
            e.radius,
            e.radius * 0.35,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        // ENEMY
        ctx.fillStyle =
            e.marked
            ? "#ffd166"
            : e.color;

        ctx.beginPath();

        ctx.arc(
            screenX,
            ArenaSystem.getGroundY() - e.radius - e.launchY,
            e.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();

        // HEALTH BAR
        let healthRatio =
            e.health / e.maxHealth;

        ctx.fillStyle = "red";

        ctx.fillRect(
            screenX - 25,
            ArenaSystem.getGroundY() - 75 - e.launchY,
            50 * healthRatio,
            5
        );
    }
}

function getEnemies(){

    return enemies;
}

// dummy function
function launchEnemy(enemy){

    enemy.launchVelocity = 18;
    enemy.launchY = 1;
}

function spawnWave(){

    let totalEnemies =
        currentWave * 10;

    let tankCount = currentWave;
    let fastCount = currentWave * 3;

    let normalCount =
        totalEnemies -
        tankCount -
        fastCount;

    // NORMAL

    for(let i = 0; i < normalCount; i++){

        let spawnX =
            ArenaSystem.getLeftBoundary() +
            Math.random() *
            ArenaSystem.getWidth();

        enemies.push(
            createEnemy(
                spawnX,
                "normal"
            )
        );
    }

    // FAST

    for(let i = 0; i < fastCount; i++){

        let spawnX =
            ArenaSystem.getLeftBoundary() +
            Math.random() *
            ArenaSystem.getWidth();

        enemies.push(
            createEnemy(
                spawnX,
                "fast"
            )
        );
    }

    // TANK

    for(let i = 0; i < tankCount; i++){

        let spawnX =
            ArenaSystem.getLeftBoundary() +
            Math.random() *
            ArenaSystem.getWidth();

        enemies.push(
            createEnemy(
                spawnX,
                "tank"
            )
        );
    }
}

function getKillCount(){

    return kills;
}


window.EnemySystem = {

    setPlayerReference,

    getEnemies,

    updateEnemies,

    drawEnemies,

    spawnWave,

    createEnemy,

    launchEnemy,

    getKillCount
};
