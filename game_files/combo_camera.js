
const PLAYER_CONFIG = {
    driftSpeed: 5,
    turnFriction: 10.35,

    dashSpeed: 75,
    dashDecay: 0.82,
    doubleTapWindow: 220,

    pulseForce: 50,
    pulseRadius: 150,
    pulseCooldown: 18
    
};

const CAMERA_CONFIG = {
    followSpeed: 0.10,
    zoom: 0.65
};

const COMBAT_CONFIG = {

    // Time in frames between each hit in the combo (higher value means slower combo)
    comboHitDelays: [
        40, // delay after opener hit
        40, // delay after sweep hit
        40, // delay after slam hit
        40 // delay between combos
    ],

    stepDistance: 80
};

const HIT_CONFIG = {

    opener: {
        damage: 1000,
        maxTargets: 10,
        hitstun: 0,
        shake: 0,
        hitstop: 0,
        attackRange: 250
    },

    sweep: {
        damage: 1000,
        maxTargets: 100,
        hitstun: 0,
        shake: 0,
        hitstop: 0,
        attackRange: 0 // skipspeed and hopgravity determine range
    },

    rush: {
        damage: 1000, 
        maxTargets: 10,
        hitstun: 0,
        shake: 0,
        hitstop: 0,
        attackRange: 0 // multiplier determines range
    },

    slam: {
            damage: 1000,
            maxTargets: 10,
            hitstun: 0,
            shake: 0,
            hitstop: 0,
            attackRange: 200
        }, 
    
};

const OPENER_CONFIG = {

    jumpHeight: 17,
    gravity: 1.0,

    forwardSpeed: 12,
    forwardDecay: 0.7985,

    cameraPush: 10
};

const SWEEP_CONFIG = {

    hopHeight: 6, 
    hopGravity: 0.42,
    skipSpeed: 25,
    pullStrength: 7,

    pushDistance: 80
};

const SLAM_CONFIG = {

    riseHeight: 18,
    riseFrames: 12,
    hangFrames: 20,
    fallSpeed: 28,

    launchGravity: 0.8,
    fallGravity: 4,

    slamShakeStrength: 0,
    slamShakeDecay: 0.9,
    slamShakeRandomness: 0.35,

    riseForwardSpeed: 5,
    fallForwardSpeed: 7
};

const RUSH_CONFIG = {

    rushDistanceMultiplier: 0.55, 
    rushLerpSpeed: 0.148,
    capturePadding: 40,
    cameraRecoil: 0,
    rushEndDistance: 20, // can't be 0 breaks enemies movement

    exitVelocity: 16
};

const FX_CONFIG = {

    screenShakeDecay: 0.82,
    minimumShakeThreshold: 0.5
};


let cameraX = 0;
let cameraState = {

    recoilX: 0,
    slamShake: 0
};

let shake = 0;
let hitstop = 0;

let lastLeftTap = 0;
let lastRightTap = 0;


let enemyRef = [];

function setEnemyReference(enemies){

    enemyRef = enemies;
}


let player = {

    x: 0,
    //y: 0,//ArenaSystem.getGroundY(),
    velocityX: 0,
    dashVelocity: 0,
    pulseCooldownTimer: 0,
    facing: 1,

    opening: false,
    openerLanded: true,
    openerPhase: "",
    openerAttackTriggered: false,
    openerJumpY: 0,
    openerJumpVelocity: 0,
    openerForwardVelocity: 0,
    openerStartX: 0,

    sweepOriginalFacing: 1,
    sweepHitApplied: false,
    sweepPlannedDistance: 0,
    sweepHitX: 0,
    sweepOriginX: 0,
    sweepStartX: 0,
    sweepVelocityX: 0,
    sweeping: false,
    sweepTimer: 0,
    sweepJumpY: 0,
    sweepJumpVelocity: 0,

    rushing: false,
    rushTargetX: 0,
    rushStartX: 0,
    capturedRushEnemies: [],

    slamming: false,
    slamPhase: "",
    slamTimer: 0,
    slamHangTimer: 0,    
    jumpY: 0, // rename to have slam in name?
    jumpVelocity: 0 // rename to have slam in name?
};

let attackQueue = [];
let attackCooldown = 0;

let combatTexts = [];

