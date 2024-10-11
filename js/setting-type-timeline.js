document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Setting Type Timeline');
    loadData();
});

let crownData = [];

function loadData() {
    d3.json('data/crown_data.json').then(data => {
        crownData = data;
        processData();
    }).catch(error => {
        console.error('Error loading data:', error);
    });
}

function processData() {
    // Extract setting types and their dates
    // Assuming each object has 'SettingType' and 'DateBegin' fields
    const settingData = crownData.map(d => ({
        SettingType: d.SettingType || 'Unknown',
        DateBegin: d.DateBegin || 0,
        DateEnd: d.DateEnd || 0,
        ObjectName: d.ObjectName,
        Bestandteil: d.Bestandteil
    }));

    renderTimeline(settingData);
}

function renderTimeline(data) {
    const svg = d3.select("#timelineChart")
        .append("svg")
        .attr("width", "100%")
        .attr("height", 500);

    const width = svg.node().getBoundingClientRect().width;
    const height = 500;
    const margin = {top: 20, right: 30, bottom: 40, left: 60};
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Define scales
    const x = d3.scaleTime()
        .range([0, innerWidth])
        .domain([d3.min(data, d => d.DateBegin), d3.max(data, d => d.DateEnd)]);

    const y = d3.scaleBand()
        .range([0, innerHeight])
        .domain(data.map(d => d.SettingType))
        .padding(0.1);

    // Add axes
    g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(5));

    g.append("g")
        .call(d3.axisLeft(y));

    // Add bars
    g.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.DateBegin))
        .attr("y", d => y(d.SettingType))
        .attr("width", d => x(d.DateEnd) - x(d.DateBegin))
        .attr("height", y.bandwidth())
        .attr("fill", "steelblue")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill", "orange");
            showTooltip(event, `${d.ObjectName} - ${d.Bestandteil}`);
        })
        .on("mouseout", function(event, d) {
            d3.select(this).attr("fill", "steelblue");
            hideTooltip();
        });
}

// Tooltip functions
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("display", "none");

function showTooltip(event, content) {
    tooltip.html(content)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .style("display", "block");
}

function hideTooltip() {
    tooltip.style("display", "none");
}
