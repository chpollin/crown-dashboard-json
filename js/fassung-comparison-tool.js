document.addEventListener('DOMContentLoaded', function() {
            console.log('Initializing Fassung Comparison Tool');
            loadData();
        });

        let crownData = [];
        let fassungData = {};

        function loadData() {
            d3.json('data/crown_data.json').then(data => {
                crownData = data;
                processData();
                createTreemap();
            }).catch(error => {
                console.error('Error loading data:', error);
                alert('There was an error loading the data.');
            });
        }

        function processData() {
            fassungData = { name: "Fassungen", children: [] };

            const fassungTypeMap = {};
            crownData.forEach(d => {
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
                        size: 1,
                        data: obj
                    }))
                });
            }
        }

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

            const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

            const svg = d3.select('#treemapContainer')
                .append('svg')
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
                .attr('fill', d => colorScale(d.parent.data.name))
                .on('click', (event, d) => {
                    displayFassungDetails(d.data.data);
                })
                .on('mouseover', function(event, d) {
                    d3.select(this).attr('opacity', 0.8);
                    showTooltip(event, `${d.data.name} (${d.parent.data.name})`);
                })
                .on('mouseout', function() {
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

            window.addEventListener('resize', function() {
                d3.select('#treemapContainer').select('svg').remove();
                createTreemap(); // Redraw treemap on window resize
            });
        }

        // Tooltip functions
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

        function displayFassungDetails(fassungData) {
            const container = d3.select("#comparisonContainer");
            container.html("");

            const card = container.append("div")
                .attr("class", "fassung-card");

            card.append("h5")
                .text(`${fassungData.ObjectName || 'No Name'} - ${fassungData.Bestandteil || 'No Component'}`);

            card.append("img")
                .attr("src", getImagePath(fassungData))
                .attr("alt", fassungData.ObjectName || 'No Name');

            card.append("p")
                .text(fassungData.Description || "No description available");
        }

        function getImagePath(d) {
            if (d.Media && d.Media.length > 0 && d.Media[0].Path && d.Media[0].FileName) {
                return d.Media[0].Path + "/" + d.Media[0].FileName;
            } else {
                return "images/placeholder.png"; // Placeholder image
            }
        }