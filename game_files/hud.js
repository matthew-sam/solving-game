


function updateUI() {
    document.getElementById("tierDisplay").innerText =
        EquationSystem.getCurrentTier();
  
    document.getElementById("solved").innerText =
        "Solved: " +
        EquationSystem.getSolvedCount();
  
    document.getElementById("kills").innerText = 
        "Kills: " +
        EnemySystem.getKillCount();
  
    document.getElementById("inputDisplay").innerText =
        "Input: " + 
        (EquationSystem.getInputOp() || "") + 
        " " + EquationSystem.getInputNum() + 
        (EquationSystem.getInputVar() ? "x" : "");
  
    document.getElementById("inputVar").checked =
        EquationSystem.getInputVar();
}

function renderEquation(){

    let equation =
        EquationSystem.getEquation();

    if (!equation){
        return;
    }

    document.getElementById(
        "equation"
    ).innerText =

        EquationSystem.sideToString(
            equation.left
        )

        + " = " +

        EquationSystem.sideToString(
            equation.right
        );
}

function initializeInput(){
    document.getElementById("inputVar").addEventListener("change", (e) => {
    inputVar = e.target.checked;
    updateUI();
    });

    document.addEventListener("keydown", (e)=>{
    let k = e.key.toLowerCase();
    if ("0123456789".includes(k)) {
        EquationSystem.appendDigit(k);
        e.preventDefault();
    }
    if (k === "-") {
        if (inputNum === "") {
        inputNum = "-";
        } else if (inputNum === "-") {
        inputNum = "";
        }
        e.preventDefault();
    }
    if (k === "backspace") {
        EquationSystem.backspaceInput();
        e.preventDefault();
    }
    if (k === "a") inputOp = "+";
    if (k === "s") inputOp = "-";
    if (k === "d") inputOp = "/";
    if (k === "w") inputOp = "*";
    if (k === "q") {
        inputOp = "distribute";
        e.preventDefault();
    }
    if (k === "e") {
        inputOp = "combine";
        e.preventDefault();
    }
    if (k === "x") {
        EquationSystem.toggleVariable();
        document.getElementById("inputVar").checked = inputVar;
    }
    if (k === "z") {
        EquationSystem.undoEquation();
        HUDSystem.renderEquation();
        HUDSystem.updateUI();
        e.preventDefault();
    }

    if (e.key === " " || e.key === "Enter") {
        if (
            EquationSystem.getInputOp() !== null
            ||
            EquationSystem.getInputNum() !== ""
        ){

            EquationSystem.cast();

            HUDSystem.renderEquation();

            HUDSystem.updateUI();
        }

        e.preventDefault();
    }
    updateUI();
    });
}

function showSolvedResult(text){

    document.getElementById(
        "equation"
    ).innerText = text;
}



window.HUDSystem = {

    updateUI, 
    renderEquation,
    initializeInput,
    showSolvedResult

};