document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Intervention Impact Visualizer');
    loadData();
});

let crownData = [];

function loadData() {
    d3.json('data/crown_data.json').then(data => {
        crownData = data;
        renderInterventionMap();
    }).catch(error => {
        console.error('Error loading data:', error);
    });
}

function renderInterventionMap() {
    // Since we don't have actual spatial data, we'll simulate an SVG map of the crown
    const svg = d3.select("#interventionMap")
        .append("svg")
        .attr("width", "100%")
        .attr("height", 500);

    const width = svg.node().getBoundingClientRect().width;
    const height = 500;

    // Simulate crown components as circles
    const components = crownData.map((d, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        ObjectID: d.ObjectID,
        Bestandteil: d.Bestandteil,
        Interventions: d.Interventions || []
    }));

    svg.selectAll("circle")
        .data(components)
        .enter()
        .append("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", 20)
        .attr("fill", d => d.Interventions.length > 0 ? "red" : "green")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("stroke", "black").attr("stroke-width", 2);
            showTooltip(event, `${d.Bestandteil}<br>Interventions: ${d.Interventions.length}`);
        })
        .on("mouseout", function(event, d) {
            d3.select(this).attr("stroke", "none");
            hideTooltip();
        })
        .on("click", function(event, d) {
            // Show detailed information
            alert(`Component: ${d.Bestandteil}\nInterventions: ${d.Interventions.length}`);
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
