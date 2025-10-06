Promise.all([
    d3.csv('/data/Formula1_2022season_qualifyingResults.csv'),
])
.then(([quaily22]) => {
    quaily22.forEach(q => q.Position = +q.Position);

    // Szűrés csak Ferrari csapatra
    const ferrariData = quaily22.filter(d => d.Team === 'Ferrari');

    // Versenyzők csoportosítása név szerint
    const driversGrouped = d3.group(ferrariData, d => d.Driver);

    // Kivesszük az egyes versenyzők adatait
    const drivers = Array.from(driversGrouped, ([name, records]) => ({
        name,
        team: records[0].Team,
        data: records.map(r => ({
            Track: r.Track,
            Position: r.Position
        }))
    }));

    // --- Vonalrajzolás ---
    const width = 800;
    const height = 400;

    const svg = d3.select('body').append('svg')
        .attr('width', width)
        .attr('height', height + 20);

    // Összes verseny neve (Track)
    const allTracks = [...new Set(ferrariData.map(d => d.Track))];

    const x = d3.scalePoint()
        .domain(allTracks)
        .range([50, width - 50]);

    const y = d3.scaleLinear()
        .domain([20, 1])
        .range([height - 50, 50]);

    const line = d3.line()
        .x(d => x(d.Track))
        .y(d => y(d.Position));

    // Színek hozzárendelése
    const color = d3.scaleOrdinal()
        .domain(drivers.map(d => d.name))
        .range(['darkred', 'lightcoral']);  // első versenyző sötétebb, második világosabb

    // Tengelyek
    svg.append('g')
        .attr('transform', `translate(0, ${height - 50})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-45)");

    svg.append('g')
        .attr('transform', `translate(50, 0)`)
        .call(d3.axisLeft(y).tickValues(d3.range(1, 21, 1)));

    // Tooltip
    const tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "white")
        .style("border", "1px solid #ccc")
        .style("padding", "6px")
        .style("border-radius", "4px")
        .style("font-size", "12px");

    // Rajzoljuk ki mindkét Ferrari versenyzőt
    drivers.forEach(driver => {
        // Vonal
        svg.append("path")
            .datum(driver.data)
            .attr("fill", "none")
            .attr("stroke", color(driver.name))
            .attr("stroke-width", 2)
            .attr("d", line);

        // Körök + tooltip
        svg.selectAll(`.dot-${driver.name.replace(/\s/g, '')}`)
            .data(driver.data)
            .enter()
            .append("circle")
            .attr("class", `dot-${driver.name.replace(/\s/g, '')}`)
            .attr("cx", d => x(d.Track))
            .attr("cy", d => y(d.Position))
            .attr("r", 3)
            .attr("fill", color(driver.name))
            .on("mouseover", (event, d) => {
                tooltip.html(`<strong>${driver.name}</strong><br>${driver.team}`)
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
})
.catch(error => {
    console.error('Error loading the data:', error);
});
