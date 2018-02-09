let AllItems = new Set();

// MongoDB

const stitch = require("mongodb-stitch");
const clientPromise = stitch.StitchClientFactory.create(
  "inventorykstitch-cwlil"
);

class item {
  /**
   * Creates an instance of item.
   * @param {string} [itemParams=["Name", "Model", "Type", "Location", 1]]
   * @param {string} [log=[
   *       {
   *         by: "Initial Log Record",
   *         time: Date.now()
   *       }
   *     ]]
   * @memberof item
   */
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
    switch (this.type) {
      case "Vehicle":
        return `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">directions_car</i></div>`;
      case "Bike":
        return `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">directions_bike</i></div>`;
      case "Bed":
        return `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">hotel</i></div>`;
      case "Room":
        return `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">forum</i></div>`;
      case "Office":
        return `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">work</i></div>`;
      case "Camera":
        return `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">photo_camera</i></div>`;

      default:
        break;
    }
  }

  get available() {
    let dateArray = [
      Date.parse(document.getElementById("dateOut").value),
      Date.parse(document.getElementById("dateIn").value)
    ];
    let reservationsArray = this.Log;

    let available = true;
    reservationsArray.forEach(dateRange => {
      if (
        (dateArray[0] >= dateRange.dateOut &&
          dateArray[0] <= dateRange.dateIn) ||
        (dateArray[1] >= dateRange.dateOut &&
          dateArray[1] <= dateRange.dateIn) ||
        (dateArray[0] <= dateRange.dateOut &&
          dateArray[1] >= dateRange.dateIn)
      ) {
        available = false;
      } else if (dateArray[1] <= dateArray[0]) {
        available = false;
      }
    });
    return available;
  }

  cardHtml() {
    let item = {};
    let itemName = this.name();
    let itemPhoto = this.photo();
    let itemDescription = this.description();
    if (!window.userName) {
      window.userName = window.localStorage.getItem("userName");
    }
    if (this.available === true) {
      item.button = `<a onclick="window.item['${itemName}'].reserve()" id="button${itemName}" class="btn-floating btn-large halfway-fab waves-effect waves-light purple lighten-1 scale-transition">
      <i class="material-icons large">assignment</i>
    </a> `;
    } else if (
      window.userName === this.Log[0].by &&
      this.available === false
    ) {
      item.button = `<a id="button${itemName}" onclick="window.item['${itemName}'].removeRecord()" class="btn-floating btn-large halfway-fab purple lighten-4 scale-transition">
      <i class="material-icons large">lock</i>
    </a>`;
    } else {
      item.button = `<a id="button${itemName}" class="btn-floating btn-large halfway-fab disabled lighten-2 scale-transition">
      <i class="material-icons large">lock</i>
    </a>`;
    }
    let dateOut = new Date(
      parseInt(this.Log[0].dateOut)
    ).toLocaleDateString();
    let dateIn = new Date(
      parseInt(this.Log[0].dateIn)
    ).toLocaleDateString();

    let htmlContent = `<div id="${itemName}" class="col s12 m6 l3">
  <div class="card">
    <div class="card-image">
      ${
        !itemPhoto
          ? `<div class="blue lighten-2 display"></div>`
          : itemPhoto
      }
      <span class="card-title title">${this.brand} ${this.type}</span>
      ${item.button}
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
    let itemName = this.name();
    let domButton = document.getElementById("button" + itemName);
    domButton.classList.remove("scale-out");
    domButton.classList.remove("scale-in");
    domButton.classList.add("scale-out");
    let domElement = document.getElementById(itemName);
    setTimeout(() => {
      if (domElement.outerHTML.length > 3) {
        domElement.outerHTML = this.cardHtml();
        let domButton = document.getElementById("button" + itemName);
        domButton.classList.add("scale-out");
        setTimeout(() => {
          domButton.classList.add("scale-in");
        }, 100);
      }
    }, 100);
  }

  readLog() {
    let content = "";
    this.Log.forEach(function(item) {
      let dateOut = new Date(parseInt(item.dateOut)).toLocaleDateString();
      let dateIn = new Date(parseInt(item.dateIn)).toLocaleDateString();
      if (item.dateOut && item.dateIn) {
        content +=
          '<div class="chip purple lighten-2 white-text"><i class="material-icons checks">assignment</i> ';
      } else if (!item.dateOut) {
        content +=
          '<div class="chip orange lighten-2 white-text"><i class="material-icons checks">assignment_turned_in</i> ';
      } else if (item.by === "Initial Log Record") {
        content +=
          '<div class="chip blue lighten-2 white-text"><i class="material-icons checks">add_circle</i> ';
      }
      content += `${item.by} ${dateOut} - ${dateIn} </div>
      `;
    });
    return content;
  }

  reserve(user) {
    if (this.available) {
      let dateOut = Date.parse(document.getElementById("dateOut").value);
      if (isNaN(dateOut)) {
        dateOut = Date.now();
      }
      let dateIn = Date.parse(document.getElementById("dateIn").value);
      let tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 360);
      if (isNaN(dateIn)) {
        dateIn = Date.parse(tomorrow);
      }
      let reservation = {
        by: user || window.userName,
        dateOut: dateOut,
        dateIn: dateIn
      };
      this.Log.unshift(reservation);
      this.cardRender();
      clientPromise.then(client => {
        const db = client
          .service("mongodb", "mongodb-atlas")
          .db("Populate");
        client
          .login()
          .then(() =>
            db
              .collection("Items")
              .updateOne({ _id: this._id }, { $set: { Log: this.Log } })
          )
          .then(result => {
            console.log("[Updated]", result);
          });
      });
    }
  }

  checkOut(user) {
    let dateOut = Date.parse(document.getElementById("dateOut").value);
    if (isNaN(dateOut)) {
      dateOut = Date.now();
    }
    let checkOut = {
      by: user || window.userName,
      dateOut: dateOut
    };
    this.Log.unshift(checkOut);
    this.cardRender();
  }

  checkIn(user) {
    let dateIn = Date.parse(document.getElementById("dateIn").value);
    if (isNaN(dateIn)) {
      dateIn = Date.now();
    }
    let checkIn = {
      by: user || window.userName,
      dateIn: dateIn
    };
    this.Log.unshift(checkIn);
    this.cardRender();
  }

  removeRecord() {
    if (this.Log[0].by === window.userName) {
      this.Log.shift();
      clientPromise.then(client => {
        const db = client
          .service("mongodb", "mongodb-atlas")
          .db("Populate");
        client
          .login()
          .then(() =>
            db
              .collection("Items")
              .updateOne({ _id: this._id }, { $set: { Log: this.Log } })
          )
          .then(result => {
            console.log("[Removed]", result);
            this.cardRender();
          });
      });
    }
  }
}

const refreshItems = function() {
  AllItems.forEach(item => {
    item.cardRender();
  });
};

const buildItems = function() {
  let listDiv = document.getElementById("list");

  let productionCameraContent = ``;
  let spacesBedContent = ``;
  let spacesRoomContent = ``;
  let transportBikeContent = ``;
  let transportVehicleContent = ``;
  AllItems.forEach(item => {
    switch (item.type) {
      case "Bike":
        transportBikeContent += item.cardHtml();
        break;
      case "Bed":
        spacesBedContent += item.cardHtml();
        break;
      case "Vehicle":
        transportVehicleContent += item.cardHtml();
        break;
      case "Room":
        spacesRoomContent += item.cardHtml();
        break;
      case "Camera":
        productionCameraContent += item.cardHtml();
        break;
      case "Office":
        spacesRoomContent += item.cardHtml();
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

let People = new Set();
class person {
  constructor(name) {
    this.name = name;
    People.add(this);
  }
}

// Populate People
(function(window) {
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
        console.log("[Found People]", docs[0]);
        console.log("[MongoDB Stitch] Connected to Stitch");
        window.userName = window.localStorage.getItem("userName");

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

        for (let i in docs[0].peopleList) {
          let name = docs[0].peopleList[i];
          person[name] = new person(docs[0].peopleList[i]);
        }
      })
      .catch(err => {
        console.error(err);
      });
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
})(window);

// Populate Equipment
const populateItems = function() {
  let equipmentList = [
    ["DJI", "Phantom 3 4K Drone", "Camera", "Naturum Loft", 1],
    ["Nikon", "Keymission 360", "Camera", "Naturum Loft", 1],
    ["GoPro", "Hero 3+", "Camera", "Naturum Loft", 1],
    ["GoPro", "Hero 3+", "Camera", "Naturum Loft", 2],
    ["GoPro", "Hero 3+", "Camera", "Naturum Loft", 3],
    ["Segway", "X2 SE Scooter", "Vehicle", "Naturum Pannrum", 1],
    ["Opel", "White Car", "Vehicle", "Naturum Parkering", 1],
    ["Opel", "White Car", "Vehicle", "Förvaltning Parkering", 2],
    ["Opel", "White Car", "Vehicle", "Förvaltning Parkering", 3],
    ["Golf", "Cart", "Vehicle", "Förvaltning Parkering", 1],
    ["Yosemite", "MTB eBike", "Bike", "Förvaltning", 1],
    ["Yosemite", "MTB eBike", "Bike", "Förvaltning", 2],
    ["Yosemite", "MTB eBike", "Bike", "Förvaltning", 3],
    ["Yosemite", "Road eBike", "Bike", "Naturum Pannrum", 4],
    ["FatTire", "MTB eBike", "Bike", "Naturum Pannrum", 1],
    ["Falknästet", "Conference", "Room", "Kullens Fyr", 1],
    ["Hans Perskrog", "Conference", "Room", "Naturum", 1],
    ["Porten", "Conference", "Room", "Naturum", 2],
    ["Kullanäsan", "Work", "Office", "Naturum", 1],
    ["Kulla Lå", "Work", "Office", "Naturum", 2],
    ["Lycktan", "Work", "Office", "Naturum", 3],
    ["Paradishamn", "Work", "Office", "Naturum", 4],
    ["Kringelberget", "Work", "Office", "Naturum", 5],
    ["Förvaltning", "Accomodation", "Bed", "Förvaltning", 1],
    ["Kullaljung", "Accomodation", "Bed", "Kullaljung stugan", 1],
    ["Kullaljung", "Accomodation", "Bed", "Kullaljung stugan", 2],
    ["Kullaljung", "Accomodation", "Bed", "Kullaljung stugan", 3],
    ["Kullaljung", "Accomodation", "Bed", "Kullaljung stugan", 4],
    ["Kullaljung", "Accomodation", "Bed", "Kullaljung stugan", 5],
    ["Kullaljung", "Accomodation", "Bed", "Kullaljung stugan", 6]
  ];
  for (let i in equipmentList) {
    let name = equipmentList[i][0] + equipmentList[i][4];
    item[name] = new item(equipmentList[i]);
  }

  window.item = item;
  buildItems();
  window.item["Yosemite1"].reserve("Carlos Velasco");
  window.item["Yosemite2"].reserve("Cornelius Svarrer");
  window.item["GoPro3"].reserve("Daniel Åberg");
  window.item["Nikon1"].reserve("Daniel Åberg");
  window.item["Opel3"].reserve("Daniel Åberg");
  let uploads = [];
  AllItems.forEach(function(item) {
    clientPromise.then(client => {
      const db = client
        .service("mongodb", "mongodb-atlas")
        .db("Populate");
      client
        .login()
        .then(() => db.collection("Items").insertOne(item))
        .then(result => {
          uploads.unshift(result);
        });
    });
  });
  console.log("[Uploaded]", uploads);
};

// populateItems();

const findItems = function() {
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
        const a = window.foundItems || foundItems;
        const b = foundItems;
        const b1 = new Set(b);
        const difference = [...new Set([...a].filter(x => !b1.has(x)))];
        console.log("[Difference]", difference);
        if ((difference.length = 0 || !window.foundItems)) {
          window.foundItems = foundItems;
          console.log("[Found Items]", foundItems);

          for (let i in foundItems) {
            let name = foundItems[i]["_id"];
            item[name] = new item(
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
          if (!window.item) {
            window.item = item;
            buildItems();
          } else {
            refreshItems();
          }
        } else {
          console.log("[No changes]");
        }
      });
  });
};

findItems();

// Navbar
(function(window, document) {
  document.getElementById("header").classList.remove("hide");
  let dateOut = document.getElementById("dateOut");
  let dateIn = document.getElementById("dateIn");
  let M = require("./../../node_modules/materialize-css/dist/js/materialize");
  let today = new Date();
  let tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  let options1 = {
    format: "ddd mmm dd yyyy",
    minDate: today,
    container: "body"
  };
  let options2 = {
    format: "ddd mmm dd yyyy",
    minDate: tomorrow,
    container: "body"
  };
  let instance1 = M.Datepicker.init(dateOut, options1);
  let instance2 = M.Datepicker.init(dateIn, options2);
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

setInterval(function() {
  // body
  if (document.hasFocus()) {
    findItems();
  }
}, 15000);
