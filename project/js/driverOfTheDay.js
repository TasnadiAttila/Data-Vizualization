Promise.all([
  d3.csv("./data/Formula1_2022season_driverOfTheDayVotes.csv"),
  d3.csv("./data/Formula1_2023season_driverOfTheDayVotes.csv"),
  d3.csv("./data/Formula1_2024season_driverOfTheDayVotes.csv"),
  d3.csv("./data/Formula1_2022season_drivers.csv"),
  d3.csv("./data/Formula1_2023season_drivers.csv"),
  d3.csv("./data/Formula1_2024season_drivers.csv"),
])
  .then(([dotd22, dotd23, dotd24, drivers22, drivers23, drivers24]) => {
    const datasets = {
      2022: dotd22,
      2023: dotd23,
      2024: dotd24,
    };

    const driverDatasets = {
      2022: drivers22,
      2023: drivers23,
      2024: drivers24,
    };

    // F1 Team Colors (official colors)
    const teamColors = {
      "Red Bull Racing": "#0600EF",
      Mercedes: "#00D2BE",
      Ferrari: "#DC0000",
      McLaren: "#FF8700",
      "Aston Martin": "#006C3E",
      Alpine: "#0082FA",
      "Alfa Romeo": "#900000",
      Williams: "#005AFF",
      Haas: "#FFFFFF",
      AlphaTauri: "#2B4562",
      Others: "#999999",
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

    // Build driver to team mapping
    let driverTeamMap = {};

    function buildDriverTeamMap(year) {
      driverTeamMap = {};
      const ds = driverDatasets[year];
      if (ds) {
        ds.forEach((row) => {
          if (row["Driver"] && row["Team"]) {
            driverTeamMap[row["Driver"]] = row["Team"];
          }
        });
      }
    }

    // Darken a color by a given percentage
    function darkenColor(color, percent) {
      const num = parseInt(color.replace("#", ""), 16);
      const amt = Math.round(2.55 * percent);
      const R = Math.max(0, (num >> 16) - amt);
      const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
      const B = Math.max(0, (num & 0x0000ff) - amt);
      return (
        "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
      );
    }

    function getTeamColor(driver, allData) {
      if (driver === "Others") {
        return teamColors["Others"];
      }
      const team = driverTeamMap[driver];
      const baseColor = teamColors[team] || "#999999";

      // Check if there are other drivers from the same team
      if (allData) {
        const teamDrivers = allData.filter((d) => {
          const dTeam = driverTeamMap[d.driver];
          return dTeam === team && d.driver !== "Others";
        });

        // If multiple drivers from same team, darken based on votes rank within the team
        if (teamDrivers.length > 1) {
          teamDrivers.sort((a, b) => b.votes - a.votes);
          const driverIndex = teamDrivers.findIndex((d) => d.driver === driver);
          // Invert: the one with less votes gets higher index, so they get darkened more
          const darkenAmount = 20 * (teamDrivers.length - 1 - driverIndex);
          if (darkenAmount > 0) {
            return darkenColor(baseColor, darkenAmount);
          }
        }
      }

      return baseColor;
    }

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

      let data = Object.entries(driverVotes)
        .map(([driver, votes]) => ({
          driver,
          votes: (votes / totalVotes) * 100, // Normalize to 0-100 range
        }))
        .sort((a, b) => b.votes - a.votes);

      // Group smaller drivers into "Others" category to reduce clutter
      // Keep individual drivers that have at least 3% of votes, rest goes to Others
      const minThreshold = 3;
      let topDrivers = [];
      let othersVotes = 0;

      data.forEach((d) => {
        if (d.votes >= minThreshold) {
          topDrivers.push(d);
        } else {
          othersVotes += d.votes;
        }
      });

      if (othersVotes > 0) {
        topDrivers.push({
          driver: "Others",
          votes: othersVotes,
        });
      }

      // Final sort by votes descending
      data = topDrivers.sort((a, b) => b.votes - a.votes);

      return data;
    }

    function updateGraph() {
      setDimensions();
      buildDriverTeamMap(currentYear);

      const data = aggregateDriverOfTheDay(currentYear);
      const radius = Math.min(chartWidth, chartHeight) / 2 - 80;

      g.selectAll("*").remove();
      svg.selectAll(".legend").remove();

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
        .attr("fill", (d) => getTeamColor(d.data.driver, data))
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

      // Add legend
      const legend = svg
        .selectAll(".legend")
        .data(data)
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);

      legend
        .append("rect")
        .attr("x", chartWidth - 140)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", (d) => getTeamColor(d.driver, data));

      legend
        .append("text")
        .attr("x", chartWidth - 120)
        .attr("y", 12)
        .style("font-size", "11px")
        .style("font-weight", "normal")
        .text((d) => `${d.driver}: ${d.votes.toFixed(1)}%`);

      // Add labels with names and percentages on the outside (only for larger segments)
      arcs
        .filter((d) => d.data.votes > 5) // Only show labels for segments > 5%
        .append("text")
        .attr("transform", (d) => {
          const angle = (d.startAngle + d.endAngle) / 2;
          const x = Math.cos(angle - Math.PI / 2) * (radius + 20);
          const y = Math.sin(angle - Math.PI / 2) * (radius + 20);
          return `translate(${x}, ${y})`;
        })
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("font-weight", "bold")
        .style("fill", "black")
        .style("pointer-events", "none")
        .text((d) => `${d.data.votes.toFixed(1)}%`);

      // Add lines from pie to labels for better visibility (only for larger segments)
      arcs
        .filter((d) => d.data.votes > 5)
        .append("line")
        .attr("x1", (d) => arc.centroid(d)[0])
        .attr("y1", (d) => arc.centroid(d)[1])
        .attr("x2", (d) => {
          const angle = (d.startAngle + d.endAngle) / 2;
          return Math.cos(angle - Math.PI / 2) * (radius + 15);
        })
        .attr("y2", (d) => {
          const angle = (d.startAngle + d.endAngle) / 2;
          return Math.sin(angle - Math.PI / 2) * (radius + 15);
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
