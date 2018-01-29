// MongoDB
// const stitch = require("mongodb-stitch");
// const mongoDbClient = new stitch.StitchClient("inventorykstitch-cwlil");
// const dbPopulate = mongoDbClient
//   .service("mongodb", "mongodb-atlas")
//   .db("Populate");

let AllItems = new Set();

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
        time: Date.now()
      }
    ]
  ) {
    this.brand = itemParams[0];
    this.model = itemParams[1];
    this.type = itemParams[2];
    this.location = itemParams[3];
    this.idNumber = itemParams[4];
    this.Log = log;
    this.description = `${this.brand} ${this.model} ${this.type} #${
      this.idNumber
    }`;
    this.name = `${this.brand}${this.idNumber}`;
    switch (this.type) {
      case "Vehicle":
        this.photo = `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">directions_car</i></div>`;
        break;
      case "Bike":
        this.photo = `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">directions_bike</i></div>`;
        break;
      case "Bed":
        this.photo = `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">hotel</i></div>`;
        break;
      case "Room":
        this.photo = `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">forum</i></div>`;
        break;
      case "Office":
        this.photo = `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">work</i></div>`;
        break;
      case "Camera":
        this.photo = `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">photo_camera</i></div>`;
        break;

      default:
        break;
    }
    this.type;
    AllItems.add(this);
  }

  cardHtml() {
    let item = {};

    if (
      this.Log[0].by === "Initial Log Record" ||
      !this.Log[0].checkIn === false
    ) {
      item.button = `<a onclick="window.item['${
        this.name
      }'].checkOut()" id="button${
        this.name
      }" class="btn-floating btn-large halfway-fab waves-effect waves-light purple lighten-1 scale-transition">
      <i class="material-icons large">assignment</i>
    </a> `;
    } else if (window.userName === this.Log[0].by) {
      item.button = `<a onclick="window.item['${
        this.name
      }'].checkIn()" id="button${
        this.name
      }" class="btn-floating btn-large halfway-fab waves-effect waves-light orange lighten-1 scale-transition">
      <i class="material-icons large">assignment_turned_in</i>
    </a>`;
    } else if (window.userName !== this.Log[0].by) {
      item.button = `<a id="button${
        this.name
      }" class="btn-floating btn-large halfway-fab disabled purple waves-effect waves-light lighten-1 scale-transition">
      <i class="material-icons large">lock</i>
    </a>`;
    }
    let htmlContent = `<div id="${this.name}" class="col s12 m6 l3">
  <div class="card">
    <div class="card-image">
      ${
        !this.photo
          ? `<div class="blue lighten-2 display"></div>`
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
        this.Log[0].checkOut
          ? `<div class="chip activator pointer"><i class="material-icons checks ">assignment_ind</i> ${
              this.Log[0].by
            } ${new Date(this.Log[0].time).toLocaleDateString()} </div>`
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

  readLog() {
    let content = "";
    this.Log.forEach(function(item) {
      if (item.checkOut) {
        content +=
          '<div class="chip purple lighten-2 white-text"><i class="material-icons checks">assignment</i> ';
      } else if (item.checkIn) {
        content +=
          '<div class="chip orange lighten-2 white-text"><i class="material-icons checks">assignment_turned_in</i> ';
      } else if (item.by === "Initial Log Record") {
        content +=
          '<div class="chip blue lighten-2 white-text"><i class="material-icons checks">add_circle</i> ';
      }
      content += `${item.by} ${new Date(
        item.time
      ).toLocaleDateString()} </div>
      `;
    });
    return content;
  }

  checkOut(user) {
    let checkOut = {
      checkOut: {},
      by: user || window.userName,
      time: Date.now()
    };
    this.Log.unshift(checkOut);
    this.cardRender();
  }

  checkIn(user) {
    let checkIn = {
      checkIn: {},
      by: user || window.userName,
      time: Date.now()
    };
    this.Log.unshift(checkIn);
    this.cardRender();
  }
}

let People = new Set();
class person {
  constructor(name) {
    this.name = name;
    People.add(this);
  }
}

// Populate People
(function() {
  // let peopleList = {};
  // mongoDbClient
  //   .login()
  //   .then(() =>
  //     dbPopulate
  //       .collection("People")
  //       .find("peopleList")
  //       .limit(100)
  //       .execute()
  //   )
  //   .then(docs => {
  //     peopleList = docs;
  //     console.log("Found docs", docs);
  //     console.log("[MongoDB Stitch] Connected to Stitch");
  //   })
  //   .catch(err => {
  //     console.error(err);
  //   });

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
  // mongoDbClient
  //   .login()
  //   .then(() =>
  //     dbPopulate.collection("People").updateOne(
  //       { owner_id: mongoDbClient.authedId() },
  //       { peopleList },
  //       {
  //         upsert: true
  //       }
  //     )
  //   )
  //   .catch(err => {
  //     console.error(err);
  //   });
  window.userName = window.localStorage.getItem("userName");

  let nameFound = peopleList.includes(window.userName);

  while (!nameFound) {
    window.userName = window.prompt(
      "Hej! What is your name?",
      "Your first and last name"
    );
    nameFound = peopleList.includes(window.userName);
    if (nameFound) {
      window.localStorage.setItem("userName", window.userName);
    }
  }

  for (let i in peopleList) {
    let name = peopleList[i];
    person[name] = new person(peopleList[i]);
  }
})();

// Populate Equipment
(function() {
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

  // let equipmentList;

  // mongoDbClient
  //   .login()
  //   .then(() =>
  //     dbPopulate
  //       .collection("Items")
  //       .find({ equipmentList })
  //       .limit(100)
  //       .execute()
  //   )
  //   .then(docs => {
  //     equipmentList = docs;
  //     console.log("Found docs", docs);
  //     console.log("[MongoDB Stitch] Connected to Stitch");
  //   })
  //   .catch(err => {
  //     console.error(err);
  //   });

  for (let i in equipmentList) {
    let name = equipmentList[i][0] + equipmentList[i][4];
    item[name] = new item(equipmentList[i]);
  }
})();

window.item = item;
// Populate DOM
(function() {
  let listDiv = document.getElementById("list");

  let productionCameraContent = ``;
  let spacesBedContent = ``;
  let spacesRoomContent = ``;
  let transportBikeContent = ``;
  let transportVehicleContent = ``;
  AllItems.forEach(item => {
    switch (item.type) {
      case "Vehicle":
        transportVehicleContent += item.cardHtml();
        break;
      case "Bike":
        transportBikeContent += item.cardHtml();
        break;
      case "Bed":
        spacesBedContent += item.cardHtml();
        break;
      case "Room":
        spacesRoomContent += item.cardHtml();
        break;
      case "Office":
        spacesRoomContent += item.cardHtml();
        break;
      case "Camera":
        productionCameraContent += item.cardHtml();
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
})();

window.item["Yosemite1"].checkOut("Carlos Velasco");
window.item["Yosemite2"].checkOut("Cornelius Svarrer");
window.item["GoPro3"].checkOut("Daniel Åberg");
window.item["Nikon1"].checkOut("Daniel Åberg");
window.item["Opel3"].checkOut("Daniel Åberg");
