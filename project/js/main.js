Promise.all([
    d3.csv('./data/Formula1_2022season_qualifyingResults.csv'),
])
.then(([quaily22]) => {
    // --- Adatfeldolgozás ---
    quaily22.forEach(q => {
        // Convert Position to number, but handle "NC" values by setting them to 20
        q.Position = q.Position === "NC" ? 20 : +q.Position;
    });

    // Csapatok listája
    const allTeams = [...new Set(quaily22.map(d => d.Team))];

    // --- Globális állapot és konténerek ---
    let currentTeam = 'Ferrari';
    let isBarChart = false; // Kezdetben vonaldiagram
    const width = 800;
    const height = 400;
    const margin = { top: 50, right: 50, bottom: 150, left: 50 }; // Növelt bottom a tengely feliratokhoz

    const body = d3.select('body');

    // Create a container for the visualization
    const vizContainer = body.append('div')
        .attr('id', 'viz-container')
        .style('margin-top', '5px');

    // --- Team Select (Csapatválasztó) létrehozása ---
    function updateTeamSelectorPosition() {
        // A konténerek középre igazítása
        d3.select('#team-select-container')
            .style('text-align', 'center')
            .style('width', `${width}px`)
            .style('margin', `0`);
        
        d3.select('#view-toggle-container')
            .style('width', `${width}px`)
            .style('margin-left', `230px`); // Középre igazítjuk a toggle-t
    }

    function createTeamSelect() {
        // A select konténert a body végére illesztjük (sorrend számít)
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

        teamSelect.property('value', currentTeam); // Kezdeti érték beállítása

        teamSelect.on('change', function() {
            currentTeam = this.value;
            updateGraph(currentTeam);
        });

        // Set initial position
        updateTeamSelectorPosition();
    }

    // --- View Toggle (Nézetváltó) létrehozása ---
    function createViewToggle() {
        // Toggle-t a body-ban a #viz-container elé illesztjük
        const toggleContainer = body.insert('div', '#viz-container') 
            .attr('id', 'view-toggle-container');

        toggleContainer.append('input')
            .attr('type', 'checkbox')
            .attr('id', 'bar-chart-toggle')
            .property('checked', isBarChart)
            .on('change', function() {
                isBarChart = this.checked;
                updateGraph(currentTeam); // Frissítjük a diagramot a nézetváltáskor
            });
            
        toggleContainer.append('label')
            .attr('for', 'bar-chart-toggle')
            .text(' Oszlopdiagram (Bar Chart) megjelenítése'); // Szóköz a szöveg elején
    }

    // --- Tengelyek, Skálák, Színek létrehozása ---
    const allTracks = [...new Set(quaily22.map(d => d.Track))];
    const driversInTeam = ['Driver 1', 'Driver 2']; // A csapatoknak két versenyzője van általában

    const x = d3.scalePoint()
        .domain(allTracks)
        .range([margin.left, width - margin.right])
        .padding(0.5);

    const y = d3.scaleLinear()
        .domain([20, 1]) // 1 a legjobb pozíció, 20 a legrosszabb/NC
        .range([height - margin.bottom, margin.top]);

    const color = d3.scaleOrdinal()
        .domain(driversInTeam)
        .range(['#A71E2D', '#D84752']); // Alapértelmezett Ferrari színek

    const line = d3.line()
        .x(d => x(d.Track))
        .y(d => y(d.Position));

    // --- Diagram inicializálása ---
    const svg = vizContainer.append('svg')
        .attr('width', width)
        .attr('height', height-50)
        .style('display', 'block')
        .style('margin', '0'); // Középre igazítjuk

    const linesGroup = svg.append('g').attr('class', 'lines-group');
    const dotsGroup = svg.append('g').attr('class', 'dots-group');
    
    // Kezdetben elrejtjük az oszlopokat
    const barsGroup = svg.append('g').attr('class', 'bars-group').style('visibility', 'hidden'); 

    // Tengelyek
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

    // Tooltip
    const tooltip = body.append("div")
        .attr('class', 'tooltip')
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "white")
        .style("border", "1px solid #ccc")
        .style("padding", "6px")
        .style("border-radius", "4px")
        .style("font-size", "12px");

    // --- Diagram rajzoló/frissítő függvények ---
    function transformDataForGraph(team) {
        const teamData = quaily22.filter(d => d.Team === team);
        const driversGrouped = d3.group(teamData, d => d.Driver);

        const drivers = Array.from(driversGrouped, ([name, records]) => ({
            name,
            team: records[0].Team,
            data: records.map(r => {
                // Megkeressük az eredeti NC string értéket a tooltiphez (ha volt)
                const originalRecord = quaily22.find(rec => 
                    rec.Track === r.Track && 
                    rec.Driver === name && 
                    rec.Team === team
                );

                return {
                    Track: r.Track,
                    Position: r.Position, // Szám: 1-20
                    originalPosition: originalRecord.Position, // Eredeti érték (pl. "NC" vagy "1")
                    isNC: r.Position === 20 && originalRecord.Position === "NC"
                };
            }).sort((a, b) => allTracks.indexOf(a.Track) - allTracks.indexOf(b.Track))
        }));
        return drivers;
    }

    function createGraph(team) {
        updateGraph(team);
    }

    function updateGraph(team) {
        const drivers = transformDataForGraph(team);
        const driverNames = drivers.map(d => d.name);

        // Színskála frissítése a tényleges versenyzőkkel
        color.domain(driverNames);

        // x skála frissítése a csapat aktuális track-jeivel
        const currentTracks = [...new Set(drivers.flatMap(d => d.data.map(r => r.Track)))];
        x.domain(currentTracks);

        // Tengelyek frissítése
        xAxisGroup
            .transition().duration(500)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-45)");

        yAxisGroup
            .transition().duration(500)
            .call(d3.axisLeft(y).tickValues(d3.range(1, 21, 1)));

        // Tartalom törlése (elkerülve a duplikációt)
        linesGroup.selectAll('*').remove();
        dotsGroup.selectAll('*').remove();
        barsGroup.selectAll('*').remove();

        if (isBarChart) {
            // --- Oszlopdiagram (Bar Chart) logika ---
            
            // Calculate the spacing between x-axis points
            const xStep = x.step();
            const groupWidth = xStep * 0.8; // Use 80% of the step for the group
            
            // Csoportos skála a sávok szélességéhez
            const x1 = d3.scaleBand()
                .domain(driverNames)
                .rangeRound([0, groupWidth])
                .padding(0.1);
            
            // Iterálunk a versenyzőkön, majd az adataikon
            drivers.forEach(driver => {
                barsGroup.selectAll(`.bar-${driver.name.replace(/\s/g, '')}`)
                    .data(driver.data) 
                    .enter()
                    .append('rect')
                    .attr('class', d => `bar-${driver.name.replace(/\s/g, '')}`)
                    .attr('x', d => x(d.Track) - groupWidth/2 + x1(driver.name))
                    .attr('y', d => y(d.Position)) // Sáv teteje
                    .attr('width', x1.bandwidth())
                    // Sáv magassága az X-tengelytől a tetejéig
                    .attr('height', d => (height - margin.bottom) - y(d.Position)) 
                    .attr('fill', color(driver.name))
                    
                    // Tooltip
                    .on("mouseover", (event, d) => {
                        const positionText = d.isNC ? "NC (Not Classified)" : `Position: ${d.originalPosition}`;
                        tooltip.html(`<strong>${driver.name}</strong><br>${driver.team}<br>${positionText}`)
                            .style("visibility", "visible");
                    })
                    .on("mousemove", (event) => {
                        tooltip.style("top", (event.pageY + 10) + "px")
                            .style("left", (event.pageX + 10) + "px");
                    })
                    .on("mouseout", () => {
                        tooltip.style("visibility", "hidden");
                    });
            });

            // Eltüntetjük a vonaldiagram elemeit
            linesGroup.style('visibility', 'hidden');
            dotsGroup.style('visibility', 'hidden');
            barsGroup.style('visibility', 'visible'); // Láthatóvá tesszük

        } else {
            // --- Vonaldiagram (Line Chart) logika ---

            drivers.forEach(driver => {
                // Vonal
                linesGroup.append("path")
                    .datum(driver.data)
                    .attr("class", `line-${driver.name.replace(/\s/g, '')}`)
                    .attr("fill", "none")
                    .attr("stroke", color(driver.name))
                    .attr("stroke-width", 2)
                    .attr("d", line);

                // Körök + tooltip
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
                    .on("mouseout", () => {
                        tooltip.style("visibility", "hidden");
                    });
            });
            
            // Eltüntetjük az oszlopdiagram elemeit
            linesGroup.style('visibility', 'visible');
            dotsGroup.style('visibility', 'visible');
            barsGroup.style('visibility', 'hidden');
        }

        updateTeamSelectorPosition();
    }

    // --- Inicializáció ---
    // Sorrend: A toggle, majd a select, majd a diagram
    createViewToggle();
    createTeamSelect();
    createGraph(currentTeam);

    // Add window resize listener to update position when window is resized
    window.addEventListener('resize', updateTeamSelectorPosition);

})
.catch(error => {
    console.error('Error loading the data:', error);
});