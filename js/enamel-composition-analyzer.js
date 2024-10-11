// enamel-composition-analyzer.js

let crownData = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Enamel Composition Analyzer');
    loadData();
});

function loadData() {
    d3.json('data/crown_data.json').then(data => {
        crownData = data;
        populateEnamelSampleSelect();
        createCompositionChart();
    }).catch(error => {
        console.error('Error loading data:', error);
        alert('Failed to load data. Please check if crown_data.json is available.');
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
        const selectedSampleId = this.value;
        updateCompositionChart(selectedSampleId);
        showSampleDetails(selectedSampleId);
    });
}

function createCompositionChart() {
    const width = 400;
    const height = 300;
    const margin = {top: 20, right: 30, bottom: 40, left: 60};

    const svg = d3.select("#compositionChart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add axes placeholders
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`);

    svg.append("g")
        .attr("class", "y-axis");

    // Add chart title
    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold");
}

function updateCompositionChart(sampleId) {
    const sample = crownData.find(d => d.ObjectID === +sampleId);
    if (!sample || !sample.ConditionAttributes) {
        console.error("No composition data found for this sample");
        return;
    }

    const compositionData = Object.entries(sample.ConditionAttributes)
        .filter(([key, value]) => key.startsWith("Bande") && !isNaN(value))
        .map(([key, value]) => ({name: key, value: +value}));

    const svg = d3.select("#compositionChart svg g");
    const width = svg.attr("width") - 90;
    const height = svg.attr("height") - 60;

    const x = d3.scaleBand()
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .range([height, 0]);

    x.domain(compositionData.map(d => d.name));
    y.domain([0, d3.max(compositionData, d => d.value)]);

    svg.select(".x-axis")
        .call(d3.axisBottom(x));

    svg.select(".y-axis")
        .call(d3.axisLeft(y));

    const bars = svg.selectAll(".bar")
        .data(compositionData);

    bars.enter()
        .append("rect")
        .attr("class", "bar")
        .merge(bars)
        .transition()
        .duration(300)
        .attr("x", d => x(d.name))
        .attr("y", d => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", "steelblue");

    bars.exit().remove();

    // Update chart title
    svg.select(".chart-title")
        .text(`Composition of ${sample.ObjectName}`);

    // Add value labels on top of bars
    const valueLabels = svg.selectAll(".value-label")
        .data(compositionData);

    valueLabels.enter()
        .append("text")
        .attr("class", "value-label")
        .merge(valueLabels)
        .transition()
        .duration(300)
        .attr("x", d => x(d.name) + x.bandwidth() / 2)
        .attr("y", d => y(d.value) - 5)
        .attr("text-anchor", "middle")
        .text(d => d.value);

    valueLabels.exit().remove();
}

function showSampleDetails(sampleId) {
    const sample = crownData.find(d => d.ObjectID === +sampleId);
    if (!sample) {
        console.error("Sample not found");
        return;
    }

    const detailsDiv = d3.select("#sampleDetails");
    detailsDiv.html(`
        <h4>${sample.ObjectName}</h4>
        <p><strong>Component:</strong> ${sample.Bestandteil}</p>
        <p><strong>Description:</strong> ${sample.Description || "No description available"}</p>
        <h5>Condition Attributes:</h5>
        <ul>
            ${Object.entries(sample.ConditionAttributes || {})
                .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
                .join("")}
        </ul>
    `);
}