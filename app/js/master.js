const M = require("./../../node_modules/materialize-css/dist/js/materialize");

const AllItems = new Set();

// MongoDB

const stitch = require("mongodb-stitch");

const clientPromise = stitch.StitchClientFactory.create(
  "inventorykstitch-cwlil"
);

class Item {
  constructor(
    itemParams = ["Name", "Model", "Type", "Location", 1],
    log = [
      {
        by: "Initial Log Record",
        dateOut: Date.parse("1 / 1 / 2017"),
        dateIn: Date.parse("1 / 2 / 2017")
      }
    ]
  ) {
    this.brand = itemParams[0];
    this.model = itemParams[1];
    this.type = itemParams[2];
    this.location = itemParams[3];
    this.idNumber = itemParams[4];
    this.Log = log;
    this._id = `${this.brand}${this.idNumber}`;
    AllItems.add(this);
  }

  description() {
    return `${this.brand} ${this.model} ${this.type} #${this.idNumber}`;
  }
  name() {
    return `${this.brand}${this.idNumber}`;
  }

  photo() {
    let photo = ``;
    switch (this.type) {
      case "Vehicle":
        photo = `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">directions_car</i></div>`;
        break;
      case "Bike":
        photo = `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">directions_bike</i></div>`;
        break;
      case "Bed":
        photo = `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">hotel</i></div>`;
        break;
      case "Room":
        photo = `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">forum</i></div>`;
        break;
      case "Office":
        photo = `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">work</i></div>`;
        break;
      case "Camera":
        photo = `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">photo_camera</i></div>`;
        break;
      default:
        photo = ``;
        break;
    }
    return photo;
  }

  get available() {
    const dateArray = [
      Date.parse(document.getElementById("dateOut").value),
      Date.parse(document.getElementById("dateIn").value)
    ];
    const reservationsArray = this.Log;

    let available = true;
    reservationsArray.forEach(dateRange => {
      if (
        (dateArray[0] >= dateRange.dateOut &&
          dateArray[0] <= dateRange.dateIn) ||
        (dateArray[1] >= dateRange.dateOut &&
          dateArray[1] <= dateRange.dateIn) ||
        (dateArray[0] <= dateRange.dateOut && dateArray[1] >= dateRange.dateIn)
      ) {
        available = false;
      } else if (dateArray[1] <= dateArray[0]) {
        available = false;
      }
    });
    return available;
  }

  cardHtml() {
    let button = ``;
    const itemName = this.name();
    const itemPhoto = this.photo();
    const itemDescription = this.description();
    if (!window.userName) {
      window.userName = window.localStorage.getItem("userName");
    }
    if (this.available === true) {
      button = `<a onclick="window.Item['${itemName}'].reserve()" id="button${itemName}" class="btn-floating btn-large halfway-fab waves-effect waves-light purple lighten-1 scale-transition">
      <i class="material-icons large">assignment</i>
    </a> `;
    } else if (window.userName === this.Log[0].by && this.available === false) {
      button = `<a id="button${itemName}" onclick="window.Item['${itemName}'].removeRecord()" class="btn-floating btn-large halfway-fab purple lighten-4 scale-transition">
      <i class="material-icons large">lock</i>
    </a>`;
    } else {
      button = `<a id="button${itemName}" class="btn-floating btn-large halfway-fab disabled lighten-2 scale-transition">
      <i class="material-icons large">lock</i>
    </a>`;
    }
    const dateOut = new Date(
      parseInt(this.Log[0].dateOut, 10)
    ).toLocaleDateString();
    const dateIn = new Date(
      parseInt(this.Log[0].dateIn, 10)
    ).toLocaleDateString();

    const htmlContent = `<div id="${itemName}" class="col s12 m6 l3">
  <div class="card">
    <div class="card-image">
      ${!itemPhoto ? `<div class="blue lighten-2 display"></div>` : itemPhoto}
      <span class="card-title title">${this.brand} ${this.type}</span>
      ${button}
    </div>
    <div class="card-content grey-text text-lighten description">
      <p>${itemDescription}</p>
    </div>

    <div class="card-action">
      ${
        !this.available
          ? `<div class="chip activator pointer"><i class="material-icons checks ">assignment_ind</i> ${
              this.Log[0].by
            } ${dateOut} - ${dateIn}</div>`
          : `<div class="chip activator pointer">@ ${this.location}</div>`
      }
    </div>
    <div class="card-reveal white">
      <span class="card-title grey-text lighten-4">${this.brand} ${
      this.type
    } Log
        <i class="material-icons right">close</i>
      </span>
      <p>${this.readLog()}</p>
    </div>
  </div>
</div>
`;

    return htmlContent;
  }

