// const a = [4, 5, 2, 5, 10, 3];
// const b = [2, 4, 2, 6, 3];
// const b1 = new Set(b);
// let difference = [... new Set([...a].filter(x => !b1.has(x)))];


// difference


let a = { 'f': 'a' };
let b = { 'f': 'a' };

let d = JSON.stringify(a)
let e = JSON.stringify(b)


let difference = Object.is(d, e);
let difference2 = (a === b);

difference
difference2
