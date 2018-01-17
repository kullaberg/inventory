//@ts-check

// import { item } from "./item";
// import { person } from "./person";

let ItemsIn = new Set();
class item {
  constructor(name) {
    this.name = name;
    this.returned = {
      by: "new item",
      timeStamp: Date.now()
    };
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
  constructor(personArg, itemArg, willReturn) {
    if (ItemsIn.has(itemArg)) {
      itemArg.checkedOut = {
        by: personArg.name,
        on: Date.now(),
        nextAvailable: willReturn
      };
      personArg.itemsCheckedOut.add(itemArg);
      ItemsIn.delete(itemArg);
      ItemsOut.add(itemArg);
    }
    if (itemArg.returned) {
      delete itemArg.returned;
    }
    this.by = personArg.name;
    this.timeStamp = Date.now();
    Log.add(this);
  }
}

class checkIn {
  constructor(itemArg) {
    if (ItemsOut.has(itemArg)) {
      let personWithItem = itemArg.checkedOut.by;
      let set = person[personWithItem].itemsCheckedOut;
      set.delete(itemArg);
      itemArg.returned = {
        by: itemArg.checkedOut.by,
        timeStamp: Date.now()
      };
      delete itemArg.checkedOut;
      ItemsOut.delete(itemArg);
      ItemsIn.add(itemArg);
      this.by = itemArg.returned.by;
    }
    this.timeStamp = Date.now();
    Log.add(this);
  }
}

//Equipment
let equipmentList = [
  "GoPro1",
  "GoPro2",
  "GoPro3",
  "Drone",
  "Cam360",
  "Car"
];
for (let i in equipmentList) {
  let name = equipmentList[i];
  item[name] = new item(equipmentList[i]);
}

//People
let peopleList = [
  "Carlos Velasco",
  "Daniel Åberg",
  "Malin Melén",
  "Johanna Stedt",
  "Mia Kristersson",
  "Peter Ovgren",
  "Laura Parsons",
  "Jimena Castillo",
  "Elena Bazhenova",
  "Per-Inge Persson",
  "Mats Sjöberg",
  "Svarrer Cornelius",
  "Helen Thorn Jönsson",
  "Freddy Kristensson"
];

for (let i in peopleList) {
  let name = peopleList[i];
  person[name] = new person(peopleList[i]);
}
// Checkouts
new checkOut(person["Daniel Åberg"], item["Cam360"], Date.now());
person;

new checkOut(person["Carlos Velasco"], item["GoPro1"], Date.now());

new checkIn(item["GoPro1"]);
new checkOut(person["Carlos Velasco"], item["GoPro1"], Date.now());

new checkIn(item["Cam360"]);
person;
People;
Log;
ItemsIn;
ItemsOut;
let answer = person["Carlos Velasco"].itemsCheckedOut;
answer;