let comboCount = 0;
let comboTimer = 0;
let highestCombo = 0;
let lastMilestone = 0;
let milestoneText = "";
let milestoneTimer = 0;


function getPlayer(){

    return player;
}

function spawnCombatText(x,y,text){

    combatTexts.push({

        x,
        y,

        text,

        life: 25
    });
}

function applyCombatFX(hitData){

    shake =
        hitData.shake;

    hitstop =
        hitData.hitstop;
}

function processAttacks(){

    if (attackCooldown > 0){

        // ----------------------------------
        // WAIT FOR SLAM LANDING
        // ----------------------------------

        if(player.slamming)
            return;

        attackCooldown--;
        return;
    }

    if (attackQueue.length === 0) return;

    let current = attackQueue[0];
    let comboStage = 4 - current.hits;
    current.hits--;

    if (current.hits < 0){

        attackQueue.shift();
        return;
    }

    let closest = getClosestEnemy();
    let hitData = null;

    // HIT 1
    if (comboStage === 0){

        hitData =
            executeOpenerHit(
                closest
            );
    }

    // HIT 2
    if (comboStage === 1){

        if(!player.openerLanded)
            return;

        hitData =
            executeSweepHit(
                closest
            );
    }

    // HIT 3
    if (comboStage === 2){

        hitData =
            executeRushHit(
                closest
            );
    }

    // HIT 4
    if (comboStage === 3){

        hitData =
            executeSlamHit(
                closest
            );
    }
    
    if(hitData){

        applyCombatFX(hitData);
    }

    // ----------------------------------
    // INSTANT SLAM -> BLITZ TRANSITION
    // ----------------------------------

    attackCooldown =
    COMBAT_CONFIG.comboHitDelays[
        comboStage
    ];
}

function executeOpenerHit(
    closest
){

    executeOpenerMovement();

    applyOpenerCameraPush();

    return HIT_CONFIG.opener;
}

function executeSweepHit(
    closest
){

    beginSweepState();

    return HIT_CONFIG.sweep;
}

function executeSlamHit(
    closest
){

    beginSlamState();

    if (closest){

        movePlayerTowardTarget(
            closest
        );
    }

    return HIT_CONFIG.slam;
}

function executeRushHit(closest){

    beginBlitzRush();

    return null;
}

function executeOpenerMovement(){

    player.opening = true;

    player.openerStartX = player.x;

    player.openerLanded = false;

    player.openerPhase = "rise";

    player.openerAttackTriggered = false;

    player.openerJumpY = 0;

    player.openerJumpVelocity = OPENER_CONFIG.jumpHeight;

    player.openerForwardVelocity =
        player.facing * OPENER_CONFIG.forwardSpeed;
}

function applyOpenerHitbox(){

    let targetsHit = 0;

    for(let enemy of enemyRef){

        let dx =
            enemy.x -
            player.openerStartX;

        // wrong side
        if(
            player.facing === 1 &&
            dx < 0
        ) continue;

        if(
            player.facing === -1 &&
            dx > 0
        ) continue;

        let dist = Math.abs(dx);

        if(
            dist >
            HIT_CONFIG.opener.attackRange
        ) continue;

        applyDirectHitReaction(
            enemy,
            HIT_CONFIG.opener.damage,
            0
        );

        targetsHit++;

        if(
            targetsHit >=
            HIT_CONFIG.opener.maxTargets
        ){
            break;
        }
    }
}

function applyOpenerCameraPush(){

    cameraState.recoilX =
        -player.facing *
        OPENER_CONFIG.cameraPush;
}

// TARGETING
function getClosestEnemy(){

    let closest = null;
    let dist = Infinity;

    for (let e of enemyRef){

        if (
            player.facing === -1 &&
            e.x > player.x
        ) continue;

        if (
            player.facing === 1 &&
            e.x < player.x
        ) continue;

        let d =
            Math.abs(e.x - player.x);

        if (d < dist){

            dist = d;
            closest = e;
        }
    }

    return closest;
}

// MOVEMENT
function movePlayerTowardTarget(enemy){

    let dx = enemy.x - player.x;

    let move =
        Math.sign(dx) *
        Math.min(
            Math.abs(dx),
            COMBAT_CONFIG.stepDistance
        );

    player.x += move;
}

