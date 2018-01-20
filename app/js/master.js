let ItemsIn = new Set();
let AllItems = new Set();
class item {
  constructor(name, location) {
    this.name = name;
    this.location = location;
    this.returned = {
      by: "new item",
      timeStamp: Date.now()
    };

    ItemsIn.add(this);
    AllItems.add(this);
  }

  cardHtml() {
    let item = {};

    if (!this.returned === false) {
      item.button = `<a onclick="window.item['${this.name}'].checkOut()" id="button${this.name}" class="btn-floating halfway-fab waves-effect waves-light purple lighten-1">
      <i class="material-icons">playlist_add</i>
    </a>`;
    } else {
      item.button = `<a onclick="window.item['${this.name}'].checkIn()" id="button${this.name}" class="btn-floating halfway-fab waves-effect waves-light orange lighten-1">
      <i class="material-icons">undo</i>
    </a>`;
    }
    let htmlContent =
      `<div id="${this.name}">
  <div class="col s12 m6 l3">
    <div class="card"> 
    <div class="card-image">
      ${(!this.photo ? '<div class="blue lighten-2 display"></div>' : this.photo)}
        <span class="card-title title">${this.name}</span>
        ${item.button}
        </div>
      <div class="card-content">
      <p>
      ${(this.checkedOut ? '<div class="chip">' + this.checkedOut.by + '</div>' + '<div class="chip">' + new Date(this.checkedOut.nextAvailable).toLocaleDateString() + '</div>' : '<div class="chip">' + this.location + '</div>')}
      </p>
      </div>
    </div>
  </div>
</div> `

    return htmlContent;
  }

  cardRender() {
    let domElement = document.getElementById(this.name)
    domElement.outerHTML = this.cardHtml();
    // let button = document.getElementById('button' + this.name)
    // if (this.returned) {
    //   button.addEventListener('click', window.item[this.name].checkOut)
    //   // button.addEventListener('click', this.checkOut)
    // } else {
    //   button.addEventListener('click', window.item[this.name].checkIn)
    // }
  }

  checkOut(user = window.userName) {
    new checkOut(person[user], window.item[this.name], Date.now());
  }

  checkIn() {
    new checkIn(window.item[this.name]);
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
    itemArg.cardRender();
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
    itemArg.cardRender();
    this.timeStamp = Date.now();
    Log.add(this);
  }
}


// Pupulate People
(function () {

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

  let nameFound = false;

  while (!nameFound) {
    window.userName = window.prompt('Hej! What is your name?', 'First Last');
    nameFound = peopleList.includes(window.userName);
  }


  for (let i in peopleList) {
    let name = peopleList[i];
    person[name] = new person(peopleList[i]);
  }
})();

// Populate Equipment
(function () {
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
    item[name] = new item(equipmentList[i], 'Naturum');
  }
})();

window.item = item;
// Populate DOM
(function () {
  let equipmentDiv = document.getElementById("equipment");
  let htmlContent = ``;
  AllItems.forEach(
    item =>
      (htmlContent += item.cardHtml())
  );
  equipmentDiv.innerHTML = htmlContent;
})();


// Checkouts
item["Cam360"].checkOut("Daniel Åberg");
item["Drone"].checkOut("Daniel Åberg");
item["GoPro1"].checkOut('Carlos Velasco');
item["GoPro3"].checkOut('Carlos Velasco');

item["GoPro1"].checkIn();


