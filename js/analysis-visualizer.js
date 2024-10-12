// analysis-visualizer.js

// Data structure to hold our crown component information
const crownData = [
    {
        name: "transparent dunkelblau",
        color: "#000080",
        analyses: [
            { method: "FORS", date: "2023-06-21", examiner: "Martina Griesser" },
            { method: "µ-Raman", date: "2023-10-03", examiner: "Brenda Doherty" }
        ]
    },
    {
        name: "opak gelb",
        color: "#FFD700",
        analyses: [
            { method: "FORS", date: "2023-06-21", examiner: "Martina Griesser" },
            { method: "µ-Raman", date: "2023-10-03", examiner: "Brenda Doherty" }
        ]
    },
    {
        name: "opak hellblau",
        color: "#ADD8E6",
        analyses: [
            { method: "FORS", date: "2023-06-21", examiner: "Martina Griesser" },
            { method: "µ-Raman", date: "2023-10-03", examiner: "Brenda Doherty" }
        ]
    },
    {
        name: "Gemisch aus mehreren Farben",
        color: "#FFA500", // Using orange to represent mixed colors
        analyses: [
            { method: "FORS", date: "2023-06-21", examiner: "Martina Griesser" }
        ]
    }
];

// Function to create the crown visualization
function createCrownVisualization() {
    const svg = d3.select("#interventionMap")
        .append("svg")
        .attr("width", "100%")
        .attr("height", 500);

    const width = svg.node().getBoundingClientRect().width;
    const height = 500;

    // Create a group for the crown
    const crownGroup = svg.append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Create arcs for each component
    const pie = d3.pie().value(() => 1);
    const arc = d3.arc().innerRadius(100).outerRadius(200);

    const arcs = crownGroup.selectAll("path")
        .data(pie(crownData))
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", (d, i) => d.data.color)
        .on("mouseover", showTooltip)
        .on("mouseout", hideTooltip)
        .on("click", showAnalysisDetails);

    // Add a circle in the center to represent the crown's center
    crownGroup.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 100)
        .attr("fill", "#FFD700");  // Gold color for the crown's center
}

// Function to show tooltip
function showTooltip(event, d) {
    const tooltip = d3.select("#tooltip");
    tooltip.transition()
        .duration(200)
        .style("opacity", .9);
    tooltip.html(`
        <strong>${d.data.name}</strong><br/>
        Analyses: ${d.data.analyses.length}
    `)
    .style("left", (event.pageX) + "px")
    .style("top", (event.pageY - 28) + "px");
}

// Function to hide tooltip
function hideTooltip() {
    d3.select("#tooltip").transition()
        .duration(500)
        .style("opacity", 0);
}

// Function to show analysis details
function showAnalysisDetails(event, d) {
    const details = d3.select("#analysisDetails");
    details.html("");
    details.append("h2").text(d.data.name);
    const list = details.append("ul");
    d.data.analyses.forEach(analysis => {
        list.append("li")
            .html(`${analysis.method} - ${analysis.date} by ${analysis.examiner}`);
    });
}

// Initialize the visualization when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Analysis Visualizer');
    createCrownVisualization();
});