// bildquelle-analyzer.js

document.addEventListener('DOMContentLoaded', function() {
    loadData();
});

let crownData = [];
let bildquelleData = [];
let filteredBildquelleData = [];

let ansichten = new Set();
let farben = new Set();
let medien = new Set();

function loadData() {
    d3.json('data/crown_data.json')
        .then(processData)
        .then(() => {
            populateFilters();
            displaySummaryStatistics();
            createMediumChart();
            displayBildquelleGallery();
        })
        .catch(handleError);
}

function handleError(error) {
    console.error('Fehler beim Laden der Daten:', error);
    alert('Fehler beim Laden der Daten.');
}

function processData(data) {
    crownData = data;
    bildquelleData = crownData.filter(d => d.Bestandteil && d.Bestandteil.toLowerCase() === 'bildquelle');

    // Initialize sets for filters
    ansichten = new Set();
    farben = new Set();
    medien = new Set();

    bildquelleData.forEach(bild => {
        // Ansicht
        let ansichtObj = bild.ConditionAttributes && bild.ConditionAttributes.Ansicht;
        let ansicht = 'Unbekannt';
        if (ansichtObj) {
            for (let key in ansichtObj) {
                if (ansichtObj[key] === 1.0) {
                    ansicht = key;
                    break;
                }
            }
        }
        bild.ansicht = ansicht;
        ansichten.add(ansicht);

        // Farbe
        let farbe = bild.ConditionAttributes && bild.ConditionAttributes.Farbe
            ? bild.ConditionAttributes.Farbe[""] || 'Unbekannt'
            : 'Unbekannt';
        bild.farbe = farbe.trim();
        farben.add(bild.farbe);

        // Medium
        let medium = bild.Medium || 'Unbekannt';
        bild.medium = medium.trim();
        medien.add(bild.medium);

        // Internet Verfügbarkeit
        let internet = bild.ConditionAttributes && bild.ConditionAttributes.Internet
            ? bild.ConditionAttributes.Internet[""] === 1.0
            : false;
        bild.internet = internet;

        // Relevanz für Restaurierungsgeschichte
        let relevanz = bild.ConditionAttributes && bild.ConditionAttributes["relevant für Restaurierungsgeschichte"]
            ? bild.ConditionAttributes["relevant für Restaurierungsgeschichte"] === 1.0
            : false;
        bild.relevanz = relevanz;
    });

    filteredBildquelleData = bildquelleData;
}

function populateFilters() {
    // Ansicht Filter
    const ansichtFilter = d3.select('#ansichtFilter');
    ansichten.forEach(ansicht => {
        ansichtFilter.append('option')
            .attr('value', ansicht)
            .text(ansicht);
    });

    // Farbe Filter
    const farbeFilter = d3.select('#farbeFilter');
    farben.forEach(farbe => {
        farbeFilter.append('option')
            .attr('value', farbe)
            .text(farbe);
    });

    // Medium Filter
    const mediumFilter = d3.select('#mediumFilter');
    medien.forEach(medium => {
        mediumFilter.append('option')
            .attr('value', medium)
            .text(medium);
    });

    // Event Listeners
    d3.selectAll('.form-select').on('change', applyFilters);
    d3.select('#resetFilters').on('click', resetFilters);
}

function applyFilters() {
    const selectedAnsicht = d3.select('#ansichtFilter').property('value');
    const selectedFarbe = d3.select('#farbeFilter').property('value');
    const selectedMedium = d3.select('#mediumFilter').property('value');
    const selectedInternet = d3.select('#internetFilter').property('value');
    const selectedRelevanz = d3.select('#relevanzFilter').property('value');

    filteredBildquelleData = bildquelleData.filter(bild => {
        let ansichtMatch = (selectedAnsicht === 'all') || (bild.ansicht === selectedAnsicht);
        let farbeMatch = (selectedFarbe === 'all') || (bild.farbe === selectedFarbe);
        let mediumMatch = (selectedMedium === 'all') || (bild.medium === selectedMedium);
        let internetMatch = (selectedInternet === 'all') || ((bild.internet ? 'Ja' : 'Nein') === selectedInternet);
        let relevanzMatch = (selectedRelevanz === 'all') || ((bild.relevanz ? 'Ja' : 'Nein') === selectedRelevanz);

        return ansichtMatch && farbeMatch && mediumMatch && internetMatch && relevanzMatch;
    });

    displayBildquelleGallery();
}

