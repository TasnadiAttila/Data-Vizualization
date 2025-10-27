Promise.all([
  d3.csv("./data/Formula1_2022season_qualifyingResults.csv"),
  d3.csv("./data/Formula1_2023season_qualifyingResults.csv"),
  d3.csv("./data/Formula1_2024season_qualifyingResults.csv"),
  d3.csv("./data/Formula1_2025Season_QualifyingResults.csv"),
])
  .then(([quaily22, quaily23, quaily24, quaily25]) => {
    const datasets = {
      2022: quaily22,
      2023: quaily23,
      2024: quaily24,
      2025: quaily25,
    };

    Object.values(datasets).forEach((ds) => {
      ds.forEach((q) => {
        q.originalPosition = q.Position;
        q.Position = q.Position === "NC" ? 20 : +q.Position;
      });
    });

    let currentYear = 2022;
    let currentTeam = "Ferrari";

    // Responsive dimensions
    let chartWidth = 800;
    let chartHeight = 450;
    let margin = { top: 40, right: 24, bottom: 140, left: 48 };

    const qualPanel = d3.select("#qualifying-panel");
    const vizContainer = qualPanel
      .append("div")
      .attr("id", "viz-container")
      .style("margin-top", "5px");

    vizContainer
      .append("label")
      .attr("for", "svg")
      .style("margin-right", "8px")
      .text("Qualifying Results");

    function updateTeamSelectorPosition() {
      d3.select("#team-select-container")
        .style("display", null)
        .style("margin", null);

      d3.select("#year-select-container")
        .style("display", null)
        .style("margin", null);

      d3.select("#view-toggle-container")
        .style("display", null)
        .style("margin", null);
    }

    function createTeamSelect() {
      const teamSelectContainer = qualPanel
        .append("div")
        .attr("id", "team-select-container")
        .style("margin-top", "20px");

      teamSelectContainer
        .append("label")
        .attr("for", "team-select")
        .style("margin-right", "8px")
        .text("Select team:");

      const teamSelect = teamSelectContainer
        .append("select")
        .attr("id", "team-select")
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

    function createViewToggle() {
      const toggleContainer = vizContainer
        .insert("div", ":first-child")
        .attr("id", "view-toggle-container")
        .style("padding-bottom", "6px");

      toggleContainer
        .append("input")
        .attr("type", "checkbox")
        .attr("id", "bar-chart-toggle")
        .property("checked", isBarChart)
        .on("change", function () {
          isBarChart = this.checked;
          updateGraph(currentTeam);
        });

      toggleContainer
        .append("label")
        .attr("for", "bar-chart-toggle")
        .text(" Switch between Line Chart and Bar Chart");
    }

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
          .map((r) => {
            return {
              Track: r.Track,
              Position: r.Position,
              originalPosition: r.originalPosition,
              isNC: r.originalPosition === "NC",
            };
          })
          .sort(
            (a, b) =>
              tracksThisYear.indexOf(a.Track) - tracksThisYear.indexOf(b.Track)
          ),
      }));
    }

    function createYearSelect() {
      const yearSelectContainer = qualPanel
        .append("div")
        .attr("id", "year-select-container")
        .style("margin-top", "10px");

      yearSelectContainer
        .append("label")
        .attr("for", "year-select")
        .style("margin-right", "8px")
        .text("Select Year:");

      const yearSelect = yearSelectContainer
        .append("select")
        .attr("id", "year-select")
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

    function createGraph(team) {
      updateGraph(team);
    }

    function setDimensions() {
      const panelNode = qualPanel.node();
      const panelWidth = panelNode
        ? panelNode.getBoundingClientRect().width
        : 800;
      chartWidth = Math.max(320, Math.floor(panelWidth - 24));
      // Height scales with width; add extra vertical space for dense y ticks
      chartHeight = Math.max(360, Math.floor(chartWidth * 0.7));
      margin.bottom = chartWidth < 560 ? 170 : 140;

      x.range([margin.left, chartWidth - margin.right]);
      y.range([chartHeight - margin.bottom, margin.top]);

      svg.attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`);
      xAxisGroup.attr(
        "transform",
        `translate(0, ${chartHeight - margin.bottom})`
      );
      yAxisGroup.attr("transform", `translate(${margin.left}, 0)`);
      yLabel.attr("x", -(chartHeight / 2));
    }

    function updateGraph(team) {
      setDimensions();
      const drivers = transformDataForGraph(team);
      const driverNames = drivers.map((d) => d.name);

      color.domain(driverNames);
      color.range(teamColors[team] || ["#888", "#CCC"]);

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

      const tickStep = chartHeight >= 380 ? 1 : 2;
      const tickValues = d3.range(1, 21, tickStep);
      if (tickValues[tickValues.length - 1] !== 20) {
        tickValues.push(20);
      }

      yAxisGroup
        .transition()
        .duration(300)
        .call(d3.axisLeft(y).tickValues(tickValues));

      // clear previous bars
      barsGroup.selectAll("*").remove();

      // Render bars only
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
    createGraph(currentTeam);

    let resizeTimer;
    window.addEventListener("resize", () => {
      updateTeamSelectorPosition();
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => updateGraph(currentTeam), 100);
    });
  })
  .catch((error) => {
    console.error("Error loading the data:", error);
  });
