// Global variables
let crownData = [];
let svg, width, height, radius;
let arc, path, root;
let color = d3.scaleOrdinal(d3.schemeCategory10);

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    console.log('Initializing Enhanced Sunburst Fassung Comparison Tool');
    loadData();
});

// Fetch the crown data
function loadData() {
    fetch('data/crown_data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Data loaded successfully:', data);
            crownData = data;
            const hierarchicalData = processHierarchicalData(crownData);
            createSunburst(hierarchicalData);
        })
        .catch(error => {
            console.error('Error loading data:', error);
            displayErrorMessage('Failed to load data. Please check the console for more details and ensure crown_data.json exists in the data folder.');
        });
}

// Process the data into a hierarchical structure
function processHierarchicalData(data) {
    const root = {
        name: "All Fassungen",
        children: []
    };

    data.forEach(item => {
        const fassungType = {
            name: item.Description || 'Unknown',
            children: []
        };

        // Process ConditionAttributes
        if (item.ConditionAttributes && typeof item.ConditionAttributes === 'object') {
            const conditionNode = {
                name: "ConditionAttributes",
                children: []
            };
            Object.entries(item.ConditionAttributes).forEach(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    const subNode = {
                        name: key,
                        children: Object.entries(value).map(([subKey, subValue]) => ({
                            name: subKey,
                            value: String(subValue)
                        }))
                    };
                    conditionNode.children.push(subNode);
                } else {
                    conditionNode.children.push({
                        name: key,
                        value: String(value)
                    });
                }
            });
            fassungType.children.push(conditionNode);
        }

        // Process Interventions
        if (item.Interventions && Array.isArray(item.Interventions)) {
            const interventionsNode = {
                name: "Interventions",
                children: item.Interventions.map(intervention => ({
                    name: intervention.SurveyType || 'Unknown Intervention',
                    children: [
                        { name: "Date", value: intervention.SurveyISODate || 'Unknown' },
                        { name: "Examiner", value: intervention.Examiner ? intervention.Examiner.Name : 'Unknown' }
                    ]
                }))
            };
            fassungType.children.push(interventionsNode);
        }

        // Process Media
        if (item.Media && Array.isArray(item.Media)) {
            const mediaNode = {
                name: "Media",
                children: item.Media.map(media => ({
                    name: media.FileName || 'Unknown File',
                    value: media.MediaType || 'Unknown Type'
                }))
            };
            fassungType.children.push(mediaNode);
        }

        // Process other details
        const detailsNode = {
            name: "Details",
            children: [
                { name: "ObjectID", value: item.ObjectID },
                { name: "ObjectName", value: item.ObjectName },
                { name: "ObjectNumber", value: item.ObjectNumber },
                { name: "Medium", value: item.Medium },
                { name: "Bestandteil", value: item.Bestandteil },
                { name: "DateBegin", value: item.DateBegin },
                { name: "DateEnd", value: item.DateEnd }
            ].filter(detail => detail.value !== undefined && detail.value !== null)
        };
        fassungType.children.push(detailsNode);

        root.children.push(fassungType);
    });

    return root;
}

// Create the Sunburst visualization
function createSunburst(data) {
    const container = document.getElementById('sunburstContainer');
    width = container.clientWidth;
    height = container.clientHeight || 600;
    radius = Math.min(width, height) / 2;

    svg = d3.select('#sunburstContainer').append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

    root = d3.hierarchy(data)
        .sum(d => d.value ? 1 : 0)
        .sort((a, b) => b.value - a.value);

    const partition = d3.partition()
        .size([2 * Math.PI, radius]);

    partition(root);

    arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1);

    path = svg.selectAll('path')
        .data(root.descendants().slice(1))
        .enter().append('path')
        .attr('d', arc)
        .style('fill', d => color((d.children ? d : d.parent).data.name))
        .style('opacity', 0.7)
        .on('click', clicked)
        .on('mouseover', mouseover)
        .on('mouseout', mouseout);

    // Add labels
    const label = svg.selectAll('text')
        .data(root.descendants().filter(d => d.depth && (d.y0 + d.y1) / 2 * (d.x1 - d.x0) > 10))
        .enter().append('text')
        .attr('transform', labelTransform)
        .attr('dy', '0.35em')
        .text(d => d.data.name)
        .attr('font-size', '10px')
        .attr('fill', 'white')
        .style('text-anchor', 'middle')
        .style('pointer-events', 'none');

    // Initialize breadcrumb
    initializeBreadcrumb();

    // Initialize tooltip
    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);
}

