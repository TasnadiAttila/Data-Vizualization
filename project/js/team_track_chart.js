{
  Promise.all([
    d3.csv("./data/Formula1_2022season_raceResults.csv"),
    d3.csv("./data/Formula1_2023season_raceResults.csv"),
    d3.csv("./data/Formula1_2024season_raceResults.csv"),
    // Use title-cased filename to avoid case-sensitivity issues on some hosts
    d3.csv("./data/Formula1_2025Season_RaceResults.csv"),
  ])
    .then(([r22, r23, r24, r25]) => {
      const datasets = {
        2022: r22,
        2023: r23,
        2024: r24,
        2025: r25,
      };

      Object.values(datasets).forEach((ds) => {
        ds.forEach((r) => {
          r.originalPosition = r.Position;
          r.Position = r.Position === "NC" ? 20 : +r.Position;
        });
      });

      let currentYear = 2022;
      let currentTeam = "Ferrari";

      // Dimensions will be computed from container for responsiveness
      let chartWidth = 800;
      let chartHeight = 400;
      let margin = { top: 40, right: 24, bottom: 140, left: 48 };

      const teamPanel = d3.select("#team-panel");

      const vizContainer = teamPanel
        .append("div")
        .attr("id", "team-viz-container")
        .style("margin-top", "5px");

      vizContainer
        .append("label")
        .attr("for", "svg")
        .style("margin-right", "8px")
        .text("Race Results by Track");

      function updateTeamSelectorPosition() {
        d3.select("#team-select-container")
          .style("display", null)
          .style("margin", null);

        d3.select("#year-select-container")
          .style("display", null)
          .style("margin", null);
      }

      function createTeamSelect() {
        const teamSelectContainer = teamPanel
          .append("div")
          .attr("id", "team-select-container");

        teamSelectContainer
          .append("label")
          .attr("for", "team-select-2")
          .style("margin-right", "8px")
          .text("Select team:");

        const teamSelect = teamSelectContainer
          .append("select")
          .attr("id", "team-select-2")
          .style("width", "210px");

        function populateTeamOptions() {
          const ds = datasets[currentYear];
          const teams = [...new Set(ds.map((d) => d.Team))].sort();

          const options = teamSelect.selectAll("option").data(teams, (d) => d);

          options
            .enter()
            .append("option")
            .attr("value", (d) => d)
            .text((d) => d);

          options.exit().remove();

          if (!teams.includes(currentTeam)) {
            currentTeam = teams[0] || "";
          }

          teamSelect.property("value", currentTeam);
        }

        teamSelect.on("change", function () {
          currentTeam = this.value;
          updateGraph(currentTeam);
        });

        populateTeamOptions();
        createTeamSelect.populateTeamOptions = populateTeamOptions;

        updateTeamSelectorPosition();
      }

      // View toggle removed: always show bar chart

      const x = d3
        .scalePoint()
        .domain([])
        .range([margin.left, chartWidth - margin.right])
        .padding(0.5);

      const y = d3
        .scaleLinear()
        .domain([20, 1])
        .range([chartHeight - margin.bottom, margin.top]);

      const teamColors = {
        Ferrari: ["#DC0000", "#FF4F4F"],
        "Red Bull Racing RBPT": ["#1E41FF", "#FFB800"],
        Mercedes: ["#00D2BE", "#007F7F"],
        "Alfa Romeo Ferrari": ["#900000", "#C50000"],
        "Haas Ferrari": ["#4a4848ff", "#C0C0C0"],
        "Alpine Renault": ["#0090FF", "#64C8FF"],
        "AlphaTauri RBPT": ["#2B4562", "#A0C4FF"],
        "McLaren Mercedes": ["#FF8700", "#FFB36B"],
        "Williams Mercedes": ["#005AFF", "#5F8FFF"],
        "Aston Martin Aramco Mercedes": ["#006F62", "#00B08B"],
      };

      const color = d3.scaleOrdinal();

      const svg = vizContainer
        .append("svg")
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("display", "block")
        .style("margin", "0");

      const barsGroup = svg.append("g").attr("class", "bars-group");

      const xAxisGroup = svg
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${chartHeight - margin.bottom})`);

      const yAxisGroup = svg
        .append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${margin.left}, 0)`);

      const yLabel = yAxisGroup
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 15 - margin.left)
        .attr("x", -(chartHeight / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("fill", "black")
        .style("font-size", "12px");

      const tooltip = d3
        .select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "white")
        .style("border", "1px solid #ccc")
        .style("padding", "6px")
        .style("border-radius", "4px")
        .style("font-size", "12px");

      function transformDataForGraph(team) {
        const ds = datasets[currentYear];
        const teamData = ds.filter((d) => d.Team === team);
        const driversGrouped = d3.group(teamData, (d) => d.Driver);

        const tracksThisYear = [...new Set(ds.map((d) => d.Track))];

        return Array.from(driversGrouped, ([name, records]) => ({
          name,
          team: records[0].Team,
          data: records
            .map((r) => ({
              Track: r.Track,
              Position: r.Position,
              originalPosition: r.originalPosition,
              isNC: r.originalPosition === "NC",
            }))
            .sort(
              (a, b) =>
                tracksThisYear.indexOf(a.Track) -
                tracksThisYear.indexOf(b.Track)
            ),
        }));
      }

      function createYearSelect() {
        const yearSelectContainer = teamPanel
          .append("div")
          .attr("id", "year-select-container")
          .style("margin-top", "10px");

        yearSelectContainer
          .append("label")
          .attr("for", "year-select-2")
          .style("margin-right", "8px")
          .text("Select Year:");

        const yearSelect = yearSelectContainer
          .append("select")
          .attr("id", "year-select-2")
          .style("width", "210px");

        const years = Object.keys(datasets)
          .map((y) => +y)
          .sort();

        yearSelect
          .selectAll("option")
          .data(years)
          .enter()
          .append("option")
          .attr("value", (d) => d)
          .text((d) => d);

        yearSelect.property("value", currentYear);

        yearSelect.on("change", function () {
          currentYear = +this.value;

          if (createTeamSelect && createTeamSelect.populateTeamOptions) {
            createTeamSelect.populateTeamOptions();
          }

          updateGraph(currentTeam);
        });
      }

      function setDimensions() {
        // Get panel width and compute chart dimensions
        const panelNode = teamPanel.node();
        const panelWidth = panelNode
          ? panelNode.getBoundingClientRect().width
          : 800;
        chartWidth = Math.max(320, Math.floor(panelWidth - 24));
        // Height scales with width; leave room for axis labels
        chartHeight = Math.max(280, Math.floor(chartWidth * 0.55));

        // Adjust bottom margin slightly for narrow screens (more rotation on ticks)
        margin.bottom = chartWidth < 560 ? 170 : 140;

        // Update ranges
        x.range([margin.left, chartWidth - margin.right]);
        y.range([chartHeight - margin.bottom, margin.top]);

        // Update svg viewBox
        svg.attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`);

        // Update axis group positions and y label position
        xAxisGroup.attr(
          "transform",
          `translate(0, ${chartHeight - margin.bottom})`
        );
        yAxisGroup.attr("transform", `translate(${margin.left}, 0)`);
        yLabel.attr("x", -(chartHeight / 2));
      }

      function updateGraph(team) {
        // Ensure dimensions are set before drawing
        setDimensions();

        const drivers = transformDataForGraph(team);
        const driverNames = drivers.map((d) => d.name);

        color.domain(driverNames);
        color.range(
          (teamColors[team] || ["#888", "#CCC"]).slice(
            0,
            Math.max(1, driverNames.length)
          )
        );

        const currentTracks = [
          ...new Set(drivers.flatMap((d) => d.data.map((r) => r.Track))),
        ];
        x.domain(currentTracks);

        const rotateAngle = chartWidth < 600 ? -60 : -45;
        xAxisGroup
          .transition()
          .duration(300)
          .call(d3.axisBottom(x))
          .selectAll("text")
          .attr("text-anchor", "end")
          .attr("transform", `rotate(${rotateAngle})`)
          .style("font-size", chartWidth < 480 ? "9px" : "11px");

        yAxisGroup
          .transition()
          .duration(300)
          .call(d3.axisLeft(y).tickValues(d3.range(1, 21, 1)));

        // clear any previous bars
        barsGroup.selectAll("*").remove();

        // Render grouped bar chart only
        const xStep = x.step();
        const groupWidth = xStep * 0.8;

        const x1 = d3
          .scaleBand()
          .domain(driverNames)
          .rangeRound([0, groupWidth])
          .padding(0.1);

        drivers.forEach((driver) => {
          barsGroup
            .selectAll(`.bar-${driver.name.replace(/\s/g, "")}`)
            .data(driver.data)
            .enter()
            .append("rect")
            .attr("class", (d) => `bar-${driver.name.replace(/\s/g, "")}`)
            .attr("x", (d) => x(d.Track) - groupWidth / 2 + x1(driver.name))
            .attr("y", (d) => y(d.Position))
            .attr("width", x1.bandwidth())
            .attr("height", (d) => chartHeight - margin.bottom - y(d.Position))
            .attr("fill", color(driver.name))
            .on("mouseover", (event, d) => {
              const positionText = d.isNC
                ? "NC (Not Classified)"
                : `Position: ${d.originalPosition}`;
              tooltip
                .html(
                  `<strong>${driver.name}</strong><br>${driver.team}<br>${positionText}`
                )
                .style("visibility", "visible");
            })
            .on("mousemove", (event) => {
              tooltip
                .style("top", event.pageY + 10 + "px")
                .style("left", event.pageX + 10 + "px");
            })
            .on("mouseout", () => tooltip.style("visibility", "hidden"));
        });

        updateTeamSelectorPosition();
      }

      createYearSelect();
      createTeamSelect();
      updateGraph(currentTeam);

      // Debounced resize handler to reflow chart
      let resizeTimer;
      window.addEventListener("resize", () => {
        updateTeamSelectorPosition();
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => updateGraph(currentTeam), 100);
      });
    })
    .catch((error) => {
      console.error("Error loading race results data:", error);
    });
}
