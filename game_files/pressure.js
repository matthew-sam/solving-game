
let nearbyMass = 0;

const PRESSURE_CONFIG = {

    radius: 300
};

function pressureUpdate(){

    calculateNearbyMass();
}

function calculateNearbyMass(){

    nearbyMass = 0;

    let player =
        CombatSystem.getPlayer();

    let enemies =
        EnemySystem.getEnemies();

    for(let enemy of enemies){

        let dist =
            Math.abs(
                enemy.x - player.x
            );

        if(
            dist >
            PRESSURE_CONFIG.radius
        ){
            continue;
        }

        nearbyMass += enemy.weight;
    }
}

function getNearbyMass(){

    return nearbyMass;
}

function getPulseMultiplier(){

    let pulseMultiplier =
        1 -
        (nearbyMass / 50);

    pulseMultiplier =
        Math.max(
            0.20,
            pulseMultiplier
        );

    return pulseMultiplier;
}

function pressureInitialize(){}

function pressureDraw(){

    ctx.fillStyle = "white";

    ctx.font = "20px Arial";

    ctx.textAlign = "left";

    ctx.fillText(

        "Mass: " +
        Math.floor(nearbyMass) +

        " Pulse: " +

        Math.floor(
            getPulseMultiplier() * 100
        ) +

        "%",

        20,
        40
    );
}

function getComboHits(){

    if(nearbyMass >= 40)
        return 1;

    if(nearbyMass >= 25)
        return 2;

    return 4;
}

window.PressureSystem = {

    pressureInitialize,
    pressureUpdate,
    pressureDraw,

    getNearbyMass,
    getPulseMultiplier,
    getComboHits
};