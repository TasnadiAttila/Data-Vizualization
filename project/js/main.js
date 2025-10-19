Promise.all([
    d3.csv('./data/Formula1_2022season_qualifyingResults.csv'),
])
.then(([quaily22]) => {
    quaily22.forEach(q => {
        // Convert Position to number, but handle "NC" values by setting them to 20
        q.Position = q.Position === "NC" ? 20 : +q.Position;
    });

    // Csapatok listája asd
    const allTeams = [...new Set(quaily22.map(d => d.Team))];

    // Create a container for the visualization
    const vizContainer = d3.select('body').append('div')
        .attr('id', 'viz-container')
        .style('margin-top', '20px');

    // Kezdetben a Ferrari csapat adataival dolgozunk
    let currentTeam = 'Ferrari';
    createGraph(currentTeam);  // Csak egyszer hozzuk létre a diagramot

    // Function to update the position of the team selector
    function updateTeamSelectorPosition() {
        d3.select('#team-select-container')
            .style('padding-left', `325px`);
    }

    // Eseménykezelő a csapatválasztáshoz
    function createTeamSelect() {
        // Legördülő menü (select) létrehozása a csapatokhoz
        const teamSelectContainer = d3.select('body').append('div')
            .attr('id', 'team-select-container')  // Fix div elem, ami körbeveszi a selectet
            .style('margin-top', '20px');  // A diagram és a legördülő menü közötti távolság

        const teamSelect = teamSelectContainer.append('select')
            .attr('id', 'team-select')
            .style('display', 'inline-block')  // Inline blokk, hogy középre igazodjon
            .style('margin', '0 auto');  // Középre igazítás

        teamSelect.selectAll('option')
            .data(allTeams)
            .enter()
            .append('option')
            .attr('value', d => d)
            .text(d => d);

        // Eseménykezelő a csapatválasztáshoz
        teamSelect.on('change', function() {
            currentTeam = this.value;
            updateGraph(currentTeam);  // Frissítjük a diagramot csapatváltáskor
        });

        // Set initial position
        updateTeamSelectorPosition();
    }

    // Hozzuk létre egyszer a teamSelect legördülő menüt
    createTeamSelect();

    // Add window resize listener to update position when window is resized
    window.addEventListener('resize', updateTeamSelectorPosition);

    // A diagram inicializálása
    function createGraph(team) {
        // Szűrés a kiválasztott csapatra
        const teamData = quaily22.filter(d => d.Team === team);

        // Versenyzők csoportosítása név szerint
        const driversGrouped = d3.group(teamData, d => d.Driver);

        // Kivesszük az egyes versenyzők adatait
        const drivers = Array.from(driversGrouped, ([name, records]) => ({
            name,
            team: records[0].Team,
            data: records.map(r => ({
                Track: r.Track,
                Position: r.Position,
                // Add a flag to identify NC values
                isNC: r.Position === 20 && records.find(rec => rec.Track === r.Track && rec.Position === "NC")
            }))
        }));

        // --- Vonalrajzolás ---
        const width = 800;
        const height = 400;

        // SVG elhelyezése a konténerben
        const svg = vizContainer.append('svg')
            .attr('width', width)
            .attr('height', height + 20)
            .style('display', 'block')  // Középre igazítjuk a diagramot
            .style('margin-left', '0px');  // Balra igazítjuk

        const allTracks = [...new Set(teamData.map(d => d.Track))];

        const x = d3.scalePoint()
            .domain(allTracks)
            .range([50, width - 50]);

        const y = d3.scaleLinear()
            .domain([20, 1])
            .range([height - 50, 50]);

        // Define the line - now all points will be connected
        const line = d3.line()
            .x(d => x(d.Track))
            .y(d => y(d.Position));

        // Színek hozzárendelése
        const color = d3.scaleOrdinal()
            .domain(drivers.map(d => d.name))
            .range(['darkred', 'lightcoral']);  // első versenyző sötétebb, második világosabb

        // Tengelyek
        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${height - 50})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-45)");

        svg.append('g')
            .attr('class', 'y-axis')
            .attr('transform', `translate(50, 0)`)
            .call(d3.axisLeft(y).tickValues(d3.range(1, 21, 1)));

        // Tooltip
        const tooltip = d3.select("body")
            .append("div")
            .attr('class', 'tooltip')
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background-color", "white")
            .style("border", "1px solid #ccc")
            .style("padding", "6px")
            .style("border-radius", "4px")
            .style("font-size", "12px");

        // Create a group for the lines
        const linesGroup = svg.append('g').attr('class', 'lines-group');
        
        // Create a group for the dots
        const dotsGroup = svg.append('g').attr('class', 'dots-group');

        // Rajzoljuk ki mindkét versenyzőt
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
                .attr("cx", d => x(d.Track))
                .attr("cy", d => y(d.Position))
                .attr("r", d => d.isNC ? 5 : 3) // Make NC dots slightly larger
                .attr("fill", d => d.isNC ? "black" : color(driver.name)) // Make NC dots black
                .attr("stroke", d => d.isNC ? "white" : "none") // Add white border to NC dots
                .attr("stroke-width", d => d.isNC ? 1 : 0)
                .on("mouseover", (event, d) => {
                    const positionText = d.isNC ? "NC (Not Classified)" : `Position: ${d.Position}`;
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
    }

    // Diagram frissítése
    function updateGraph(team) {
        // Szűrés a kiválasztott csapatra
        const teamData = quaily22.filter(d => d.Team === team);

        // Versenyzők csoportosítása név szerint
        const driversGrouped = d3.group(teamData, d => d.Driver);

        // Kivesszük az egyes versenyzők adatait
        const drivers = Array.from(driversGrouped, ([name, records]) => ({
            name,
            team: records[0].Team,
            data: records.map(r => ({
                Track: r.Track,
                Position: r.Position,
                // Add a flag to identify NC values
                isNC: r.Position === 20 && quaily22.find(rec => 
                    rec.Track === r.Track && 
                    rec.Driver === name && 
                    rec.Position === "NC"
                )
            }))
        }));

        // --- Vonalrajzolás ---
        const width = 800;
        const height = 400;

        // SVG elhelyezése a konténerben
        const svg = vizContainer.select('svg');

        const allTracks = [...new Set(teamData.map(d => d.Track))];

        const x = d3.scalePoint()
            .domain(allTracks)
            .range([50, width - 50]);

        const y = d3.scaleLinear()
            .domain([20, 1])
            .range([height - 50, 50]);

        // Define the line - now all points will be connected
        const line = d3.line()
            .x(d => x(d.Track))
            .y(d => y(d.Position));

        // Színek hozzárendelése
        const color = d3.scaleOrdinal()
            .domain(drivers.map(d => d.name))
            .range(['darkred', 'lightcoral']);  // első versenyző sötétebb, második világosabb

        // Tengelyek frissítése
        svg.select('.x-axis')
            .transition()
            .duration(500)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-45)");

        svg.select('.y-axis')
            .transition()
            .duration(500)
            .call(d3.axisLeft(y).tickValues(d3.range(1, 21, 1)));

        // Előző vonalak és pontok eltávolítása - csak a csoportok tartalmát
        svg.select('.lines-group').selectAll('*').remove();
        svg.select('.dots-group').selectAll('*').remove();

        // Tooltip
        const tooltip = d3.select('.tooltip');

        // Rajzoljuk ki mindkét versenyzőt
        drivers.forEach(driver => {
            // Vonal
            svg.select('.lines-group')
                .append("path")
                .datum(driver.data)
                .attr("class", `line-${driver.name.replace(/\s/g, '')}`)
                .attr("fill", "none")
                .attr("stroke", color(driver.name))
                .attr("stroke-width", 2)
                .attr("d", line);

            // Körök + tooltip
            svg.select('.dots-group')
                .selectAll(`.dot-${driver.name.replace(/\s/g, '')}`)
                .data(driver.data)
                .enter()
                .append("circle")
                .attr("class", `dot-${driver.name.replace(/\s/g, '')}`)
                .attr("cx", d => x(d.Track))
                .attr("cy", d => y(d.Position))
                .attr("r", d => d.isNC ? 5 : 3) // Make NC dots slightly larger
                .attr("fill", d => d.isNC ? "black" : color(driver.name)) // Make NC dots black
                .attr("stroke", d => d.isNC ? "white" : "none") // Add white border to NC dots
                .attr("stroke-width", d => d.isNC ? 1 : 0)
                .on("mouseover", (event, d) => {
                    const positionText = d.isNC ? "NC (Not Classified)" : `Position: ${d.Position}`;
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
        
        // Update the team selector position after updating the graph
        updateTeamSelectorPosition();
    }
})
.catch(error => {
    console.error('Error loading the data:', error);
});
