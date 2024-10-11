// enamel-color-explorer.js

let crownData = [];
let colorData = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Enamel Color Explorer');
    loadData();
});

function loadData() {
    d3.json('data/crown_data.json').then(data => {
        crownData = data;
        processData();
        createColorChart();
        createDataTable();
    }).catch(error => {
        console.error('Error loading data:', error);
        alert('Failed to load data. Please check if crown_data.json is available.');
    });
}

function processData() {
    const enamelData = crownData.filter(d => d.Medium === 'Email');
    const colorCounts = d3.rollup(enamelData, v => v.length, d => d.ObjectName);
    colorData = Array.from(colorCounts, ([name, value]) => ({name, value}));
}

function createColorChart() {
    const width = 500;
    const height = 500;
    const radius = Math.min(width, height) / 2;

    const color = d3.scaleOrdinal()
        .domain(colorData.map(d => d.name))
        .range(d3.schemeCategory10);

    const pie = d3.pie()
        .value(d => d.value)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

    const svg = d3.select("#colorChart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    const arcs = svg.selectAll("arc")
        .data(pie(colorData))
        .enter()
        .append("g")
        .attr("class", "arc");

    arcs.append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.name))
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut)
        .on("click", handleClick);

    arcs.append("text")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("dy", ".35em")
        .text(d => `${(d.data.value / d3.sum(colorData, d => d.value) * 100).toFixed(1)}%`)
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "white");

    createLegend(color);
}

function createLegend(color) {
    const legend = d3.select("#colorLegend")
        .append("ul")
        .attr("class", "list-unstyled");

    legend.selectAll("li")
        .data(colorData)
        .enter()
        .append("li")
        .html(d => `<span style="background-color: ${color(d.name)}"></span>${d.name}: ${d.value}`)
        .on("mouseover", (event, d) => highlightSegment(d.name))
        .on("mouseout", resetHighlight)
        .on("click", (event, d) => showColorDetails(d));
}

function createDataTable() {
    const tbody = d3.select("#colorTable tbody");
    const totalCount = d3.sum(colorData, d => d.value);

    tbody.selectAll("tr")
        .data(colorData)
        .enter()
        .append("tr")
        .html(d => `
            <td>${d.name}</td>
            <td>${d.value}</td>
            <td>${(d.value / totalCount * 100).toFixed(1)}%</td>
        `);
}

function handleMouseOver(event, d) {
    d3.select(this)
        .transition()
        .duration(200)
        .attr("d", d3.arc().innerRadius(0).outerRadius(radius * 1.1));
    showTooltip(event, `${d.data.name}: ${d.data.value} (${(d.data.value / d3.sum(colorData, d => d.value) * 100).toFixed(1)}%)`);
}

function handleMouseOut(event, d) {
    d3.select(this)
        .transition()
        .duration(200)
        .attr("d", arc);
    hideTooltip();
}

function handleClick(event, d) {
    showColorDetails(d.data);
}

function highlightSegment(colorName) {
    d3.selectAll(".arc path")
        .transition()
        .duration(200)
        .attr("opacity", d => d.data.name === colorName ? 1 : 0.3);
}

function resetHighlight() {
    d3.selectAll(".arc path")
        .transition()
        .duration(200)
        .attr("opacity", 1);
}

function showColorDetails(colorData) {
    const detailsDiv = d3.select("#colorDetails");
    detailsDiv.html(`
        <h4>${colorData.name}</h4>
        <p>Count: ${colorData.value}</p>
        <p>Percentage: ${(colorData.value / d3.sum(colorData, d => d.value) * 100).toFixed(1)}%</p>
        <p>Used in components: ${getComponentsForColor(colorData.name)}</p>
    `);
}

function getComponentsForColor(colorName) {
    const components = crownData
        .filter(d => d.Medium === 'Email' && d.ObjectName === colorName)
        .map(d => d.Bestandteil);
    return [...new Set(components)].join(", ") || "No components found";
}

function showTooltip(event, content) {
    const tooltip = d3.select("#tooltip");
    tooltip.html(content)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .style("display", "block");
}

function hideTooltip() {
    d3.select("#tooltip").style("display", "none");
}