  cardRender() {
    const itemName = this.name();
    let domButton = document.getElementById(`button${itemName}`);
    domButton.classList.remove("scale-out");
    domButton.classList.remove("scale-in");
    domButton.classList.add("scale-out");
    const domElement = document.getElementById(itemName);
    setTimeout(() => {
      if (domElement.outerHTML.length > 3) {
        domElement.outerHTML = this.cardHtml();
        domButton = document.getElementById(`button${itemName}`);
        domButton.classList.add("scale-out");
        setTimeout(() => {
          domButton.classList.add("scale-in");
        }, 100);
      }
    }, 80);
  }

  readLog() {
    let content = "";
    this.Log.forEach(entry => {
      const dateOut = new Date(
        parseInt(entry.dateOut, 10)
      ).toLocaleDateString();
      const dateIn = new Date(parseInt(entry.dateIn, 10)).toLocaleDateString();
      if (entry.dateOut && entry.dateIn) {
        content +=
          '<div class="chip purple lighten-2 white-text"><i class="material-icons checks">assignment</i> ';
      } else if (!entry.dateOut) {
        content +=
          '<div class="chip orange lighten-2 white-text"><i class="material-icons checks">assignment_turned_in</i> ';
      } else if (entry.by === "Initial Log Record") {
        content +=
          '<div class="chip blue lighten-2 white-text"><i class="material-icons checks">add_circle</i> ';
      }
      content += `${entry.by} ${dateOut} - ${dateIn} </div>
      `;
    });
    return content;
  }

  reserve(user) {
    if (this.available) {
      let dateOut = Date.parse(document.getElementById("dateOut").value);
      if (Number.isNaN(dateOut)) {
        dateOut = Date.now();
      }
      let dateIn = Date.parse(document.getElementById("dateIn").value);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 360);
      if (Number.isNaN(dateIn)) {
        dateIn = Date.parse(tomorrow);
      }
      const reservation = {
        by: user || window.userName,
        dateOut,
        dateIn
      };
      this.Log.unshift(reservation);
      this.cardRender();
      clientPromise.then(client => {
        const db = client.service("mongodb", "mongodb-atlas").db("Populate");
        client
          .login()
          .then(() =>
            db
              .collection("Items")
              .updateOne({ _id: this._id }, { $set: { Log: this.Log } })
          );
        // .then(result => {
        //   console.log("[Updated]", result);
        // });
      });
    }
  }

  checkOut(user) {
    let dateOut = Date.parse(document.getElementById("dateOut").value);
    if (Number.isNaN(dateOut)) {
      dateOut = Date.now();
    }
    const checkOut = {
      by: user || window.userName,
      dateOut
    };
    this.Log.unshift(checkOut);
    this.cardRender();
  }

  checkIn(user) {
    let dateIn = Date.parse(document.getElementById("dateIn").value);
    if (Number.isNaN(dateIn)) {
      dateIn = Date.now();
    }
    const checkIn = {
      by: user || window.userName,
      dateIn
    };
    this.Log.unshift(checkIn);
    this.cardRender();
  }

  removeRecord() {
    if (this.Log[0].by === window.userName) {
      this.Log.shift();
      clientPromise.then(client => {
        const db = client.service("mongodb", "mongodb-atlas").db("Populate");
        client
          .login()
          .then(() =>
            db
              .collection("Items")
              .updateOne({ _id: this._id }, { $set: { Log: this.Log } })
          )
          .then(() => {
            // console.log("[Removed]", result);
            this.cardRender();
          });
      });
    }
  }
}

const refreshItems = function refreshItems() {
  AllItems.forEach(card => {
    card.cardRender();
  });
};

const buildItems = function populateItems() {
  const listDiv = document.getElementById("list");

  let productionCameraContent = ``;
  let spacesBedContent = ``;
  let spacesRoomContent = ``;
  let transportBikeContent = ``;
  let transportVehicleContent = ``;
  AllItems.forEach(resource => {
    switch (resource.type) {
      case "Bike":
        transportBikeContent += resource.cardHtml();
        break;
      case "Bed":
        spacesBedContent += resource.cardHtml();
        break;
      case "Vehicle":
        transportVehicleContent += resource.cardHtml();
        break;
      case "Room":
        spacesRoomContent += resource.cardHtml();
        break;
      case "Camera":
        productionCameraContent += resource.cardHtml();
        break;
      case "Office":
        spacesRoomContent += resource.cardHtml();
        break;

      default:
        break;
    }
  });
  listDiv.innerHTML =
    spacesRoomContent +
    spacesBedContent +
    transportBikeContent +
    transportVehicleContent +
    productionCameraContent;
};

