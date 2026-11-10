
let equation = null;
let inputOp = null;
let inputNum = "";
let inputVar = false;
let equationsSolved = 0;
let equationHistory = [];
let solved = 0;

let lastMoveResult = "";


// MATH HELPERS
function frac(n, d = 1) { return simplify({ n, d }); }

function simplify(f) {
  let g = gcd(Math.abs(f.n), Math.abs(f.d));
  let n = f.n / g;
  let d = f.d / g;
  if (d < 0) { n *= -1; d *= -1; }
  return { n, d };
}

function gcd(a,b){ return b===0?a:gcd(b,a%b); }

function cloneEq(eq) {
  return JSON.parse(JSON.stringify(eq));
}

function fToString(f){ return f.d===1?`${f.n}`:`${f.n}/${f.d}`; }

function fToNumber(f){ return f.n / f.d; }

function addF(a, b) { return simplify({ n: a.n*b.d + b.n*a.d, d: a.d*b.d }); }

function mulF(a, b) { return simplify({ n: a.n*b.n, d: a.d*b.d }); }

function divF(a, b) { return simplify({ n: a.n*b.d, d: a.d*b.n }); }

function negF(a) { return { n: -a.n, d: a.d }; }


// RANDOM NUMBER GENERATION HELPERS
function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

function randCoef(min,max){ let n=1; while(n===0||Math.abs(n)===1)n=randInt(min,max); return n; }

function randSign(){ return Math.random()<0.5?-1:1; }

function randSigned(min,max){ return randInt(min,max)*randSign(); }

function randAddSub(val){ return Math.random()<0.5?val:-val; }


// GENERATION
function generateOneStepEquation() {

  let xVal = randSigned(1, 8);

  let mode = randInt(1, 4);

  // x + b = c
  if (mode === 1) {

    let b = randAddSub(randInt(1, 8));

    let c = xVal + b;

    return {
      left: [
        { type: "var", coef: frac(1) },
        { type: "const", value: frac(b) }
      ],
      right: [
        { type: "const", value: frac(c) }
      ]
    };
  }

  // x - b = c
  if (mode === 2) {

    let b = randInt(1, 8);

    let c = xVal - b;

    return {
      left: [
        { type: "var", coef: frac(1) },
        { type: "const", value: frac(-b) }
      ],
      right: [
        { type: "const", value: frac(c) }
      ]
    };
  }

  // ax = c
  if (mode === 3) {

    let a = randCoef(2, 8) * randSign();

    let c = a * xVal;

    return {
      left: [
        { type: "var", coef: frac(a) }
      ],
      right: [
        { type: "const", value: frac(c) }
      ]
    };
  }

  // x / a = c
  let a = randCoef(2, 8);

  return {
    left: [
      { type: "var", coef: frac(1, a) }
    ],
    right: [
      { type: "const", value: frac(xVal) }
    ]
  };
}

function generateTwoStepEquation() {

  let xVal = randSigned(1, 8);

  let a = randCoef(2, 8) * randSign();
  let b = randAddSub(randInt(1, 8));
  let c = a * xVal + b;

  return {
    left: [
      { type: "var", coef: frac(a) },
      { type: "const", value: frac(b) }
    ],
    right: [
      { type: "const", value: frac(c) }
    ]
  };
}

function generateVariablesBothSidesEquation() {

  let xVal = randSigned(1, 8);

  let a = randCoef(2, 8) * randSign();
  let cCoef = randCoef(2, 8) * randSign();

  while (Math.abs(a) === Math.abs(cCoef)) {
    cCoef = randCoef(2, 8) * randSign();
  }

  let b = randAddSub(randInt(1, 8));

  let d = a * xVal + b - cCoef * xVal;

  return {
    left: [
      { type: "var", coef: frac(a) },
      { type: "const", value: frac(b) }
    ],
    right: [
      { type: "var", coef: frac(cCoef) },
      { type: "const", value: frac(d) }
    ]
  };
}

function generateDistributionEquation() {

  let xVal = randSigned(1, 8);

  let innerB = randCoef(2, 8) * randSign();
  let innerC = randAddSub(randInt(1, 8));
  let outerA = randCoef(2, 8) * randSign();

  let d = outerA * (innerB * xVal + innerC);

  return {
    left: [
      {
        type: "group",
        a: frac(outerA),
        inner: [
          { type: "var", coef: frac(innerB) },
          { type: "const", value: frac(innerC) }
        ]
      }
    ],
    right: [
      { type: "const", value: frac(d) }
    ]
  };
}

