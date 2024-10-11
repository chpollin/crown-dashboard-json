document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Enamel Degradation Tracker');
    loadData();
});

let crownData = [];
let forsData = [];
let selectedSample = null;

function loadData() {
    Promise.all([
        d3.json('data/crown_data.json'),
        // Assuming FORS data is in a separate file
        d3.json('data/fors_data.json')
    ]).then(([crown, fors]) => {
        crownData = crown;
        forsData = fors;
        populateEnamelSampleSelect();
    }).catch(error => {
        console.error('Error loading data:', error);
    });
}

function populateEnamelSampleSelect() {
    const enamelSamples = crownData.filter(d => d.Medium === 'Email');
    const select = d3.select("#enamelSampleSelect");

    select.selectAll("option")
        .data(enamelSamples)
        .enter()
        .append("option")
        .text(d => `${d.ObjectName} - ${d.Bestandteil}`)
        .attr("value", d => d.ObjectID);

    select.on("change", function() {
        selectedSample = this.value;
        updateChart();
    });

    // Set default selection
    if (enamelSamples.length > 0) {
        selectedSample = enamelSamples[0].ObjectID;
        select.property("value", selectedSample);
        updateChart();
    }
}

function updateChart() {
    const startDate = new Date(d3.select("#startDate").property("value"));
    const endDate = new Date(d3.select("#endDate").property("value"));

    const sampleForsData = forsData.filter(d => d.ObjectID === +selectedSample);

    let filteredData = sampleForsData;
    if (!isNaN(startDate) && !isNaN(endDate)) {
        filteredData = sampleForsData.filter(d => {
            const date = new Date(d.Date);
            return date >= startDate && date <= endDate;
        });
    }

    renderChart(filteredData);
}

function renderChart(data) {
    d3.select("#forsChart").html("");

    const svg = d3.select("#forsChart")
        .append("svg")
        .attr("width", "100%")
        .attr("height", 500);

    const width = svg.node().getBoundingClientRect().width;
    const height = 500;
    const margin = {top: 20, right: 80, bottom: 40, left: 60};
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Assuming data contains wavelength-intensity pairs
    const x = d3.scaleLinear()
        .range([0, innerWidth]);

    const y = d3.scaleLinear()
        .range([innerHeight, 0]);

    // Define color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Prepare line generator
    const line = d3.line()
        .x(d => x(d.wavelength))
        .y(d => y(d.intensity));

    // Set domains
    const wavelengths = data.flatMap(d => d.spectrum.map(p => p.wavelength));
    const intensities = data.flatMap(d => d.spectrum.map(p => p.intensity));
    x.domain(d3.extent(wavelengths));
    y.domain(d3.extent(intensities));

    // Add axes
    g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));

    g.append("g")
        .call(d3.axisLeft(y));

    // Add lines
    const spectra = g.selectAll(".spectrum")
        .data(data)
        .enter()
        .append("g")
        .attr("class", "spectrum");

    spectra.append("path")
        .attr("class", "line")
        .attr("d", d => line(d.spectrum))
        .style("stroke", (d, i) => color(i));

    // Add legend
    const legend = g.selectAll(".legend")
        .data(data)
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(${innerWidth + 20},${i * 20})`);

    legend.append("rect")
        .attr("x", 0)
        .attr("y", 4)
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", (d, i) => color(i));

    legend.append("text")
        .attr("x", 15)
        .attr("y", 14)
        .text(d => d.Date);
}

// Event listener for the update button
d3.select("#updateChart").on("click", updateChart);
