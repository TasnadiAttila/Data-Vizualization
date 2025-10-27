Promise.all([
  d3.csv("./data/Formula1_2022season_driverOfTheDayVotes.csv"),
  d3.csv("./data/Formula1_2023season_driverOfTheDayVotes.csv"),
  d3.csv("./data/Formula1_2024season_driverOfTheDayVotes.csv"),
])
  .then(([dotd22, dotd23, dotd24]) => {
    const datasets = {
      2022: dotd22,
      2023: dotd23,
      2024: dotd24,
    };

    let currentYear = 2022;

    const dotdPanel = d3.select("#driver-of-the-day-panel");

    const vizContainer = dotdPanel
      .append("div")
      .attr("id", "dotd-viz-container")
      .style("margin-top", "5px");

    vizContainer
      .append("label")
      .attr("for", "svg")
      .style("margin-right", "8px")
      .text("Driver of the Day Votes Distribution");

    function createYearSelect() {
      const yearSelectContainer = dotdPanel
        .append("div")
        .attr("id", "dotd-year-select-container")
        .style("margin-top", "10px");

      yearSelectContainer
        .append("label")
        .attr("for", "dotd-year-select")
        .style("margin-right", "8px")
        .text("Select Year:");

      const yearSelect = yearSelectContainer
        .append("select")
        .attr("id", "dotd-year-select")
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
        updateGraph();
      });
    }

    const svg = vizContainer
      .append("svg")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("display", "block")
      .style("margin", "0 auto")
      .style("width", "546px")
      .style("height", "420px");

    const g = svg.append("g");

    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "white")
      .style("border", "1px solid #ccc")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px");

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    function setDimensions() {
      chartWidth = 546;
      chartHeight = 420;
      svg.attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`);
    }

    function aggregateDriverOfTheDay(year) {
      const ds = datasets[year];
      const driverVotes = {};

      ds.forEach((row) => {
        const driver = row["1st Place"];
        const votes = +row["1st Place(%)"];

        if (driver && votes) {
          if (!driverVotes[driver]) {
            driverVotes[driver] = 0;
          }
          driverVotes[driver] += votes;
        }
      });

      // Calculate total votes and normalize to 100%
      const totalVotes = Object.values(driverVotes).reduce((a, b) => a + b, 0);

      return Object.entries(driverVotes)
        .map(([driver, votes]) => ({
          driver,
          votes: (votes / totalVotes) * 100, // Normalize to 0-100 range
        }))
        .sort((a, b) => b.votes - a.votes);
    }

    function updateGraph() {
      setDimensions();

      const data = aggregateDriverOfTheDay(currentYear);
      const radius = Math.min(chartWidth, chartHeight) / 2 - 80;

      g.selectAll("*").remove();

      g.attr("transform", `translate(${chartWidth / 2}, ${chartHeight / 2})`);

      const pie = d3.pie().value((d) => d.votes);
      const arc = d3.arc().innerRadius(0).outerRadius(radius);

      const arcs = g
        .selectAll(".arc")
        .data(pie(data))
        .enter()
        .append("g")
        .attr("class", "arc");

      arcs
        .append("path")
        .attr("d", arc)
        .attr("fill", (d) => color(d.data.driver))
        .on("mouseover", (event, d) => {
          tooltip
            .html(
              `<strong>${
                d.data.driver
              }</strong><br>Votes: ${d.data.votes.toFixed(1)}%`
            )
            .style("visibility", "visible");
        })
        .on("mousemove", (event) => {
          tooltip
            .style("top", event.pageY + 10 + "px")
            .style("left", event.pageX + 10 + "px");
        })
        .on("mouseout", () => tooltip.style("visibility", "hidden"));

      // Add labels with names and percentages on the outside
      arcs
        .append("text")
        .attr("transform", (d) => {
          const angle = (d.startAngle + d.endAngle) / 2;
          const x = Math.cos(angle - Math.PI / 2) * (radius + 50);
          const y = Math.sin(angle - Math.PI / 2) * (radius + 50);
          return `translate(${x}, ${y})`;
        })
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "black")
        .style("pointer-events", "none")
        .text((d) => `${d.data.driver}\n${d.data.votes.toFixed(1)}%`);

      // Add lines from pie to labels for better visibility
      arcs
        .append("line")
        .attr("x1", (d) => arc.centroid(d)[0])
        .attr("y1", (d) => arc.centroid(d)[1])
        .attr("x2", (d) => {
          const angle = (d.startAngle + d.endAngle) / 2;
          return Math.cos(angle - Math.PI / 2) * (radius + 45);
        })
        .attr("y2", (d) => {
          const angle = (d.startAngle + d.endAngle) / 2;
          return Math.sin(angle - Math.PI / 2) * (radius + 45);
        })
        .style("stroke", "black")
        .style("stroke-width", "1px")
        .style("opacity", "0.5");
    }

    createYearSelect();
    updateGraph();

    // Debounced resize handler
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => updateGraph(), 100);
    });
  })
  .catch((error) => {
    console.error("Error loading Driver of the Day data:", error);
  });