function generateMixedEquation() {

  let xVal = randSigned(1, 8);

  let innerB = randCoef(2, 8) * randSign();
  let innerC = randAddSub(randInt(1, 8));
  let outerA = randCoef(2, 8) * randSign();

  let d = randAddSub(randInt(1, 8));

  let e = randCoef(2, 8) * randSign();

  while (outerA * innerB === e) {
    e = randCoef(2, 8) * randSign();
  }

  let f =
    outerA * (innerB * xVal + innerC)
    + d
    - e * xVal;

  return {
    left: [
      {
        type: "group",
        a: frac(outerA),
        inner: [
          { type: "var", coef: frac(innerB) },
          { type: "const", value: frac(innerC) }
        ]
      },
      { type: "const", value: frac(d) }
    ],
    right: [
      { type: "var", coef: frac(e) },
      { type: "const", value: frac(f) }
    ]
  };
}

function generateEquation() {

  let tier = getCurrentTier();

  let pool = getEquationPoolForTier(tier);

  let generator =
    pickRandomEquationGenerator(pool);

  return generator();
}

function getEquationPoolForTier(tier) {

  if (tier === 1) {
    return [
      generateOneStepEquation
      //generateMixedEquation, // test

    ];
  }

  if (tier === 2) {
    return [
      generateOneStepEquation,
      generateTwoStepEquation
    ];
  }

  if (tier === 3) {
    return [
      generateTwoStepEquation,
      generateVariablesBothSidesEquation
    ];
  }

  if (tier === 4) {
    return [
      generateVariablesBothSidesEquation,
      generateDistributionEquation
    ];
  }

  return [
    generateVariablesBothSidesEquation,
    generateDistributionEquation,
    generateMixedEquation
  ];
}

function pickRandomEquationGenerator(pool) {

  let index = randInt(0, pool.length - 1);

  return pool[index];
}

function getCurrentTier() {

  if (equationsSolved < 5) {
    return 1;
  }

  if (equationsSolved < 10) {
    return 2;
  }

  if (equationsSolved < 20) {
    return 3;
  }

  if (equationsSolved < 35) {
    return 4;
  }

  return 5;
}


// RENDERING
function termToString(t) {
  if (t.type === "var") {
    if (t.coef.n === 1 && t.coef.d === 1) return "x";
    if (t.coef.n === -1 && t.coef.d === 1) return "-x";
    return `${fToString(t.coef)}x`;
  }
  if (t.type === "const") return fToString(t.value);
  if (t.type === "group") {
    return `${fToString(t.a)}(${formatInner(t.inner)})`;
  }
}

function sideToString(side) {
  return side.map((t, i) => {
    let str = termToString(t);
    if (i === 0) return str;
    if (str.startsWith("-")) return str;
    return "+ " + str;
  }).join(" ");
}

function formatInner(inner) {
  return inner.map((t, i) => {
    let str = termToString(t);
    if (i === 0) return str;
    if (str.startsWith("-")) return str;
    return "+ " + str;
  }).join(" ");
}



// OPERATIONS
function distributeSide(side) {
  let result = [];
  for (let t of side) {
    if (t.type === "group") {
      for (let inner of t.inner) {
        if (inner.type === "var") {
          result.push({ type: "var", coef: mulF(inner.coef, t.a) });
        } else {
          result.push({ type: "const", value: mulF(inner.value, t.a) });
        }
      }
    } else {
      result.push(t);
    }
  }
  return result;
}

function combineSide(side) {
  let varSum = frac(0);
  let constSum = frac(0);
  let others = [];
  for (let t of side) {
    if (t.type === "var") varSum = addF(varSum, t.coef);
    else if (t.type === "const") constSum = addF(constSum, t.value);
    else others.push(t);
  }
  let result = [...others];
  if (varSum.n !== 0) result.push({ type: "var", coef: varSum });
  if (constSum.n !== 0) result.push({ type: "const", value: constSum });
  if (result.length === 0) result.push({ type: "const", value: frac(0) });
  return result;
}

function addTermToSide(side, term, op) {
  let copy = cloneEq(term);
  if (op === "-") {
    if (copy.type === "var") copy.coef = negF(copy.coef);
    else copy.value = negF(copy.value);
  }
  side.push(copy);
  return combineSide(side);
}

