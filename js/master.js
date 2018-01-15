//@ts-check

// import { item } from "./item";
// import { person } from "./person";

let ItemsIn = new Set();
class item {
  constructor(name) {
    this.name = name;
    this.checkedOut = {};
    ItemsIn.add(this);
  }
}

let People = new Set();
class person {
  constructor(name) {
    this.name = name;
    this.itemsCheckedOut = new Set();
    People.add(this);
  }
}

let Log = new Set();
let ItemsOut = new Set();
class checkOut {
  constructor(person, item, willReturn) {
    if (ItemsIn.has(item)) {
      item.checkedOut = {
        by: person,
        on: Date.now(),
        nextAvailable: willReturn
      };
      person.itemsCheckedOut.add(item);
      ItemsIn.delete(item);
      ItemsOut.add(item);
    }
    this.by = person.name;
    this.timeStamp = Date.now();
    Log.add(this);
  }
}

class checkIn {
  constructor(item) {
    if (ItemsOut.has(item)) {
      let set = item.checkedOut.by.itemsCheckedOut;
      set.delete(item);
      item.checkedOut = { returned: Date.now(), by: item.checkedOut.by };
      ItemsOut.delete(item);
      ItemsIn.add(item);
      this.by = item.checkedOut.by.name;
    }
    this.timeStamp = Date.now();
    Log.add(this);
  }
}
function camelize(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function(letter, index) {
      return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
    })
    .replace(/\s+/g, "");
}

//Equipment
let equipmentList = ["GoPro1", "GoPro2", "Phantom3", "Cam360"];
let items = {};
for (let i in equipmentList) {
  let name = camelize(equipmentList[i]);
  if (equipmentList.hasOwnProperty(i)) {
    items[name] = new item(equipmentList[i]);
  }
}
items;
//People
let peopleList = ["Carlos Velasco", "Daniel Aberg"];
let people = {};
for (let i in peopleList) {
  let name = camelize(peopleList[i]);
  if (peopleList.hasOwnProperty(i)) {
    people[name] = new person(peopleList[i]);
  }
}

// Checkouts
new checkOut(people.danielAberg, items.cam360, Date.now());

new checkOut(people.carlosVelasco, items.goPro1, Date.now());

new checkIn(items.goPro1);
new checkOut(people.carlosVelasco, items.goPro1, Date.now());

people;
People;
Log;
ItemsIn;
ItemsOut;
let answer = people.carlosVelasco.itemsCheckedOut;
answer;
