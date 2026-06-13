/**
 * Chart utility using Chart.js to visualize rating history.
 */

let chartInstance = null;

/**
 * Renders a line chart showing points progression for a specific player.
 * 
 * @param {string} canvasId - HTML ID of the canvas element
 * @param {Array} ratingHistory - Array of rating history objects { dateString, points, rank }
 */
function renderRatingHistoryChart(canvasId, ratingHistory) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  
  // Destroy previous instance to avoid overlay errors
  if (chartInstance) {
    chartInstance.destroy();
  }

  let history = [...ratingHistory];
  if (history.length === 1) {
    history.push({
      dateString: 'Current',
      points: history[0].points,
      rank: history[0].rank
    });
  }

  const labels = history.map(entry => {
    if (entry.dateString === 'Start') return 'Start';
    if (entry.dateString === 'Current') return 'Current';
    return entry.dateString.split(' ')[0]; // YYYY-MM-DD
  });
  
  const pointsData = history.map(entry => entry.points);

  // Setup gradient fill
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(56, 189, 248, 0.4)'); // Vibrant sky blue
  gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Elo Rating',
        data: pointsData,
        borderColor: '#38bdf8', // Neon sky blue
        backgroundColor: gradient,
        borderWidth: 3,
        tension: 0.35,
        pointBackgroundColor: '#0284c7',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#38bdf8',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#e2e8f0',
          bodyColor: '#38bdf8',
          borderColor: 'rgba(56, 189, 248, 0.2)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            title: function(tooltipItems) {
              const idx = tooltipItems[0].dataIndex;
              return `Match Date: ${history[idx].dateString}`;
            },
            label: function(context) {
              const idx = context.dataIndex;
              const pts = context.parsed.y.toFixed(2);
              const rnk = history[idx].rank;
              return [`Rating: ${pts} pts`, `Rank: #${rnk}`];
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            font: {
              family: "'Inter', sans-serif",
              size: 11
            }
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            font: {
              family: "'Inter', sans-serif",
              size: 11
            },
            callback: function(value) {
              return Math.round(value);
            }
          }
        }
      }
    }
  });
}