function clicked(event, d) {
    svg.transition().duration(750).tween('scale', () => {
        const xd = d3.interpolate(root.x0, d.x0),
              yd = d3.interpolate(root.y0, d.y0),
              yr = d3.interpolate(root.y1, d.y1);
        return t => { root.x0 = xd(t); root.y0 = yd(t); root.y1 = yr(t); };
    }).selectAll('path')
        .attrTween('d', d => () => arc(d));

    updateBreadcrumb(d);
    updateDetailedView(d);
}

function mouseover(event, d) {
    d3.select(this).style('opacity', 1);

    d3.select('.tooltip')
        .style('opacity', 0.9)
        .html(generateTooltipContent(d))
        .style('left', (event.pageX) + 'px')
        .style('top', (event.pageY - 28) + 'px');
}

function mouseout() {
    d3.select(this).style('opacity', 0.7);
    d3.select('.tooltip').style('opacity', 0);
}

function labelTransform(d) {
    const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
    const y = (d.y0 + d.y1) / 2;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
}

function initializeBreadcrumb() {
    d3.select('#breadcrumb')
        .append('ol')
        .attr('class', 'breadcrumb');
}

function updateBreadcrumb(d) {
    const breadcrumb = d3.select('.breadcrumb');
    const data = d.ancestors().reverse().slice(1);

    const items = breadcrumb.selectAll('li')
        .data(data, d => d.data.name);

    items.exit().remove();

    items.enter()
        .append('li')
        .attr('class', 'breadcrumb-item')
        .merge(items)
        .html(d => d.data.name)
        .on('click', (event, d) => clicked(event, d));
}

function generateTooltipContent(d) {
    let content = `<strong>${d.data.name}</strong><br>`;
    if (d.data.value !== undefined) {
        content += `Value: ${d.data.value}<br>`;
    }
    content += `Depth: ${d.depth}`;
    return content;
}

function updateDetailedView(d) {
    const detailView = d3.select('#detailedView');
    detailView.html('');

    detailView.append('h2')
        .text(d.data.name);

    const content = detailView.append('div');

    if (d.depth === 0) {
        content.append('p')
            .text(`Total Fassungen: ${d.children.length}`);
    } else if (d.children) {
        content.append('p')
            .text(`Children: ${d.children.length}`);
        d.children.forEach(child => {
            content.append('p')
                .text(`- ${child.data.name}`);
        });
    } else {
        content.append('p')
            .text(`Value: ${d.data.value}`);
    }
}

function displayErrorMessage(message) {
    const errorDiv = d3.select('body').append('div')
        .attr('class', 'error-message')
        .style('background-color', 'red')
        .style('color', 'white')
        .style('padding', '10px')
        .style('position', 'fixed')
        .style('top', '10px')
        .style('right', '10px')
        .style('border-radius', '5px')
        .style('z-index', '1000')
        .style('max-width', '300px');

    errorDiv.append('p')
        .text(message);

    errorDiv.append('button')
        .text('Close')
        .on('click', function() {
            errorDiv.remove();
        });

    // Automatically remove the error message after 10 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 10000);
}

function applyFilters() {
    // Implement filtering logic here
    console.log('Filters applied');
}

function exportData() {
    // Implement data export logic here
    console.log('Data exported');
}

// Make sure to add these functions to your global scope if needed
window.applyFilters = applyFilters;
window.exportData = exportData;