// DIRECT HIT REACTIONS
function applyDirectHitReaction(
    enemy,
    damage,
    knockback
){

    if (!enemy) return;

    enemy.health -= damage;

    enemy.hitTimer =
        HIT_CONFIG.opener.hitstun;

    comboCount++;
    highestCombo =
        Math.max(
            highestCombo,
            comboCount
        );
    comboTimer = 300;

    spawnCombatText(
        enemy.x,
        ArenaSystem.getGroundY() - enemy.radius - 40,
        "HIT"
    );
}


function dash(direction){

    player.dashVelocity =
        direction *
        PLAYER_CONFIG.dashSpeed;
}

function pulsePush(){

    if(player.pulseCooldownTimer > 0)
        return;

    player.pulseCooldownTimer =
        PLAYER_CONFIG.pulseCooldown;

    shake = 2;

    for(let enemy of enemyRef){

        let dx =
            enemy.x - player.x;

        let dist =
            Math.abs(dx);

        if(
            dist >
            PLAYER_CONFIG.pulseRadius
        ) continue;

        let direction =
            Math.sign(dx);

        if(direction === 0){

            direction =
                player.facing;
        }

        let forceMultiplier =
            1 -
            (
                dist /
                PLAYER_CONFIG.pulseRadius
            );

        enemy.hitTimer = 6;

        enemy.displacementDirection =
            direction;

        enemy.displacementDelay = 0;

        enemy.displacementForce =
            (
                PLAYER_CONFIG.pulseForce *
                forceMultiplier
                * PressureSystem.getPulseMultiplier() // test tension system
            )
            / enemy.weight;
    }
}

function getCameraX(){

    return cameraX;
}

function updateOpenerState(){

    if(!player.opening)
        return;

    // -------------------------
    // FORWARD TRAVEL
    // -------------------------

    player.x +=
        player.openerForwardVelocity;

    player.openerForwardVelocity *= OPENER_CONFIG.forwardDecay;

    // -------------------------
    // AIR MOVEMENT
    // -------------------------

    player.openerJumpY +=
        player.openerJumpVelocity;

    player.openerJumpVelocity -= OPENER_CONFIG.gravity;

    // -------------------------
    // APEX ATTACK
    // -------------------------

    if(
        !player.openerAttackTriggered &&
        player.openerJumpVelocity <= 0
    ){

        player.openerAttackTriggered = true;

        applyOpenerHitbox();

        shake =
            HIT_CONFIG.opener.shake;

        hitstop =
            HIT_CONFIG.opener.hitstop;
    }

    // -------------------------
    // LAND
    // -------------------------

    if(
        player.openerJumpY <= 0 &&
        player.openerJumpVelocity < 0
    ){

        player.openerJumpY = 0;

        player.opening = false;

        player.openerLanded = true;
    }
}


function updateSweepState(){

    if(!player.sweeping)
        return;

    // ----------------------------------
    // LOW SPIN SKIP
    // ----------------------------------

    player.x +=
        player.sweepVelocityX;

    updateSweepHitbox();

    player.sweepJumpY +=
        player.sweepJumpVelocity;

    player.sweepJumpVelocity -= SWEEP_CONFIG.hopGravity;

    if(
        !player.sweepHitApplied &&
        player.sweepJumpVelocity <= 0
    ){

        applySweepField();

        player.sweepHitApplied = true;
    }

    // ----------------------------------
    // LAND
    // ----------------------------------
    if(player.sweepJumpY <= 0){

        player.sweepJumpY = 0;

        player.sweeping = false;

        player.facing =
            player.sweepOriginalFacing;
    }
}

function applySweepField(){

    let targetsHit = 0;

    let attackRange =
        player.sweepPlannedDistance;

    HIT_CONFIG.sweep.attackRange =
        attackRange;

    for(let enemy of enemyRef){

        let dx =
            enemy.x -
            player.sweepStartX;

        // front only

        if(
            player.sweepOriginalFacing === 1 &&
            dx < 0
        ) continue;

        if(
            player.sweepOriginalFacing === -1 &&
            dx > 0
        ) continue;

        let dist =
            Math.abs(dx);

        if(
            dist >
            attackRange
        ) continue;

        enemy.hitTimer =
            HIT_CONFIG.sweep.hitstun;

        let pushDirection =
            enemy.x < player.x
            ? -1
            : 1;

        enemy.x +=
            pushDirection * SWEEP_CONFIG.pushDistance;

        enemy.health -=
            HIT_CONFIG.sweep.damage;

        comboCount++;

        spawnCombatText(
            enemy.x,
            ArenaSystem.getGroundY() - enemy.radius - 40,
            "HIT"
        );

        targetsHit++;

        if(
            targetsHit >=
            HIT_CONFIG.sweep.maxTargets
        ){
            break;
        }
    }
}

