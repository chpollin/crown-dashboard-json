document.addEventListener('DOMContentLoaded', function () {
    console.log('Initializing Fassung Comparison Tool');
    loadData();
});

let crownData = [];
let fassungData = {};

// Fetch the crown data (assuming a local file or API endpoint)
function loadData() {
    d3.json('data/crown_data.json').then(data => {
        crownData = data;
        processData(crownData);
        createTreemap();
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

// Create the Treemap visualization
function createTreemap() {
    const width = document.getElementById('treemapContainer').clientWidth;
    const height = 600;

    const treemapLayout = d3.treemap()
        .size([width, height])
        .padding(1)
        .round(true);

    const root = d3.hierarchy(fassungData)
        .sum(d => d.size)
        .sort((a, b) => b.value - a.value);

    treemapLayout(root);

    const colorScale = d3.scaleLinear()
        .domain([0, 5])  // Assuming severity levels from 0 to 5 based on ConditionAttributes
        .range(["#00ff00", "#ff0000"]);  // Green to Red color scale

    const svg = d3.select('#treemapContainer').append('svg')
        .attr('width', width)
        .attr('height', height);

    const nodes = svg.selectAll('.node')
        .data(root.leaves())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x0},${d.y0})`);

    nodes.append('rect')
        .attr('id', d => d.data.name)
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .attr('fill', d => colorScale(getSeverityLevel(d.data.data.ConditionAttributes)))
        .on('click', (event, d) => {
            displayFassungDetails(d.data.data);
        })
        .on('mouseover', function (event, d) {
            d3.select(this).attr('opacity', 0.8);
            showTooltip(event, `${d.data.name} (${d.parent.data.name})`);
        })
        .on('mouseout', function () {
            d3.select(this).attr('opacity', 1);
            hideTooltip();
        });

    nodes.append('text')
        .attr('dx', 4)
        .attr('dy', 12)
        .text(d => d.data.name)
        .attr('font-size', '10px')
        .attr('fill', 'white')
        .attr('pointer-events', 'none');
}

// Get severity level from ConditionAttributes (custom logic)
function getSeverityLevel(conditionAttributes) {
    if (!conditionAttributes) return 0;
    let severity = 0;
    if (conditionAttributes.RissBruch && conditionAttributes.RissBruch.Beschreibung) {
        severity += 3;
    }
    if (conditionAttributes.Fehlstellen && conditionAttributes.Fehlstellen.Beschreibung) {
        severity += 2;
    }
    return Math.min(severity, 5);
}

// Show the tooltip
const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('display', 'none');

function showTooltip(event, content) {
    tooltip.html(content)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .style('display', 'block');
}

function hideTooltip() {
    tooltip.style('display', 'none');
}

// Display detailed information about the fassung
function displayFassungDetails(fassungData) {
    const container = d3.select("#comparisonContainer");
    container.html("");

    const card = container.append("div").attr("class", "fassung-card");
    card.append("h5").text(`${fassungData.ObjectName || 'No Name'} - ${fassungData.Bestandteil || 'No Component'}`);
    card.append("img").attr("src", getImagePath(fassungData)).attr("alt", fassungData.ObjectName || 'No Name');
    card.append("p").text(fassungData.Description || "No description available");

    // Show intervention details
    if (fassungData.Interventions) {
        const interventions = card.append("div").attr("class", "interventions-timeline");
        interventions.append("h6").text("Interventions");
        fassungData.Interventions.forEach(intervention => {
            interventions.append("p").text(`${intervention.Details.ActionTaken}: ${intervention.Details.DateCompleted}`);
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

// Apply basic filters (material and date range)
function applyFilters() {
    const selectedMaterial = document.getElementById('materialFilter').value;
    const dateStart = new Date(document.getElementById('dateStart').value);
    const dateEnd = new Date(document.getElementById('dateEnd').value);

    const filteredData = crownData.filter(d => {
        return (selectedMaterial ? d.Medium === selectedMaterial : true)
            && (dateStart ? new Date(d.DateBegin) >= dateStart : true)
            && (dateEnd ? new Date(d.DateEnd) <= dateEnd : true);
    });

    processData(filteredData);
    createTreemap();
}

// Export data to CSV
function exportData() {
    const csvData = crownData.map(d => ({
        ObjectID: d.ObjectID,
        Name: d.ObjectName,
        Material: d.Medium,
        Date: `${d.DateBegin} - ${d.DateEnd}`,
        Condition: d.ConditionAttributes ? d.ConditionAttributes.Beschreibung : 'Unknown'
    }));

    let csvContent = "data:text/csv;charset=utf-8," + Object.keys(csvData[0]).join(",") + "\n";
    csvContent += csvData.map(e => Object.values(e).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "crown_data.csv");
    document.body.appendChild(link);
    link.click();
}
