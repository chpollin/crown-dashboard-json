// Global variables
let crownData = [];
let fassungData = {};

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
    console.log('Initializing Sunburst Fassung Comparison Tool');
    loadData();
});

// Fetch the crown data (assuming a local file or API endpoint)
function loadData() {
    d3.json('data/crown_data.json').then(data => {
        crownData = data;
        processData(crownData);
        createSunburst();
    }).catch(error => {
        console.error('Error loading data:', error);
    });
}

// Process the raw crown data
function processData(data) {
    fassungData = { name: "Fassungen", children: [] };

    const fassungTypeMap = {};

    data.forEach(d => {
        const fassungType = d.Description || 'Unknown';
        if (!fassungTypeMap[fassungType]) {
            fassungTypeMap[fassungType] = [];
        }
        fassungTypeMap[fassungType].push(d);
    });

    for (const [type, objects] of Object.entries(fassungTypeMap)) {
        fassungData.children.push({
            name: type,
            children: objects.map(obj => ({
                name: obj.ObjectID,
                size: obj.Interventions ? obj.Interventions.length : 1,
                data: obj
            }))
        });
    }
}

// Create the Sunburst visualization
function createSunburst() {
    const container = document.getElementById('sunburstContainer');
    const width = container.clientWidth;
    const height = container.clientHeight || 600; // fallback to 600 if height is not set
    const radius = Math.min(width, height) / 2;

    // Clear any existing SVG
    d3.select('#sunburstContainer').select('svg').remove();

    const svg = d3.select('#sunburstContainer').append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

    const root = d3.hierarchy(fassungData)
        .sum(d => d.size)
        .sort((a, b) => b.value - a.value);

    const partition = d3.partition()
        .size([2 * Math.PI, radius]);

    partition(root);

    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1);

    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, fassungData.children.length + 1));

    svg.selectAll('path')
        .data(root.descendants().slice(1))
        .enter().append('path')
        .attr('d', arc)
        .style('fill', d => color((d.children ? d : d.parent).data.name))
        .style('opacity', 0.7)
        .on('click', (event, d) => {
            displayFassungDetails(d.data.data);
        })
        .on('mouseover', function (event, d) {
            d3.select(this).style('opacity', 1);
            showTooltip(event, `${d.data.name} (${d.value} interventions)`);
        })
        .on('mouseout', function () {
            d3.select(this).style('opacity', 0.7);
            hideTooltip();
        });

    // Add labels
    const label = svg.selectAll('text')
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
        .style('text-anchor', 'middle')
        .style('pointer-events', 'none');
}

// Show the tooltip
function showTooltip(event, content) {
    const tooltip = d3.select('body').selectAll('.tooltip').data([null])
        .join('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

    tooltip.transition()
        .duration(200)
        .style('opacity', .9);
    
    tooltip.html(content)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
}

// Hide the tooltip
function hideTooltip() {
    d3.select('.tooltip').transition()
        .duration(500)
        .style('opacity', 0);
}

// Display detailed information about the fassung
function displayFassungDetails(fassungData) {
    const container = d3.select("#comparisonContainer");
    container.html("");

    const card = container.append("div").attr("class", "card");
    const cardBody = card.append("div").attr("class", "card-body");
    
    cardBody.append("h5")
        .attr("class", "card-title")
        .text(`${fassungData.ObjectName || 'No Name'} - ${fassungData.Bestandteil || 'No Component'}`);
    
    if (fassungData.Media && fassungData.Media.length > 0) {
        cardBody.append("img")
            .attr("src", getImagePath(fassungData))
            .attr("alt", fassungData.ObjectName || 'No Name')
            .attr("class", "img-fluid mb-3");
    }
    
    cardBody.append("p")
        .attr("class", "card-text")
        .text(fassungData.Description || "No description available");

    // Show intervention details
    if (fassungData.Interventions && fassungData.Interventions.length > 0) {
        const interventions = cardBody.append("div").attr("class", "mt-3");
        interventions.append("h6").text("Interventions");
        const list = interventions.append("ul").attr("class", "list-group");
        fassungData.Interventions.forEach(intervention => {
            list.append("li")
                .attr("class", "list-group-item")
                .text(`${intervention.Details.ActionTaken}: ${intervention.Details.DateCompleted}`);
        });
    }
}

// Get the image path
function getImagePath(d) {
    if (d.Media && d.Media.length > 0 && d.Media[0].Path && d.Media[0].FileName) {
        return d.Media[0].Path + "/" + d.Media[0].FileName;
    } else {
        return "images/placeholder.png";
    }
}

// Apply filters
function applyFilters() {
    const selectedMaterial = document.getElementById('materialFilter').value;
    const selectedCondition = document.getElementById('conditionFilter').value;
    const selectedIntervention = document.getElementById('interventionFilter').value;

    const filteredData = crownData.filter(d => {
        return (selectedMaterial ? d.Medium === selectedMaterial : true)
            && (selectedCondition ? (d.ConditionAttributes && d.ConditionAttributes[selectedCondition]) : true)
            && (selectedIntervention ? (d.Interventions && d.Interventions.some(i => i.Details.ActionTaken === selectedIntervention)) : true);
    });

    processData(filteredData);
    createSunburst();
}

// Export data to CSV
function exportData() {
    const csvData = crownData.map(d => ({
        ObjectID: d.ObjectID,
        Name: d.ObjectName,
        Material: d.Medium,
        Condition: d.ConditionAttributes ? JSON.stringify(d.ConditionAttributes) : 'Unknown',
        Interventions: d.Interventions ? d.Interventions.length : 0
    }));

    const csvContent = "data:text/csv;charset=utf-8," 
        + [
            Object.keys(csvData[0]).join(","),
            ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(","))
        ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "crown_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Make functions globally accessible
window.applyFilters = applyFilters;
window.exportData = exportData;