function beginSweepState(){

    player.sweepStartX = player.x;

    player.sweepHitX =
        player.x;

    for(let enemy of enemyRef){

        enemy.sweepHit = false;
    }
    
    player.sweeping = true;

    player.sweepOriginalFacing =
        player.facing;

    player.facing *= -1;

    player.sweepVelocityX =
        (
            player.velocityX +
            player.dashVelocity
        ) * 1.5;

    if(
        Math.abs(player.sweepVelocityX) <
        SWEEP_CONFIG.skipSpeed
    ){
        player.sweepVelocityX =
            player.sweepOriginalFacing *
            SWEEP_CONFIG.skipSpeed;
    }

    player.sweepPlannedDistance =
        Math.abs(
            player.sweepVelocityX
        ) * 30;

    player.sweepJumpVelocity =
        SWEEP_CONFIG.hopHeight;

    player.sweepHitApplied = false;
}

function updateSweepHitbox(){

    player.sweepHitX =
        player.x;

    for(let enemy of enemyRef){

        if(enemy.sweepHit)
            continue;

        let dx =
            enemy.x -
            player.sweepStartX;

        if(
            player.sweepOriginalFacing === 1 &&
            dx < 0
        ) continue;

        if(
            player.sweepOriginalFacing === -1 &&
            dx > 0
        ) continue;

        let dist =
            Math.abs(
                enemy.x -
                player.sweepHitX
            );

        if(dist > 60)
            continue;

        enemy.sweepHit = true;

        enemy.hitTimer =
            HIT_CONFIG.sweep.hitstun;

        let pushDirection =
            enemy.x < player.x
            ? -1
            : 1;

        enemy.x +=
            pushDirection * SWEEP_CONFIG.pushDistance;

        enemy.health -=
            HIT_CONFIG.sweep.damage;

        comboCount++;

        spawnCombatText(
            enemy.x,
            ArenaSystem.getGroundY() - enemy.radius - 40,
            "HIT"
        );
    }
}


function updateRushState(){

    if (!player.rushing)
        return;

    applyRushPassThroughHits();

    let dx =
        player.rushTargetX -
        player.x;

    player.x +=
        dx *
        RUSH_CONFIG.rushLerpSpeed;

    if(
    Math.abs(dx) < RUSH_CONFIG.rushEndDistance
    ){

        player.rushing = false;

        endRushState();
    }
}

function applyRushPassThroughHits(){

    HIT_CONFIG.rush.attackRange =
        Math.abs(
            player.x -
            player.rushStartX
        );

    for(let enemy of enemyRef){

        if(enemy.rushHit)
            continue;

        let dist =
            Math.abs(
                enemy.x -
                player.rushStartX
            );

        if(
            dist >
            HIT_CONFIG.rush.attackRange
        ) continue;

        enemy.rushHit = true;

        enemy.health -=
            HIT_CONFIG.rush.damage;

        enemy.hitTimer = 6;

        comboCount++;

        spawnCombatText(
            enemy.x,
            ArenaSystem.getGroundY() - enemy.radius - 40,
            "HIT"
        );
    }
}

function endRushState(){

    player.rushing = false;

    player.dashVelocity =
        player.facing * RUSH_CONFIG.exitVelocity;

    shake =
        HIT_CONFIG.rush.shake;

    hitstop =
        HIT_CONFIG.rush.hitstop;

    player.capturedRushEnemies = [];

    cameraState.recoilX =
        -player.facing *
        RUSH_CONFIG.cameraRecoil;
}

function beginBlitzRush(){
    
    player.rushStartX = player.x;

    player.capturedRushEnemies = [];

    let rushDistance =
        canvas.width * RUSH_CONFIG.rushDistanceMultiplier;

    for(let enemy of enemyRef){

        enemy.rushHit = false;
    }
    
    player.rushing = true;

    player.rushTargetX =
        player.x +
        (
            rushDistance *
            player.facing
        );

}


