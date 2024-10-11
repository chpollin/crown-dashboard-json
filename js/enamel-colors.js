document.addEventListener('DOMContentLoaded', function () {
    loadData();
});

let crownData = [];
let enamelColors = [];
let originalEnamelColors = [];
let colorScale;
let totalEnamelObjects = 0;
let currentColorData = null;
let plates = [];

function loadData() {
    const cachedData = localStorage.getItem('crownData');
    if (cachedData) {
        processEnamelData(JSON.parse(cachedData));
    } else {
        d3.json('data/crown_data.json')
            .then(data => {
                localStorage.setItem('crownData', JSON.stringify(data));
                processEnamelData(data);
            })
            .catch(handleError);
    }
}

function handleError(error) {
    console.error('Error loading data:', error);
    alert('Failed to load data.');
}

function processEnamelData(data) {
    crownData = data;
    const enamelData = crownData.filter(
        (d) => d.Medium && d.Medium.toLowerCase() === 'email'
    );

    totalEnamelObjects = enamelData.length;

    const colorCounts = {};
    enamelData.forEach((d) => {
        let color = d.ObjectName ? d.ObjectName.trim().toLowerCase() : 'unknown';
        color = standardizeColorName(color);

        if (!d.ObjectID || !d.Bestandteil) {
            return;
        }

        if (colorCounts[color]) {
            colorCounts[color].count += 1;
            colorCounts[color].objects.push(d);
        } else {
            colorCounts[color] = {
                colorName: color,
                count: 1,
                objects: [d],
            };
        }
    });

    enamelColors = Object.values(colorCounts);
    originalEnamelColors = enamelColors.slice(); // Preserve original data
    document.getElementById('totalColors').textContent = enamelColors.length;

    // Create color scale
    colorScale = d3
        .scaleOrdinal()
        .domain(enamelColors.map((d) => d.colorName))
        .range(d3.schemeCategory10);

    // Extract plates for filter
    plates = Array.from(
        new Set(
            enamelData.map((d) => d.Bestandteil).filter((plate) => plate)
        )
    ).sort();
    populatePlateFilter();
    createVisualization();
    createTimeline();  // You can still use the timeline chart for intervention data
}

function standardizeColorName(color) {
    const colorNameMapping = {
        'obla': 'opak blau',
        'tbla': 'transparent blau',
        'opak blue': 'opak blau',
        'transp. blue': 'transparent blau',
        'opak rot': 'opak rot',
        'transp. rot': 'transparent rot',
    };
    return colorNameMapping[color] || color;
}