function multiplySide(side, val) {
  return side.map(t => {
    if (t.type === "var") return { ...t, coef: mulF(t.coef, val) };
    if (t.type === "const") return { ...t, value: mulF(t.value, val) };
    if (t.type === "group") return { ...t, a: mulF(t.a, val) };
  });
}

function divideSide(side, val) {
  return side.map(t => {
    if (t.type === "var") return { ...t, coef: divF(t.coef, val) };
    if (t.type === "const") return { ...t, value: divF(t.value, val) };
    if (t.type === "group") return { ...t, a: divF(t.a, val) };
  });
}

function distribute() {
  equation.left = distributeSide(equation.left);
  equation.right = distributeSide(equation.right);
  renderEquation();
}

function combine() {
  equation.left = combineSide(equation.left);
  equation.right = combineSide(equation.right);
  renderEquation();
}

function applyOperation() {
  if (!inputOp || inputNum === "") return false;
  let value = parseFloat(inputNum);
  if (isNaN(value)) return false;

  let term = inputVar
    ? { type: "var", coef: frac(value) }
    : { type: "const", value: frac(value) };

  if (inputOp === "+" || inputOp === "-") {
    equation.left = addTermToSide(equation.left, term, inputOp);
    equation.right = addTermToSide(equation.right, term, inputOp);
  } else if (inputOp === "*") {
    equation.left = multiplySide(equation.left, term.value);
    equation.right = multiplySide(equation.right, term.value);
  } else if (inputOp === "/") {
    equation.left = divideSide(equation.left, term.value);
    equation.right = divideSide(equation.right, term.value);
  }

  // Only combine for + and -
  if (inputOp === "+" || inputOp === "-") {
    equation.left = combineSide(equation.left);
    equation.right = combineSide(equation.right);
  }
  return true;
}


// SOLVE LOGIC
function cast() {

  let previousEquation =
    cloneEq(equation);

  lastMoveResult = "";

  saveEquationState();

  if (inputOp === "distribute") {

    if (!canDistribute(equation)) {

      lastMoveResult = "invalid";
    }

    else {

      distribute();

      if (
          lastMoveResult === "simplified"
          ||
          lastMoveResult === "solved"
      ){

      }
    }
  }

  else if (inputOp === "combine") {

    if (!canCombine(equation)) {

      lastMoveResult = "invalid";
    }

    else {

      combine();

      lastMoveResult =
        evaluateEquationTransition(
          previousEquation,
          equation
        );
    }
    if (
        lastMoveResult === "simplified"
        ||
        lastMoveResult === "solved"
    ){

    }
  }

  else {

    if (isDivideByZero()) {

    lastMoveResult = "invalid";
  }

  else if (isRestrictedOperation()) {

    lastMoveResult = "restricted";
  }

  else if (applyOperation()) {

      //renderEquation();

      lastMoveResult =
        evaluateEquationTransition(
          previousEquation,
          equation
        );

      if (
          lastMoveResult === "simplified"
          ||
          lastMoveResult === "solved"
      ){

      }

      if (checkSolved()) {

          lastMoveResult = "solved";

          showSolved();


          CombatSystem.queueCombo(

              PressureSystem.getComboHits()

          );


          setTimeout(() => {

            EquationSystem.newEquation();

            HUDSystem.renderEquation();

            HUDSystem.updateUI();

        }, 1200);
      }
    }
  }

  inputOp = null;
  inputNum = "";
  inputVar = false;

  document.getElementById("inputVar").checked = false;

  //updateUI();
}

function checkSolved() {

  if (
    equation.left.length !== 1 ||
    equation.right.length !== 1
  ) {
    return false;
  }

  let left = equation.left[0];
  let right = equation.right[0];

  let leftSolved =
    left.type === "var" &&
    left.coef.n === 1 &&
    left.coef.d === 1 &&
    right.type === "const";

  let rightSolved =
    right.type === "var" &&
    right.coef.n === 1 &&
    right.coef.d === 1 &&
    left.type === "const";

  return leftSolved || rightSolved;
}

function showSolved() {

    let xVal = 0;

    let left = equation.left[0];
    let right = equation.right[0];

    if (left.type === "var") {
        xVal = fToNumber(right.value);
    }
    else {
        xVal = fToNumber(left.value);
    }

    equationsSolved++;
    solved++;

    HUDSystem.showSolvedResult(
        "x = " + xVal
    );
}