function beginSlamState(){

    player.slamming = true;

    // -------------------------
    // RISE PHASE
    // -------------------------

    player.slamPhase = "rise";

    player.slamTimer = SLAM_CONFIG.riseFrames;
}

function updateSlamState(){

    if(!player.slamming)
        return;

    // ==================================================
    // RISE
    // ==================================================

    if(player.slamPhase === "rise"){

        player.x +=
            player.facing * SLAM_CONFIG.riseForwardSpeed;

        player.jumpY += SLAM_CONFIG.riseHeight;

        player.slamTimer--;

        if(player.slamTimer <= 0){

            player.slamPhase = "hang";

            player.slamTimer = SLAM_CONFIG.hangFrames;
        }
    }

    // ==================================================
    // HANG
    // ==================================================

    else if(player.slamPhase === "hang"){

        player.slamTimer--;

        if(player.slamTimer <= 0){

            player.slamPhase = "fall";
        }
    }

    // ==================================================
    // FALL
    // ==================================================

    else if(player.slamPhase === "fall"){

        player.x +=
            player.facing * SLAM_CONFIG.fallForwardSpeed;

        player.jumpY -= SLAM_CONFIG.fallSpeed;

        if(player.jumpY <= 0){

            player.jumpY = 0;

            endSlamState();

            slamImpact();
        }
    }
}

function slamImpact(){

    applySlamCameraShake();

    hitstop =
        HIT_CONFIG.slam.hitstop;

    launchSlamEnemies();
}

function launchSlamEnemies(){

    let targetsHit = 0;

    for (let e of enemyRef){

        let dist =
            Math.abs(
                e.x - player.x
            );

        if (
            dist <
            HIT_CONFIG.slam.attackRange
        ){

            launchEnemy(e);
            e.health -=
                HIT_CONFIG.slam.damage;

            comboCount++;
            highestCombo =
                Math.max(
                    highestCombo,
                    comboCount
                );
            comboTimer = 300;

            spawnCombatText(
                e.x,
                ArenaSystem.getGroundY() - e.radius - 40,
                "HIT"
            );

            targetsHit++;

            if (
                targetsHit >=
                HIT_CONFIG.slam.maxTargets
            ){
                break;
            }
        }
    }
}

function endSlamState(){

    player.slamming = false;

    player.slamPhase = "";

    player.slamTimer = 0;
}


function updateCamera(){

    let cameraTargetX = player.x;

    updateCameraFollow(cameraTargetX);

    updateSlamCameraShake();
}

function updateCameraFollow(cameraTargetX){

    cameraX +=
        (cameraTargetX - cameraX)
        * CAMERA_CONFIG.followSpeed;

    cameraX += cameraState.recoilX;
}

function updateSlamCameraShake(){

    if (cameraState.slamShake > 0){

        cameraX +=
            (Math.random() - 0.5)
            * cameraState.slamShake
            * SLAM_CONFIG.slamShakeRandomness;

        cameraState.slamShake *=
            SLAM_CONFIG.slamShakeDecay;
    }
}

function applySlamCameraShake(){

    cameraState.slamShake =
        SLAM_CONFIG.slamShakeStrength;
}


// ======================================================
// BLANK FUNCTIONS FOR STRUCTURE
// ======================================================

function drawCombatTexts(){

    for(let text of combatTexts){

        let screenX =
            ArenaSystem.getCenterX() +
            (text.x - cameraX);

        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
            text.text,
            screenX,
            text.y
        );
    }
}

function updateCombatTexts(){

    for(let text of combatTexts){

        text.y -= 1;

        text.life--;
    }

    combatTexts =
        combatTexts.filter(
            text => text.life > 0
        );
}

function updateComboMilestones(){}


let launchEnemyRef = null;

function setLaunchEnemyReference(fn){

    launchEnemyRef = fn;
}

function launchEnemy(enemy){

    if(launchEnemyRef){

        launchEnemyRef(enemy);
    }
}


function updateCombat(){

    processAttacks();
}