function resetFilters() {
    d3.select('#ansichtFilter').property('value', 'all');
    d3.select('#farbeFilter').property('value', 'all');
    d3.select('#mediumFilter').property('value', 'all');
    d3.select('#internetFilter').property('value', 'all');
    d3.select('#relevanzFilter').property('value', 'all');

    applyFilters();
}

function displaySummaryStatistics() {
    // Total Bildquellen
    d3.select('#bildquelleCount').text(bildquelleData.length);
}

function createMediumChart() {
    // Prepare data for the chart
    const mediumCounts = {};
    bildquelleData.forEach(bild => {
        let medium = bild.medium || 'Unbekannt';
        mediumCounts[medium] = (mediumCounts[medium] || 0) + 1;
    });

    const chartData = {
        labels: Object.keys(mediumCounts),
        datasets: [{
            data: Object.values(mediumCounts),
            backgroundColor: Object.keys(mediumCounts).map(() => getRandomColor()),
        }]
    };

    const ctx = document.getElementById('mediumChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: chartData,
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                title: { display: false }
            }
        },
    });
}

function displayBildquelleGallery() {
    const gallery = d3.select('#bildquelleGallery');
    gallery.html('');

    if (filteredBildquelleData.length === 0) {
        gallery.append('p').text('Keine Bildquellen entsprechen den ausgewählten Filtern.');
        return;
    }

    filteredBildquelleData.forEach(bild => {
        const card = gallery.append('div')
            .attr('class', 'bildquelle-card');

        // Bildquelle Image
        card.append('img')
            .attr('src', getImagePath(bild))
            .attr('alt', bild.ObjectName || 'Bildquelle');

        // Bildquelle Information
        const info = card.append('div').attr('class', 'bildquelle-info mt-2');

        info.append('h5').text(bild.ObjectName || 'Unbekanntes Objekt');

        info.append('p').html(`<strong>Titel:</strong> ${bild.Description || 'Keine Beschreibung'}`);
        info.append('p').html(`<strong>Medium:</strong> ${bild.medium}`);
        info.append('p').html(`<strong>Ansicht:</strong> ${bild.ansicht}`);
        info.append('p').html(`<strong>Farbe:</strong> ${bild.farbe}`);
        info.append('p').html(`<strong>Datierung:</strong> ${bild.Dated || 'Unbekannt'}`);
        info.append('p').html(`<strong>Internet Verfügbarkeit:</strong> ${formatStatus(bild.internet)}`);
        info.append('p').html(`<strong>Relevanz für Restaurierungsgeschichte:</strong> ${formatStatus(bild.relevanz)}`);

        // Additional ConditionAttributes
        if (bild.ConditionAttributes) {
            // Eigentümer/Standort/Inv.Nr.
            if (bild.ConditionAttributes["Eigentümer/Standort/Inv.Nr."]) {
                info.append('p').html(`<strong>Standort:</strong> ${bild.ConditionAttributes["Eigentümer/Standort/Inv.Nr."][""] || 'Unbekannt'}`);
            }
            // Provenienz
            if (bild.ConditionAttributes.Provenienz) {
                info.append('p').html(`<strong>Provenienz:</strong> ${bild.ConditionAttributes.Provenienz[""] || 'Unbekannt'}`);
            }
            // Darstellung allgemein
            if (bild.ConditionAttributes["Darstellung allgemein"]) {
                info.append('p').html(`<strong>Darstellung:</strong> ${bild.ConditionAttributes["Darstellung allgemein"][""] || 'Keine Angabe'}`);
            }
        }

        // Dimensions
        if (bild.Dimensions) {
            info.append('p').html(`<strong>Dimensionen:</strong> ${bild.Dimensions}`);
        }
    });
}

function getImagePath(bild) {
    // Check if 'Media' and its fields exist
    if (bild.Media && bild.Media.length > 0 && bild.Media[0].FileName) {
        // Adjust the path as necessary
        const cleanedPath = bild.Media[0].FileName.replace(/\\/g, '/');
        // Construct the final path
        return `assets/${cleanedPath}`;
    } else {
        return "images/placeholder.png";
    }
}

function getRandomColor() {
    // Generates a random color for the chart
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function formatStatus(status) {
    return status
        ? '<span class="status-ja">Ja</span>'
        : '<span class="status-nein">Nein</span>';
}
