let mbAttr = 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
	'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
	'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';
let mbUrl = 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
let apiUrl = 'https://api.kodingakan.id/bmkg/prakicu';
let light = L.tileLayer(mbUrl, { id: 'mapbox/light-v9', tileSize: 512, zoomOffset: -1, attribution: mbAttr });
let dark = L.tileLayer(mbUrl, { id: 'mapbox/dark-v9', tileSize: 512, zoomOffset: -1, attribution: mbAttr });
let markersLayers = new L.LayerGroup();
let map = L.map('map', { layers: light }).setView([0, 118.9213], 5);

let baseLayers = {
	"Light": light,
	"Dark": dark
};

L.control.layers(baseLayers).addTo(map);

let utc = 8;
let date = moment();
let tanggal = document.querySelector('.tanggal');
let selectTanggal = document.querySelector('[name=select-tanggal]');
let createSelect = false;
let selectOption = [];
let kodeCuaca = {
	'0': ['Cerah', 'clearskies.png'],
	'1': ['Cerah Berawan', 'partlycloudy.png'],
	'3': ['Berawan', 'mostlycloudy.png'],
	'4': ['Berawan Tebal', 'overcast.png'],
	'60': ['Hujan Ringan', 'lightrain.png'],
	'61': ['Hujan Sedang', 'rain.png'],
	'63': ['Hujan Lebat', 'heavyrain.png'],
	'80': ['Hujan Lokal', 'isolatedshower.png'],
	'95': ['Hujan Petir', 'severethunderstorm.png']
};

selectTanggal.addEventListener('change', () => {
	getData(selectTanggal.value);
});

getData(date);

async function getData(dateTime) {
	markersLayers.clearLayers();
	dateTime = moment(dateTime).subtract(utc, 'h');

	try {
		let response = await fetch(apiUrl);
		if (!response.ok) throw new Error('Gagal mengambil data cuaca.');
		let xmlString = await response.text();
		let parser = new DOMParser();
		let xmlData = parser.parseFromString(xmlString, 'text/xml');
		let areas = xmlData.querySelectorAll('area');

		areas.forEach(area => {
			let lat = area.getAttribute('latitude');
			let lng = area.getAttribute('longitude');
			let prov = area.getAttribute('description');
			let weathers = area.querySelectorAll('parameter[id="weather"] timerange');
			let popUpContent = '<table width="190px">';
			let posPrakiraan;
			let nextDate;
			let found = false;

			weathers.forEach((weather, i) => {
				let getDateTime = weather.getAttribute('datetime');
				let prakiraan = weather.querySelector('value').textContent;

				if (!selectOption.includes(getDateTime.substring(0, 8))) {
					selectOption.push(getDateTime.substring(0, 8));
				}

				if (getDateTime.substring(0, 8) === dateTime.format('YYYYMMDD')) {
					popUpContent += `
                        <tr>
                            <td>${convertTime(getDateTime.substring(8))}</td>
                            <td>:</td>
                            <td>
                                <img style="width:40px;float:left" src="assets/images/icons/${kodeCuaca[prakiraan]?.[1] || 'default.png'}">
                                <span>${kodeCuaca[prakiraan]?.[0] || 'Tidak Ada Data'}</span>
                            </td>
                        </tr>`;
				}

				if (!found && getDateTime.substring(0, 10) >= dateTime.format('YYYYMMDDHH')) {
					posPrakiraan = i;
					nextDate = getDateTime;
					found = true;
				}
			});

			popUpContent += '</table>';

			let prakiraan = weathers[posPrakiraan]?.querySelector('value').textContent || '0';
			let iconUrl = `assets/images/icons/${kodeCuaca[prakiraan]?.[1] || 'default.png'}`;
			let deskripsi = kodeCuaca[prakiraan]?.[0] || 'Tidak Ada Data';

			let marker = L.marker([lat, lng], {
				icon: L.icon({
					iconUrl: iconUrl,
					iconSize: [50, 50],
					iconAnchor: [25, 25]
				})
			}).bindPopup(`<strong>Kota ${prov}</strong><br>${parseDate(nextDate)}<br>Keterangan: ${deskripsi}${popUpContent}`);

			marker.addTo(markersLayers);
		});

		markersLayers.addTo(map);
		tanggal.textContent = parseDate(nextDate);

		if (!createSelect) {
			selectOption.forEach(date => {
				let formattedDate = moment(date).format('D MMMM YYYY');
				let value = moment(date).format('YYYY-MM-DD') + ' 00:00';
				selectTanggal.add(new Option(formattedDate, value));
			});
			selectTanggal.value = moment(date).format('YYYY-MM-DD 00:00');
			createSelect = true;
		}
	} catch (error) {
		console.error('Error:', error.message);
	}
}

function convertTime(time) {
	switch (time) {
		case '0000': return 'Pagi';
		case '0600': return 'Siang';
		case '1200': return 'Sore';
		case '1800': return 'Dini Hari';
		default: return 'Tidak Valid';
	}
}

function parseDate(date) {
	return moment(date, 'YYYYMMDDHHmm').add(utc, 'h').format('DD MMMM YYYY HH:mm') + ' WITA';
}