function createVisualization() {
    const containerWidth = document.getElementById('colorChart').clientWidth;
    const svgWidth = containerWidth;
    const svgHeight = 400;
    const margin = { top: 50, right: 30, bottom: 100, left: 60 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    const svg = d3
        .select('#colorChart')
        .append('svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight);

    const chartGroup = svg
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const xScale = d3
        .scaleBand()
        .domain(enamelColors.map((d) => d.colorName))
        .range([0, width])
        .padding(0.2);

    const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(enamelColors, (d) => d.count)])
        .nice()
        .range([height, 0]);

    const bars = chartGroup
        .selectAll('.bar')
        .data(enamelColors)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (d) => xScale(d.colorName))
        .attr('y', yScale(0))
        .attr('width', xScale.bandwidth())
        .attr('height', 0)
        .attr('fill', (d) => colorScale(d.colorName))
        .on('click', (event, d) => {
            currentColorData = d;
            displayColorObjects(d);
        })
        .on('mouseover', function (event, d) {
            d3.select(this).attr('opacity', 0.7);
            showTooltip(event, d);
        })
        .on('mouseout', function () {
            d3.select(this).attr('opacity', 1);
            hideTooltip();
        })
        .transition()
        .duration(500)
        .attr('y', (d) => yScale(d.count))
        .attr('height', (d) => height - yScale(d.count));

    chartGroup
        .append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .attr('transform', 'rotate(45)')
        .style('text-anchor', 'start');

    chartGroup.append('g').call(d3.axisLeft(yScale));

    chartGroup
        .append('text')
        .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 40})`)
        .style('text-anchor', 'middle')
        .text('Enamel Colors');

    d3.select('#sortByName').on('click', debounce(() => {
        enamelColors.sort((a, b) => d3.ascending(a.colorName, b.colorName));
        updateVisualization();
    }, 300));

    d3.select('#sortByCount').on('click', debounce(() => {
        enamelColors.sort((a, b) => d3.descending(a.count, b.count));
        updateVisualization();
    }, 300));

    d3.select('#blueFilter').on('change', function () {
        if (this.checked) {
            enamelColors = originalEnamelColors.filter((d) =>
                d.colorName.includes('blau')
            );
        } else {
            enamelColors = originalEnamelColors.slice(); 
        }
        updateVisualization();
    });

    document.getElementById('searchInput').addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase();
        const filteredObjects = currentColorData.objects.filter(obj =>
            obj.ObjectID.toLowerCase().includes(searchTerm) || 
            obj.ObjectName.toLowerCase().includes(searchTerm)
        );
        displayColorObjects({ objects: filteredObjects });
    });

    function updateVisualization() {
        xScale.domain(enamelColors.map((d) => d.colorName));

        const bars = chartGroup.selectAll('.bar').data(enamelColors, (d) => d.colorName);

        bars
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', (d) => xScale(d.colorName))
            .attr('y', (d) => yScale(d.count))
            .attr('width', xScale.bandwidth())
            .attr('height', (d) => height - yScale(d.count))
            .attr('fill', (d) => colorScale(d.colorName))
            .merge(bars)
            .transition()
            .duration(500)
            .attr('x', (d) => xScale(d.colorName))
            .attr('y', (d) => yScale(d.count))
            .attr('width', xScale.bandwidth())
            .attr('height', (d) => height - yScale(d.count));

        bars
            .exit()
            .transition()
            .duration(500)
            .attr('height', 0)
            .attr('y', height)
            .remove();

        chartGroup
            .select('.x-axis')
            .transition()
            .duration(500)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .attr('transform', 'rotate(45)')
            .style('text-anchor', 'start');
    }
}

function createTimeline() {
    // Placeholder function for creating an interventions timeline
    // Add D3-based time visualization using interventions data
}

function displayColorObjects(colorData, filterPlate = 'all') {
    const tbody = d3.select('#colorObjectsTable tbody');
    tbody.html('');

    const filteredObjects =
        filterPlate === 'all'
            ? colorData.objects
            : colorData.objects.filter((obj) => obj.Bestandteil === filterPlate);

    filteredObjects.forEach((obj) => {
        tbody.append('tr').html(`
            <td>${obj.ObjectID}</td>
            <td>${obj.ObjectName}</td>
            <td>${obj.Bestandteil}</td>
            <td>${obj.Condition ? obj.Condition.Beschreibung : 'Unknown'}</td>
        `);
    });
}

function populatePlateFilter() {
    const plateFilter = d3.select('#plateFilter');

    plateFilter
        .selectAll('option.plate-option')
        .data(plates)
        .enter()
        .append('option')
        .attr('class', 'plate-option')
        .attr('value', (d) => d)
        .text((d) => d);

    plateFilter.on('change', function () {
        const selectedPlate = this.value;
        if (currentColorData) {
            displayColorObjects(currentColorData, selectedPlate);
        }
    });
}

function debounce(func, delay) {
    let timer;
    return function () {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, arguments), delay);
    };
}

// Tooltip functions
const tooltip = d3.select('.tooltip');

function showTooltip(event, d) {
    const totalObjects = d.count;
    const percentage = ((d.count / totalEnamelObjects) * 100).toFixed(2);
    tooltip
        .html(`
            <strong>${d.colorName}</strong><br>
            Count: ${totalObjects}<br>
            Percentage: ${percentage}%<br>
            Total Plates: ${d.objects.length ? d.objects[0].Bestandteil : 'Unknown'}
        `)
        .style('left', event.pageX + 10 + 'px')
        .style('top', event.pageY - 10 + 'px')
        .style('display', 'block');
}

function hideTooltip() {
    tooltip.style('display', 'none');
}
