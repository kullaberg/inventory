let ItemsIn = new Set();
let AllItems = new Set();

/**
 * Creates an instance of item.
 * @param {string} [itemParams=['Name', 'Model', 1]]
 * @param {any} location
 * @memberof item
 */
class item {
  constructor(itemParams = ["Name", "Model", "Type", "Location", 1]) {
    this.brand = itemParams[0];
    this.model = itemParams[1];
    this.type = itemParams[2];
    this.location = itemParams[3];
    this.idNumber = itemParams[4];
    this.description = `${this.brand} ${this.model} ${this.type} #${
      this.idNumber
    }`;
    this.name = `${this.brand}${this.idNumber}`;
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
      item.button = `<a onclick="window.item['${
        this.name
      }'].checkOut()" id="button${
        this.name
      }" class="btn-floating btn-large halfway-fab purple lighten-1 scale-transition">
      <i class="material-icons large">playlist_add</i>
    </a > `;
    } else if (window.userName === this.checkedOut.by) {
      item.button = `<a onclick="window.item['${
        this.name
      }'].checkIn()" id="button${
        this.name
      }" class="btn-floating btn-large halfway-fab orange lighten-1 scale-transition" >
      <i class="material-icons large">undo</i>
    </a > `;
    } else {
      item.button = `<a id="button${
        this.name
      }" class="btn-floating btn-large halfway-fab disabled purple lighten-1 scale-transition" >
      <i class="material-icons large">playlist_add</i>
    </a > `;
    }
    let htmlContent = `<div id="${this.name}" class="col s12 m6 l3">
      <div class="card">
        <div class="card-image">
          ${
            !this.photo
              ? '<div class="blue lighten-2 display"></div>'
              : this.photo
          }
          <span class="card-title title">${this.brand} ${this.type}</span>
          ${item.button}
        </div>
        <div class="card-content grey-text text-lighten description">
          <p>${this.description}</p>
        </div>
        <div class="card-action">
          ${
            this.checkedOut
              ? '<div class="chip">' +
                this.checkedOut.by +
                "</div>" +
                '<div class="chip">' +
                new Date(this.checkedOut.time).toLocaleDateString() +
                "</div>"
              : '<div class="chip">' + this.location + "</div>"
          }
        </div>
      </div>
</div > `;

    return htmlContent;
  }

  cardRender() {
    let domButton = document.getElementById("button" + this.name);
    domButton.classList.remove("scale-in");
    domButton.classList.add("scale-out");
    let domElement = document.getElementById(this.name);
    setTimeout(() => {
      domElement.outerHTML = this.cardHtml();
      let domButton = document.getElementById("button" + this.name);
      domButton.classList.add("scale-out");
      setTimeout(() => {
        domButton.classList.add("scale-in");
      }, 100);
    }, 100);
  }

  checkOut(user = window.userName) {
    new checkOut(person[user], window.item[this.name]);
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
  /**
   * Creates an instance of checkOut.
   * @param {any} personArg
   * @param {any} itemArg
   * @memberof checkOut
   */
  constructor(personArg, itemArg) {
    if (ItemsIn.has(itemArg)) {
      itemArg.checkedOut = {
        by: personArg.name,
        time: Date.now()
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
  /**
   * Creates an instance of checkIn.
   * @param {any} itemArg
   * @memberof checkIn
   */
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
(function() {
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
    "Cornelius Svarrer",
    "Helen Thorn Jönsson",
    "Freddy Kristensson"
  ];

  let nameFound = false;

  while (!nameFound) {
    window.userName = window.prompt(
      "Hej! What is your name? (You can also use my name as a test.)",
      "Carlos Velasco"
    );
    nameFound = peopleList.includes(window.userName);
  }

  for (let i in peopleList) {
    let name = peopleList[i];
    person[name] = new person(peopleList[i]);
  }
})();

// Populate Equipment
(function() {
  let equipmentList = [
    ["GoPro", "Hero 3+", "Camera", "Naturum Loft", 1],
    ["GoPro", "Hero 3+", "Camera", "Naturum Loft", 2],
    ["GoPro", "Hero 3+", "Camera", "Naturum Loft", 3],
    ["DJI", "Phantom 3 4K", "Drone", "Naturum Loft", 1],
    ["Nikon", "Keymission 360", "Camera", "Naturum Loft", 1],
    ["Opel", "White", "Car", "Naturum Parkering", 1],
    ["Opel", "White", "Car", "Förvaltning Parkering", 2],
    ["Opel", "White", "Car", "Förvaltning Parkering", 3],
    ["Yosemite", "MTB", "eBike", "Förvaltning", 1],
    ["Yosemite", "MTB", "eBike", "Förvaltning", 2],
    ["Yosemite", "MTB", "eBike", "Förvaltning", 3],
    ["Yosemite", "Road", "eBike", "Naturum Pannrum", 4],
    ["FatTire", "MTB", "eBike", "Naturum Pannrum", 1],
    ["Segway", "X2 SE", "All-Terrain Scooter", "Naturum Pannrum", 1]
  ];
  for (let i in equipmentList) {
    let name = equipmentList[i][0] + equipmentList[i][4];
    item[name] = new item(equipmentList[i]);
  }
})();

window.item = item;
// Populate DOM
(function() {
  let equipmentDiv = document.getElementById("equipment");
  let htmlContent = ``;
  AllItems.forEach(item => (htmlContent += item.cardHtml()));
  equipmentDiv.innerHTML = htmlContent;
})();

window.item["Yosemite1"].checkOut("Carlos Velasco");
window.item["Yosemite2"].checkOut("Cornelius Svarrer");
window.item["GoPro3"].checkOut("Daniel Åberg");
window.item["Nikon1"].checkOut("Daniel Åberg");
window.item["Opel3"].checkOut("Daniel Åberg");
