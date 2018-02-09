
// Populate Equipment
const populateItems = function () {
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
    AllItems.forEach(function (item) {
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