function saveEquationState() {

  equationHistory.push({
    equation: cloneEq(equation)
  });

  // prevent infinite history growth
  if (equationHistory.length > 50) {
    equationHistory.shift();
  }
}

function undoEquation() {

  if (equationHistory.length === 0) {
    return;
  }

  let previous =
    equationHistory.pop();

  equation =
    cloneEq(previous.equation);

  //renderEquation();
  //updateUI();
}



function flattenSide(side) {
  return combineSide(distributeSide(side));
}

function flattenEquation(eq) {
  return {
    left: flattenSide(eq.left),
    right: flattenSide(eq.right)
  };
}


// STATE EVALUATION
function equationHasGroups(eq) {

  return [...eq.left, ...eq.right]
    .some(t => t.type === "group");
}

function equationHasVariablesBothSides(eq) {

  let leftHasVar =
    eq.left.some(t => t.type === "var");

  let rightHasVar =
    eq.right.some(t => t.type === "var");

  return leftHasVar && rightHasVar;
}

function countVariableTerms(side) {

  return side.filter(t => t.type === "var").length;
}

function countConstantTerms(side) {

  return side.filter(t => t.type === "const").length;
}

function getEquationState(eq) {

  if (checkSolved()) {
    return "solved";
  }

  if (equationHasGroups(eq)) {
    return "grouped";
  }

  if (equationHasVariablesBothSides(eq)) {
    return "variablesBothSides";
  }

  let totalTerms =
    eq.left.length + eq.right.length;

  if (totalTerms <= 2) {
    return "oneStep";
  }

  return "twoStep";
}

function getStateRank(state) {

  if (state === "solved") return 0;

  if (state === "oneStep") return 1;

  if (state === "twoStep") return 2;

  if (state === "variablesBothSides") return 3;

  if (state === "grouped") return 4;

  return 5;
}

function evaluateEquationTransition(
  previousEq,
  newEq
) {

  let previousState =
    getEquationState(previousEq);

  let newState =
    getEquationState(newEq);

  let previousRank =
    getStateRank(previousState);

  let newRank =
    getStateRank(newState);

  // solved
  if (newState === "solved") {
    return "solved";
  }

  // simplified
  if (newRank < previousRank) {
    return "simplified";
  }

  // regression
  if (newRank > previousRank) {
    return "inefficient";
  }

  // same state
  return "inefficient";
}


// VALIDATION
function canDistribute(eq) {

  return [...eq.left, ...eq.right]
    .some(t => t.type === "group");
}

function canCombine(eq) {

  return (
    sideHasCombinableTerms(eq.left) ||
    sideHasCombinableTerms(eq.right)
  );
}

function isDivideByZero() {

  return (
    inputOp === "/" &&
    Number(inputNum) === 0
  );
}

function isRestrictedOperation() {

  return (
    inputVar &&
    (inputOp === "*" || inputOp === "/")
  );
}



function sideHasCombinableTerms(side) {

  let varCount =
    side.filter(t => t.type === "var").length;

  let constCount =
    side.filter(t => t.type === "const").length;

  return varCount > 1 || constCount > 1;
}


// INPUT HELPERS
function resetInput() {
  inputOp = null;
  inputNum = "";
  inputVar = false;
  document.getElementById("inputVar").checked = false;
  updateUI();
}

function selectOp(op) { inputOp = op; updateUI(); }

function newEquation(){

    equation =
        generateEquation();

}

function initialize(){

    newEquation();

}

function getEquation(){

    return equation;
}

function getSolvedCount(){

    return solved;
}

function getInputOp(){

    return inputOp;
}

function getInputNum(){

    return inputNum;
}

function getInputVar(){

    return inputVar;
}

function appendDigit(d){

    inputNum += d;
}

function toggleVariable(){

    inputVar = !inputVar;
}

function backspaceInput(){

    inputNum =
        inputNum.slice(0, -1);
}


window.EquationSystem = {

    initialize,
    newEquation,
    cast,

    getCurrentTier,
    getEquation,
    getSolvedCount,

    getInputOp,
    getInputNum,
    getInputVar,

    termToString,
    sideToString,
    formatInner,

    resetInput,
    selectOp,
    undoEquation,

    appendDigit,
    toggleVariable,
    backspaceInput

};