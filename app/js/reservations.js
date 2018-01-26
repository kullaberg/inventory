let reservations = [];


reservations.unshift([Date.parse('9 / 1 / 2019'), Date.parse('12 / 3 / 2019'), 'Person Name']);
reservations.unshift([Date.parse('1 / 1 / 2019'), Date.parse('2 / 3 / 2019'), 'Person Name']);

function checkVacancy(dateArray = [Date.now(), Date.now()], reservationsArray) {
    let validity = true;
    reservationsArray.forEach((dateRange) => {
        if (dateArray[0] > dateRange[0] && dateArray[0] < dateRange[1]) {
            validity = false;
        } else if (dateArray[1] > dateRange[0] && dateArray[1] < dateRange[1]) {
            validity = false;
        }
    });
    return validity;
}
reservations
let valid = checkVacancy([Date.parse('1/20/2019'), Date.parse('8/10/2019')], reservations);
valid