const People = new Set();
class Person {
  constructor(name) {
    this.name = name;
    People.add(this);
  }
}

// Populate People
(function populatePeople() {
  clientPromise.then(client => {
    const db = client.service("mongodb", "mongodb-atlas").db("Populate");
    client
      .login()
      .then(() =>
        db
          .collection("People")
          .find()
          .limit(1)
          .execute()
      )
      .then(docs => {
        // console.log("[Found People]", docs[0]);
        if (window.localStorage.length > 0) {
          window.userName = window.localStorage.getItem("userName");
        }

        let nameFound = docs[0].peopleList.includes(window.userName);
        // let nameFound = true;

        while (!nameFound) {
          window.userName = window.prompt(
            "Hej! What is your name?",
            "Your first and last name"
          );
          nameFound = docs[0].peopleList.includes(window.userName);
          if (nameFound) {
            window.localStorage.setItem("userName", window.userName);
          }
        }
        const peopleListKeys = Object.keys(docs[0].peopleList);
        for (const i of peopleListKeys) {
          const name = docs[0].peopleList[i];
          Person[name] = new Person(docs[0].peopleList[i]);
        }
      });
    // .catch(err => {
    //   console.error(err);
    // })
  });

  // let peopleList = [
  //   "Carlos Velasco",
  //   "Daniel Åberg",
  //   "Malin Melén",
  //   "Johanna Stedt",
  //   "Mia Kristersson",
  //   "Peter Ovgren",
  //   "Laura Parsons",
  //   "Jimena Castillo",
  //   "Elena Bazhenova",
  //   "Per-Inge Persson",
  //   "Mats Sjöberg",
  //   "Cornelius Svarrer",
  //   "Helen Thorn Jönsson",
  //   "Freddy Kristensson"
  // ];
})();

const findItems = function findItems() {
  clientPromise.then(client => {
    const db = client.service("mongodb", "mongodb-atlas").db("Populate");
    client
      .login()
      .then(() =>
        db
          .collection("Items")
          .find()
          .sort({ type: 1 })
          .execute()
      )
      .then(foundItems => {
        const a = window.a || JSON.stringify(foundItems).length;
        const b = JSON.stringify(foundItems).length;
        const same = Object.is(a, b);
        // console.log("[Similar]", same);
        if (same === false || !window.a) {
          window.a = a;
          // console.log("[Found Items]", foundItems);
          AllItems.clear();

          const itemsFound = Object.keys(foundItems);
          for (const i of itemsFound) {
            if (foundItems.hasOwnProperty(i)) {
              const name = foundItems[i]._id;
              Item[name] = new Item(
                [
                  foundItems[i].brand,
                  foundItems[i].model,
                  foundItems[i].type,
                  foundItems[i].location,
                  foundItems[i].idNumber
                ],
                foundItems[i].Log
              );
            }
          }
          // if (!window.item) {
          window.Item = Item;
          buildItems();
          // } else {
          //   refreshItems();
          // }
        }
      });
  });
};

// Navbar
(function makeNavbar(window, document) {
  document.getElementById("header").classList.remove("hide");
  const dateOut = document.getElementById("dateOut");
  const dateIn = document.getElementById("dateIn");

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const options1 = {
    format: "ddd mmm dd yyyy",
    minDate: today,
    container: "body"
  };
  const options2 = {
    format: "ddd mmm dd yyyy",
    minDate: tomorrow,
    container: "body"
  };
  const instance1 = M.Datepicker.init(dateOut, options1);
  const instance2 = M.Datepicker.init(dateIn, options2);
  dateOut.value = today.toDateString();
  dateIn.value = tomorrow.toDateString();
  instance1.setDate(new Date(today));
  instance2.setDate(new Date(tomorrow));
  dateOut.addEventListener(
    "change",
    () => {
      refreshItems();
    },
    false
  );
  dateIn.addEventListener(
    "change",
    () => {
      refreshItems();
    },
    false
  );
})(window, document);

document.addEventListener("focus", () => findItems(), false);

setInterval(() => {
  // body
  // if (document.hasFocus()) {
  findItems();
  // }
}, 5000);
