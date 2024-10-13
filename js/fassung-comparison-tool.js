// Global variables
let svg, width, height, radius;
let color = d3.scaleOrdinal(d3.schemeCategory10);

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    console.log('Initializing Simplified Sunburst Fassung Comparison Tool');
    loadData();
});

// Fetch the crown data
function loadData() {
    d3.json('data/crown_data.json')
        .then(data => {
            console.log('Data loaded successfully');
            const hierarchicalData = processHierarchicalData(data);
            createSunburst(hierarchicalData);
        })
        .catch(error => {
            console.error('Error loading data:', error);
            alert('Failed to load data. Please check the console for details.');
        });
}

// Simplify data processing
function processHierarchicalData(data) {
    return {
        name: "All Fassungen",
        children: data.map(item => ({
            name: item.Description || 'Unknown',
            children: [
                { name: "Condition", value: item.ConditionAttributes ? Object.keys(item.ConditionAttributes).length : 0 },
                { name: "Interventions", value: item.Interventions ? item.Interventions.length : 0 },
                { name: "Media", value: item.Media ? item.Media.length : 0 }
            ]
        }))
    };
}

// Create the Sunburst visualization
function createSunburst(data) {
    const container = document.getElementById('sunburstContainer');
    width = container.clientWidth;
    height = container.clientHeight || width; // Make it square
    radius = Math.min(width, height) / 2;

    svg = d3.select('#sunburstContainer')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

    const root = d3.hierarchy(data)
        .sum(d => d.value || 0);

    const partition = d3.partition()
        .size([2 * Math.PI, radius]);

    partition(root);

    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1);

    svg.selectAll('path')
        .data(root.descendants())
        .enter().append('path')
        .attr('d', arc)
        .style('fill', d => color((d.children ? d : d.parent).data.name))
        .style('opacity', 0.7)
        .on('click', clicked)
        .append('title')
        .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${d.value}`);

    // Add labels
    svg.selectAll('text')
        .data(root.descendants().filter(d => d.depth && (d.y0 + d.y1) / 2 * (d.x1 - d.x0) > 10))
        .enter().append('text')
        .attr('transform', function(d) {
            const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
            const y = (d.y0 + d.y1) / 2;
            return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        })
        .attr('dy', '0.35em')
        .text(d => d.data.name)
        .attr('font-size', '10px')
        .attr('fill', 'white')
        .style('text-anchor', 'middle');
}

function clicked(event, d) {
    svg.transition().duration(750).tween("scale", function() {
        const xd = d3.interpolate(root.x0, d.x0),
              yd = d3.interpolate(root.y0, d.y0),
              yr = d3.interpolate(root.y1, d.y1);
        return function(t) { root.x0 = xd(t); root.y0 = yd(t); root.y1 = yr(t); };
    }).selectAll("path")
        .attrTween("d", function(d) { return function() { return arc(d); }; });
    
    updateDetailedView(d);
}

function updateDetailedView(d) {
    const detailView = document.getElementById('detailedView');
    detailView.innerHTML = `
        <h3>${d.data.name}</h3>
        <p>Depth: ${d.depth}</p>
        <p>Value: ${d.value}</p>
    `;
}

// Resize handler
window.addEventListener('resize', debounce(() => {
    d3.select('#sunburstContainer').selectAll('*').remove();
    createSunburst(root.data);
}, 250));

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}