Promise.all([
    d3.csv('./data/Formula1_2022season_qualifyingResults.csv'),
    d3.csv('./data/Formula1_2023season_qualifyingResults.csv'),
    d3.csv('./data/Formula1_2024season_qualifyingResults.csv'),
    d3.csv('./data/Formula1_2025season_qualifyingResults.csv'),
])
.then(([quaily22, quaily23, quaily24, quaily25]) => {
    // --- Adatfeldolgozás ---
    // Normalize numeric Position values and NC flags for all loaded datasets
    const datasets = {
        2022: quaily22,
        2023: quaily23,
        2024: quaily24,
        2025: quaily25,
    };

    Object.values(datasets).forEach(ds => {
        ds.forEach(q => {
            // keep original raw value for tooltips/NC detection
            q.originalPosition = q.Position;
            q.Position = q.Position === "NC" ? 20 : +q.Position;
        });
    });

    let currentYear = 2022;
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
        // center the controls' parent so inline-block children are centered
        d3.select('body').style('text-align', 'center');

        d3.select('#team-select-container')
            .style('display', 'inline-block')
            .style('vertical-align', 'middle')
            .style('text-align', 'left')
            .style('width', null)
            .style('margin', '0 8px');

        d3.select('#year-select-container')
            .style('display', 'inline-block')
            .style('vertical-align', 'middle')
            .style('text-align', 'left')
            .style('width', null)
            .style('margin', '0 8px');

        // the toggle should be centered below the chart
        d3.select('#view-toggle-container')
            .style('display', 'block')
            .style('text-align', 'center')
            .style('margin', '12px auto');
    }

    function createTeamSelect() {
        const teamSelectContainer = body.append('div')
            .attr('id', 'team-select-container')
            .style('margin-top', '20px');

        teamSelectContainer.append('label')
            .attr('for', 'team-select')
            .style('margin-right', '8px')
            .text('Select team:');

        const teamSelect = teamSelectContainer.append('select')
            .attr('id', 'team-select')
            .style('width', '210px');

        // populate using current dataset
        function populateTeamOptions() {
            const ds = datasets[currentYear];
            const teams = [...new Set(ds.map(d => d.Team))].sort();

            const options = teamSelect.selectAll('option')
                .data(teams, d => d);

            options.enter()
                .append('option')
                .attr('value', d => d)
                .text(d => d);

            options.exit().remove();

            // Set selection to currentTeam if available, otherwise first team
            if (!teams.includes(currentTeam)) {
                currentTeam = teams[0] || '';
            }

            teamSelect.property('value', currentTeam);
        }

        teamSelect.on('change', function() {
            currentTeam = this.value;
            updateGraph(currentTeam);
        });

        populateTeamOptions();

        // Expose helper to update later when year changes
        createTeamSelect.populateTeamOptions = populateTeamOptions;

        updateTeamSelectorPosition();
    }

    function createViewToggle() {
        // append the toggle inside the viz container so it appears below the SVG
        const toggleContainer = vizContainer.append('div')
            .attr('id', 'view-toggle-container')
            .style('padding-bottom', '20px');

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
            .text(' Switch between Line Chart and Bar Chart');
    }

    const x = d3.scalePoint()
        .domain([])
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
        const ds = datasets[currentYear];
        const teamData = ds.filter(d => d.Team === team);
        const driversGrouped = d3.group(teamData, d => d.Driver);

        // determine track order for the selected year
        const tracksThisYear = [...new Set(ds.map(d => d.Track))];

        return Array.from(driversGrouped, ([name, records]) => ({
            name,
            team: records[0].Team,
            data: records.map(r => {
                // use preserved originalPosition on the same record
                return {
                    Track: r.Track,
                    Position: r.Position,
                    originalPosition: r.originalPosition,
                    isNC: r.originalPosition === "NC"
                };
            }).sort((a, b) => tracksThisYear.indexOf(a.Track) - tracksThisYear.indexOf(b.Track))
        }));
    }

    function createYearSelect() {
        const yearSelectContainer = body.insert('div', '#team-select-container')
            .attr('id', 'year-select-container')
            .style('margin-top', '10px');

        yearSelectContainer.append('label')
            .attr('for', 'year-select')
            .style('margin-right', '8px')
            .text('Select Year:');

        const yearSelect = yearSelectContainer.append('select')
            .attr('id', 'year-select')
            .style('width', '210px');

        const years = Object.keys(datasets).map(y => +y).sort();

        yearSelect.selectAll('option')
            .data(years)
            .enter()
            .append('option')
            .attr('value', d => d)
            .text(d => d);

        yearSelect.property('value', currentYear);

        yearSelect.on('change', function() {
            currentYear = +this.value;

            // repopulate team options based on new year
            if (createTeamSelect && createTeamSelect.populateTeamOptions) {
                createTeamSelect.populateTeamOptions();
            }

            // reset x domain to tracks for new year (will be set in updateGraph)
            updateGraph(currentTeam);
        });
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
    createYearSelect();
    createTeamSelect();
    createGraph(currentTeam);
    // create view toggle after the graph so it appears below the chart
    createViewToggle();

    window.addEventListener('resize', updateTeamSelectorPosition);
})
.catch(error => {
    console.error('Error loading the data:', error);
});