function updatePlayerDrift(){

    if(
        player.opening ||
        player.sweeping ||
        player.rushing ||
        player.slamming
    ){
        return;
    }

    // accelerate toward facing direction

    player.velocityX +=
        player.facing *
        PLAYER_CONFIG.driftSpeed *
        0.08;

    // clamp speed

    player.velocityX =
        Math.max(
            -PLAYER_CONFIG.driftSpeed,
            Math.min(
                PLAYER_CONFIG.driftSpeed,
                player.velocityX
            )
        );

    // movement

    player.x +=
        player.velocityX +
        player.dashVelocity;

    // slight drag

    player.velocityX *= 0.96;

    player.dashVelocity *=
        PLAYER_CONFIG.dashDecay;

    if(
        Math.abs(player.dashVelocity)
        < 0.2
    ){
        player.dashVelocity = 0;
}
}

function updatePlayerStates(){

    updateOpenerState();

    updateSweepState();
    updateRushState();
    updateSlamState();
}

function update(){

    if(player.pulseCooldownTimer > 0){

        player.pulseCooldownTimer--;
    }

    updateCombat();
    updatePlayerStates();
    updatePlayerDrift();

    if(comboTimer > 0){

        comboTimer--;
    }
    else{

        comboCount = 0;
        lastMilestone = 0;
    }

    updateCombatTexts();
    updateComboMilestones();

    updateCamera();
    
}


function drawPlayer(){

    let screenX = ArenaSystem.getCenterX();

    let totalJumpY =
        (player.openerJumpY || 0) +
        (player.sweepJumpY || 0) +
        (player.jumpY || 0);

    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    ctx.fillStyle = "rgba(0,0,0,0.4)";

    ctx.beginPath();

    ctx.ellipse(
        screenX,
        ArenaSystem.getGroundY() + 12,
        12,
        5,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // HEAD
    ctx.beginPath();

    ctx.arc(
        screenX,
        ArenaSystem.getGroundY() - totalJumpY - 26,
        6,
        0,
        Math.PI * 2
    );

    ctx.stroke();

    // BODY
    ctx.beginPath();

    ctx.moveTo(
        screenX,
        ArenaSystem.getGroundY() - totalJumpY - 30
    );

    ctx.lineTo(
        screenX,
        ArenaSystem.getGroundY() - totalJumpY
    );

    ctx.stroke();

    // ARM
    let armAngle = 0;

    if(player.sweeping){

        armAngle =
            0; 
    }
    else {

        armAngle =
            player.facing === 1
            ? 0
            : Math.PI;
    }

    let armLength = 12;

    let armX =
        screenX +
        Math.cos(armAngle) *
        armLength;

    let armY =
        ArenaSystem.getGroundY() -
        totalJumpY -
        10 +
        Math.sin(armAngle) *
        armLength;

    ctx.beginPath();

    ctx.moveTo(
        screenX,
        ArenaSystem.getGroundY() - totalJumpY - 10
    );

    ctx.lineTo(
        armX,
        armY
    );

    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(
        screenX,
        ArenaSystem.getGroundY() - totalJumpY - 10
    );

    ctx.lineTo(
        armX,
        ArenaSystem.getGroundY() - totalJumpY - 10
    );

    ctx.stroke();

    ctx.strokeStyle = "white";

    ctx.strokeRect(
        screenX - 50,
        ArenaSystem.getGroundY() - 100,
        100,
        10
    );
}


window.addEventListener("keydown", e => {

    if(e.key === "ArrowUp"){

        pulsePush();
    }

    if (e.key === "ArrowRight"){

        let now = Date.now();

        if(
            now - lastRightTap <
            PLAYER_CONFIG.doubleTapWindow
        ){

            dash(1);
        }

        lastRightTap = now;

        player.facing = 1;

        player.velocityX *=
            PLAYER_CONFIG.turnFriction;
    }

    if (e.key === "ArrowLeft"){

        let now = Date.now();

        if(
            now - lastLeftTap <
            PLAYER_CONFIG.doubleTapWindow
        ){

            dash(-1);
        }

        lastLeftTap = now;

        player.facing = -1;

        player.velocityX *=
            PLAYER_CONFIG.turnFriction;
    }
});

function queueCombo(hits=4){
    
    attackQueue.push({
        hits: hits
    });
}

window.CombatSystem = {

    getPlayer,
    getCameraX,

    setEnemyReference,
    setLaunchEnemyReference,

    update,

    drawPlayer,
    drawCombatTexts,

    queueCombo
};
