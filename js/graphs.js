function DataSet(labels, pointLabels, points) {
  this.labels = labels; //labels for lines (e.g. player names)
  this.xs = pointLabels; //where on the x-axis points are placed (usually turn numbers), should be as long as points
  this.ys = points; //data points, as an array containing sub-arrays with the same length as labels
}
function drawGraph(ctx, data, graphType, drawKey, customColors) {
  var colors = ["#f44336", "#9c27b0", "#3f51b5", "#00bcd4", "#4caf50", "#cddc39"], //all material design colors, of course ;)
  h = ctx.canvas.height,
  w = ctx.canvas.width;
  colors = customColors || colors;
  ctx.clearRect(0,0,w,h);
  if (drawKey) {
    w *= 0.9;
    ctx.fillStyle = "white";
    ctx.fillRect(w, 0, 2, h);
    for (let i = 0; i < data.labels.length; i++) {
      ctx.fillStyle = colors[i];
      ctx.fillRect(w + 5, 20 + i * 16, 10, 10);
      ctx.fillText(data.labels[i], w + 17, 25 + i * 16)
    }
  }
  var maxval = -Infinity, minval = Infinity;
  for (let i = 0; i < data.ys.length; i++) {
    maxval = Math.max(maxval, Math.max(...data.ys[i]));
    minval = Math.min(minval, Math.min(...data.ys[i]));
  }
  if (minval > 0) minval = 0;
  var yscale = h / (maxval - minval) * 0.9;
  if (graphType == "line" || graphType == "bar") {
    var tickdist = Math.pow(10, Math.round(Math.log10(maxval - minval)) - 1);
    for (let i = h, j = 0; i > 0; i -= tickdist * yscale, j++) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, i, 10, 1);
      if (j * tickdist > 10) {
        ctx.fillText(Math.round(j * tickdist), 0, i)
      } else ctx.fillText(Math.round(j * tickdist * 10) / 10, 0, i);
    }
  }
  ctx.setTransform(1, 0, 0, -1, 0, h); //Cartesian coordinates
  if (graphType == "line") {
    let xwidth = Math.floor(w / (data.xs.length - 1))
    for (let i = 0; i < data.labels.length; i++) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = colors[i];
        ctx.beginPath();
        ctx.moveTo(0, yscale * data.ys[0][i]);
        for (let j = 1; j < data.ys.length; j++) {
          ctx.lineTo(j * xwidth, yscale * data.ys[j][i]);
        }
        ctx.stroke();
      }
  } else if (graphType == "bar") {
    let margin = 30, xwidth = Math.floor((w - margin) / (data.xs.length));
    for (let i = 0; i < data.labels.length; i++) {
      ctx.strokeStyle = colors[i];
      ctx.fillStyle = colors[i];
      for (let j = 0; j < data.ys.length; j++) {
        ctx.fillRect(margin + xwidth * j + (xwidth - margin) / data.ys[j].length * i, 0, (xwidth - margin) / data.ys[j].length - 5, yscale * data.ys[j][i]);
      }
    }
  } else if (graphType == "pie") {
    let radius = Math.min((w - 100) / 2, (h - 100) / 2), sum = 0, slices = data.ys[0], angle = 0;
    for (let i = 0; i < slices.length; i++) sum += slices[i];
    for (let i = 0; i < slices.length; i++) {
      ctx.fillStyle = colors[i];
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.arc(w / 2, h / 2, radius, angle, angle + 2 * Math.PI * slices[i] / sum);
      ctx.lineTo(w / 2, h / 2);
      ctx.stroke(); ctx.fill();
      angle += 2 * Math.PI * slices[i] / sum;
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0); //return to default coordinates
}
/*var testDataSet = new DataSet( //placeholder until actual data logging functionality is in place
  ["CountryA", "CountryB", "CountryC", "CountryD"],
  [1, 2, 3, 4],
  [[4, 2, 3, 6], [5, 5, 4, 7], [6, 9, 8, 5], [8, 9, 11, 7]]
);*/
