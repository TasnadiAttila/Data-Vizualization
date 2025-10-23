Promise.all([
    d3.csv('./data/Formula1_2022season_qualifyingResults.csv'),
])
.then(([quaily22]) => {
    // --- Adatfeldolgozás ---
    quaily22.forEach(q => {
        q.Position = q.Position === "NC" ? 20 : +q.Position;
    });

    const allTeams = [...new Set(quaily22.map(d => d.Team))];

    let currentTeam = 'Ferrari';
    let isBarChart = false;

    const width = 800;
    const height = 400;
    const margin = { top: 50, right: 50, bottom: 150, left: 50 };

    const body = d3.select('body');
    body.style('width', `${width}px`);

    const vizContainer = body.append('div')
        .attr('id', 'viz-container')
        .style('margin-top', '5px');

    function updateTeamSelectorPosition() {
        d3.select('#team-select-container')
            .style('text-align', 'center')
            .style('width', `${width}px`)
            .style('margin', `0`);

        d3.select('#view-toggle-container')
            .style('width', `${width}px`)
            .style('margin-left', `230px`);
    }

    function createTeamSelect() {
        const teamSelectContainer = body.append('div')
            .attr('id', 'team-select-container')
            .style('margin-top', '20px');

        const teamSelect = teamSelectContainer.append('select')
            .attr('id', 'team-select');

        teamSelect.selectAll('option')
            .data(allTeams)
            .enter()
            .append('option')
            .attr('value', d => d)
            .text(d => d);

        teamSelect.property('value', currentTeam);

        teamSelect.on('change', function() {
            currentTeam = this.value;
            updateGraph(currentTeam);
        });

        updateTeamSelectorPosition();
    }

    function createViewToggle() {
        const toggleContainer = body.insert('div', '#viz-container') 
            .attr('id', 'view-toggle-container');

        toggleContainer.append('input')
            .attr('type', 'checkbox')
            .attr('id', 'bar-chart-toggle')
            .property('checked', isBarChart)
            .on('change', function() {
                isBarChart = this.checked;
                updateGraph(currentTeam);
            });

        toggleContainer.append('label')
            .attr('for', 'bar-chart-toggle')
            .text(' Oszlopdiagram (Bar Chart) megjelenítése');
    }

    const allTracks = [...new Set(quaily22.map(d => d.Track))];

    const x = d3.scalePoint()
        .domain(allTracks)
        .range([margin.left, width - margin.right])
        .padding(0.5);

    const y = d3.scaleLinear()
        .domain([20, 1])
        .range([height - margin.bottom, margin.top]);

    // 🎨 Csapatszínek
    const teamColors = {
        "Ferrari": ['#DC0000', '#FF4F4F'],
        "Red Bull Racing RBPT": ['#1E41FF', '#FFB800'],
        "Mercedes": ['#00D2BE', '#007F7F'],
        "Alfa Romeo Ferrari": ['#900000', '#C50000'],
        "Haas Ferrari": ['#4a4848ff', '#C0C0C0'],
        "Alpine Renault": ['#0090FF', '#64C8FF'],
        "AlphaTauri RBPT": ['#2B4562', '#A0C4FF'],
        "McLaren Mercedes": ['#FF8700', '#FFB36B'],
        "Williams Mercedes": ['#005AFF', '#5F8FFF'],
        "Aston Martin Aramco Mercedes": ['#006F62', '#00B08B']
    };

    const color = d3.scaleOrdinal();

    const line = d3.line()
        .x(d => x(d.Track))
        .y(d => y(d.Position));

    const svg = vizContainer.append('svg')
        .attr('width', width)
        .attr('height', height - 50)
        .style('display', 'block')
        .style('margin', '0');

    const linesGroup = svg.append('g').attr('class', 'lines-group');
    const dotsGroup = svg.append('g').attr('class', 'dots-group');
    const barsGroup = svg.append('g').attr('class', 'bars-group').style('visibility', 'hidden');

    const xAxisGroup = svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${height - margin.bottom})`);

    const yAxisGroup = svg.append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${margin.left}, 0)`);

    yAxisGroup.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 15 - margin.left)
        .attr('x', - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('fill', 'black')
        .style('font-size', '12px');

    const tooltip = body.append("div")
        .attr('class', 'tooltip')
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "white")
        .style("border", "1px solid #ccc")
        .style("padding", "6px")
        .style("border-radius", "4px")
        .style("font-size", "12px");

    function transformDataForGraph(team) {
        const teamData = quaily22.filter(d => d.Team === team);
        const driversGrouped = d3.group(teamData, d => d.Driver);

        return Array.from(driversGrouped, ([name, records]) => ({
            name,
            team: records[0].Team,
            data: records.map(r => {
                const originalRecord = quaily22.find(rec => 
                    rec.Track === r.Track && 
                    rec.Driver === name && 
                    rec.Team === team
                );

                return {
                    Track: r.Track,
                    Position: r.Position,
                    originalPosition: originalRecord.Position,
                    isNC: r.Position === 20 && originalRecord.Position === "NC"
                };
            }).sort((a, b) => allTracks.indexOf(a.Track) - allTracks.indexOf(b.Track))
        }));
    }

    function createGraph(team) {
        updateGraph(team);
    }

    function updateGraph(team) {
        const drivers = transformDataForGraph(team);
        const driverNames = drivers.map(d => d.name);

        color.domain(driverNames);
        color.range(teamColors[team] || ['#888', '#CCC']); // fallback színek

        const currentTracks = [...new Set(drivers.flatMap(d => d.data.map(r => r.Track)))];
        x.domain(currentTracks);

        xAxisGroup
            .transition().duration(500)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-45)");

        yAxisGroup
            .transition().duration(500)
            .call(d3.axisLeft(y).tickValues(d3.range(1, 21, 1)));

        linesGroup.selectAll('*').remove();
        dotsGroup.selectAll('*').remove();
        barsGroup.selectAll('*').remove();

        if (isBarChart) {
            const xStep = x.step();
            const groupWidth = xStep * 0.8;

            const x1 = d3.scaleBand()
                .domain(driverNames)
                .rangeRound([0, groupWidth])
                .padding(0.1);

            drivers.forEach(driver => {
                barsGroup.selectAll(`.bar-${driver.name.replace(/\s/g, '')}`)
                    .data(driver.data) 
                    .enter()
                    .append('rect')
                    .attr('class', d => `bar-${driver.name.replace(/\s/g, '')}`)
                    .attr('x', d => x(d.Track) - groupWidth / 2 + x1(driver.name))
                    .attr('y', d => y(d.Position))
                    .attr('width', x1.bandwidth())
                    .attr('height', d => (height - margin.bottom) - y(d.Position)) 
                    .attr('fill', color(driver.name))
                    .on("mouseover", (event, d) => {
                        const positionText = d.isNC ? "NC (Not Classified)" : `Position: ${d.originalPosition}`;
                        tooltip.html(`<strong>${driver.name}</strong><br>${driver.team}<br>${positionText}`)
                            .style("visibility", "visible");
                    })
                    .on("mousemove", (event) => {
                        tooltip.style("top", (event.pageY + 10) + "px")
                            .style("left", (event.pageX + 10) + "px");
                    })
                    .on("mouseout", () => tooltip.style("visibility", "hidden"));
            });

            linesGroup.style('visibility', 'hidden');
            dotsGroup.style('visibility', 'hidden');
            barsGroup.style('visibility', 'visible');

        } else {
            drivers.forEach(driver => {
                linesGroup.append("path")
                    .datum(driver.data)
                    .attr("class", `line-${driver.name.replace(/\s/g, '')}`)
                    .attr("fill", "none")
                    .attr("stroke", color(driver.name))
                    .attr("stroke-width", 2)
                    .attr("d", line);

                dotsGroup.selectAll(`.dot-${driver.name.replace(/\s/g, '')}`)
                    .data(driver.data)
                    .enter()
                    .append("circle")
                    .attr("class", `dot-${driver.name.replace(/\s/g, '')}`)
                    .attr('cx', d => x(d.Track))
                    .attr('cy', d => y(d.Position))
                    .attr("r", d => d.isNC ? 5 : 3)
                    .attr("fill", d => d.isNC ? "black" : color(driver.name))
                    .attr("stroke", d => d.isNC ? "white" : "none")
                    .attr("stroke-width", d => d.isNC ? 1 : 0)
                    .on("mouseover", (event, d) => {
                        const positionText = d.isNC ? "NC (Not Classified)" : `Position: ${d.originalPosition}`;
                        tooltip.html(`<strong>${driver.name}</strong><br>${driver.team}<br>${positionText}`)
                            .style("visibility", "visible");
                    })
                    .on("mousemove", (event) => {
                        tooltip.style("top", (event.pageY + 10) + "px")
                            .style("left", (event.pageX + 10) + "px");
                    })
                    .on("mouseout", () => tooltip.style("visibility", "hidden"));
            });

            linesGroup.style('visibility', 'visible');
            dotsGroup.style('visibility', 'visible');
            barsGroup.style('visibility', 'hidden');
        }

        updateTeamSelectorPosition();
    }

    // --- Inicializáció ---
    createViewToggle();
    createTeamSelect();
    createGraph(currentTeam);

    window.addEventListener('resize', updateTeamSelectorPosition);
})
.catch(error => {
    console.error('Error loading the data:', error);
});
