const s3base = "https://oss.resilientservice.mooo.com/"
const bucket = 'test'
const urlbase = `${s3base}${bucket}/`
mapboxgl.accessToken = 'pk.eyJ1IjoidmFsZW50aW5lZHd2IiwiYSI6ImNra215Y2QydDExd3oycHF0d2VvM2pwYXoifQ.sODwFshU0owiFxw6SKLeKg';
const map = new mapboxgl.Map({
  container: 'map-container', // container ID
  center: [-117.13, 32.56], // 32.58,-117.11 starting position [lng, lat]. Note that lat must be set between -90 and 90
  zoom: 12 , // starting zoom
  maxBounds: [
    [-118, 32], // Southwest coordinates
    [-116, 34]  // Northeast coordinates
  ]
});

function setGroupVisibility(map, layerInfo, visibility) {
  layerInfo.layers.forEach(layerId => {
    // Ensure the layer exists before attempting to change it
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', visibility);
    }
  });
}

function setMapLanguage(){
  console.log(
    "[language.js] Updating map for language:",
    i18next.language
  );
  map.addControl(new MapboxLanguage({
    defaultLanguage: i18next.language
  }));
  // FIXME: update tooltip language
}

function complaints_layer(complaint_days){
  fetch(`${urlbase}tijuana/sd_complaints/output/complaints.geojson`)// update the path or URL to your GeoJSON file
    .then(response => response.json())
    .then(data => {
      map.addSource('complaints', {
      type: 'geojson',
      data: data,
      cluster: true,
      clusterMaxZoom: 14, // max zoom to cluster points
      clusterRadius: 50   // radius of each cluster when clustering points (in pixels)
    });
      const threeDaysAgo = dayjs().subtract(complaint_days, 'day');
      console.log('days ago date: ' , threeDaysAgo)
      // Filter features where the "Date Recieved" is within the last three days.
      // Adjust the date parsing if your format differs.
      var filteredFeatures = data.features.filter(feature => {
        var dateReceived = new Date(feature.properties['date_received']);
        return dateReceived >= threeDaysAgo;
      });
      console.log('complaints after filter: ' , filteredFeatures.length)

      // Create a new FeatureCollection with filtered features
      var filteredData = {
        type: 'FeatureCollection',
        features: filteredFeatures
      };
      console.log('features:', filteredData)
      map.addSource('complaints_lastdays', {
        type: 'geojson',
        data: filteredData,
        cluster: true,
        clusterMaxZoom: 14, // max zoom to cluster points
        clusterRadius: 50   // radius of each cluster when clustering points (in pixels)
      });
    // Layer for clusters (as circles) for all
    map.addLayer({
      id: 'clusters-all',
      layout: { visibility: 'none',},
      type: 'circle',
      source: 'complaints',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#51bbd6',
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,   // circle radius when count is less than first step
          100,  // first step threshold
          30,   // circle radius for count >= 100
          750,  // second step threshold
          40    // circle radius for count >= 750
        ]
      }
    });

    // Layer for cluster count labels
    map.addLayer({
      id: 'cluster-count-all',

      type: 'symbol',
      source: 'complaints',
      filter: ['has', 'point_count'],
      layout: {
        visibility: 'none',
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      }
    });

    // Layer for unclustered individual points
    map.addLayer({
      id: 'unclustered-point-all',
      layout: { visibility: 'none',},
      type: 'circle',
      source: 'complaints',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#11b4da',
        'circle-radius': 4,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });
    // Layer for clusters (as circles) for all

    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'complaints_lastdays',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#51bbd6',
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff',
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,   // circle radius when count is less than first step
          100,  // first step threshold
          30,   // circle radius for count >= 100
          750,  // second step threshold
          40    // circle radius for count >= 750
        ]
      }
    });

    // Layer for cluster count labels
    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'complaints_lastdays',
      filter:  ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      }
    });

    // Layer for unclustered individual points
    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'complaints_lastdays',
      filter:
        ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#11b4da',
        'circle-radius': 4,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });
  });

}

function beach_layer(){
  // beachwatch
  map.loadImage('img/marker-beach.png', function(error, image) {
    if (error) throw error;
    // Add the image with SDF enabled so it can be tinted dynamically
    map.addImage('pin', image, { sdf: true });

    // Add your GeoJSON source containing beach status
    map.addSource('beaches', {
      type: 'geojson',
      data: `${urlbase}tijuana/beachwatch/output/beachwatch_closures.geojson`
    });

    // Create a symbol layer using the custom pin icon
    map.addLayer({
      id: 'beaches',
      type: 'symbol',
      source: 'beaches',
      layout: {
        'icon-image': 'pin',
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5, .1,  // At zoom level 5, text size 10
          12, .3,  // At zoom level 12, text size 18
          14, .5
        ],
        'icon-allow-overlap': true,
        // Offset the icon so the tip of the pin points to the location
        'icon-offset': [0, 0]
      },
      paint: {
        // Use the RGBcolor property to tint the pin
        'icon-color': ['get', 'RBGColor']
      }
    });

    // Add a popup when a pin is clicked
    map.on('click', 'beaches', function(e) {
      var feature = e.features[0];
      console.log("beach feature properties", feature.properties);
      var coordinates = feature.geometry.coordinates.slice();

      const beachData = parseBeachData(feature.properties);
      const indicatorClass = getIndicatorLevelForBeach(beachData.beachStatus);
      var description = feature.properties.Description;
      console.log("[mbmap.js] beachData", beachData);

      var popupContent = `
      <div class="tooltip">
        <div class="tooltip-header">
          <div>
            <i class="bi bi-water"></i>
            <span>${beachData.name}</span>
            ${
              (beachData.nameDetails) ?
              `<span>${beachData.nameDetails}</span>`
              : ""
            }
          </div>
        </div>
        <div class="tooltip-line beach-status">
          <div class="indicator ${indicatorClass}"></div>
          <span>Beach ${beachData.beachStatus}</span>
        </div>
        ${
          (beachData.statusSince) ?
            `<div class="tooltip-line beach-status-since">
              <span>since ${beachData.statusSince}</span>
            </div>`
            : ""
        }
        ${
          (beachData.statusNote) ?
            `<div class="tooltip-line beach-status-note">
              <span>${beachData.statusNote}</span>
            </div>`
            : ""
        }
      </div>`

      new mapboxgl.Popup({ className: "mapbox-tooltip beach-tooltip" })
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(map);
    });

    // Change the cursor to a pointer when over the pins.
    map.on('mouseenter', 'beaches', function() {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'beaches', function() {
      map.getCanvas().style.cursor = '';
    });
  });
}

function spills_layer(spill_days){
  // spills

  map.loadImage('img/marker-spill.png', function(error, image) {
    if (error) throw error;
    // Add the image with SDF enabled so it can be tinted dynamically
    map.addImage('sewage', image, { sdf: true });

    // Add your GeoJSON source containing beach status
    map.addSource('spills', {
      type: 'geojson',
      data: `${urlbase}tijuana/ibwc/output/spills_last_by_site.geojson`
    });
    const thirtyDaysAgo = dayjs().subtract(spill_days, 'day').toISOString();
    // Create a symbol layer using the custom pin icon
    map.addLayer({
      id: 'spills',
      type: 'symbol',
      source: 'spills',
      filter:['any' ,
      ['>=', ['get', 'End Time'], thirtyDaysAgo] ,
        ['>=', ['get', 'Start Time'], thirtyDaysAgo] ,
      ],
      layout: {
        'icon-image': 'sewage',
        //'icon-size': .1,
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5, .2,  // At zoom level 5, text size 10
          12, .4,  // At zoom level 12, text size 18
          14, .5,
        ],
        'icon-allow-overlap': true,
        // Offset the icon so the tip of the pin points to the location
        'icon-offset': [0, 0]
      },
      // paint: {
      //   // Use the RGBcolor property to tint the pin
      //   'icon-color': ['get', 'RBGColor']
      // }
    });

    // Add a popup when a pin is clicked
    map.on('click', 'spills', function(e) {
      var feature = e.features[0];
      var coordinates = feature.geometry.coordinates.slice();
      var name = feature.properties['Discharge Location'];
      var dates = {
        start: dayjs(feature.properties['Start Date']),
        end: dayjs(feature.properties['End Date'])
      };
      let dateStr;
      if (dates.start.isSame(dates.end, 'day')) {
        dateStr = `${dates.start.format("MMM D")}`;
      }
      else {
        dateStr = `${dates.start.format("MMM D")} - ${dates.end.format("MMM D")}`;
      }
      var volume = feature.properties['Approximate Discharge Volume'];
      var popupContent = `
      <div class="tooltip">
        <div class="tooltip-header">
          <i class="bi bi-droplet"></i>
          <span>Wastewater Spill</span>
        </div>
        <div class="tooltip-line tooltip-table">
          <span>location:</span>
          <span>${name}</span>
        </div>
        <div class="tooltip-line tooltip-table">
          <span>date:</span>
          <span>${dateStr}</span>
        </div>
        <div class="tooltip-line tooltip-table">
          <span>approx. volume:</span>
          <span>${volume}</span>
        </div>
      </div>`

      new mapboxgl.Popup({ className: "mapbox-tooltip spill-tooltip" })
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(map);
    });


  });
}

function h2s_layer(){
  map.loadImage('img/marker-h2s.png', function(error, image) {
    if (error) throw error;
    // Add the image with SDF enabled so it can be tinted dynamically
    map.addImage('cloud', image, { sdf: true });

    // Add your GeoJSON source containing beach status
    map.addSource('h2s', {
      type: 'geojson',
      data: `${urlbase}tijuana/sd_apcd_air/output/lastvalue_h2s.geojson`
    });

    // Create a symbol layer using the custom pin icon
    map.addLayer({
      id: 'h2s',
      type: 'symbol',
      source: 'h2s',
      layout: {
        'icon-image': 'cloud',
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5, .3,  // At zoom level 5, text size 10
          12, .4,  // At zoom level 12, text size 18
          14, .5
        ],
        'icon-allow-overlap': true,
        // Offset the icon so the tip of the pin points to the location
        'icon-offset': [0, 0]
      },
      paint: {
        // Use the level property to tint the pin
        'icon-color': ['get', 'level']
      }
    });

    // Add a popup when a pin is clicked
    map.on('click', 'h2s', function(e) {
      console.log('h2s click', e);
      var feature = e.features[0];
      var coordinates = feature.geometry.coordinates.slice();
      var name = feature.properties['Site Name'];
      var description = feature.properties.Result;
      let date = dayjs(feature.properties['Date with time']);
      console.log('h2s feature properties', feature.properties);
      var airnow_link = `https://www.airnow.gov/?city=${feature.properties['Site Name']}&state=CA&country=USA`
      var popupContent = `
      <div class="tooltip">
        <div class="tooltip-header">
          <i class="bi bi-wind"></i>
          <span>Hydrogen Sulfide Measurement</span>
        </div>
        <div class="tooltip-line tooltip-table">
          <span>location:</span>
          <span>${name.split(" - ")[0]}</span>
        </div>
        <div class="tooltip-line tooltip-table">
          <span>measurement:</span>
          <span>${description} ppb</span>
        </div>
        <div class="tooltip-line tooltip-table">
          <span>last update:</span>
          <span>${date.format("h:mma")}</span>
        </div>
        <div class="tooltip-footer">
          <span>ppb: parts per billion</span>
        </div>
      </div>`

      new mapboxgl.Popup({ className: "mapbox-tooltip h2s-tooltip" })
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(map);
    });

    map.addLayer({
      id: 'h2s-value',
      type: 'symbol',
      source: 'h2s',

      layout: {
        'text-field': ['get', 'Original Value'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12,
        'text-offset': [-2,0]
      },
      paint: {
        'text-color':  ['get', 'level']
      }
    });
    map.addLayer({
      id: 'h2s-name',
      type: 'symbol',
      source: 'h2s',

      layout: {
        'text-field': ['get', 'LongName'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12,
        'text-offset': [0,3]
      },
      paint: {
        'text-color': '#000'
      }
    });
  });
}

function parseBeachData(beachTooltipProperties) {
  console.log("[mbmap.js] beachTooltipProperties", beachTooltipProperties);
  // beach name into a human friendly format
  const nameParts = beachTooltipProperties.Name.replace(/\([A-Z]{2}\-[0-9]+\)/g, "").split(/( - | at )/);
  console.log(nameParts);
  const name = nameParts[0].trim();
  const nameDetails = nameParts[2] ? nameParts[2].trim() : "";

  // Get the beach status from the properties
  const closureNotice = beachTooltipProperties.Closure;
  const advisoryNotice = beachTooltipProperties.Advisory;
  let beachStatus = "open";
  let statusSince = "";
  let statusNote = "";
  if (closureNotice && closureNotice.length > 0) {
    const noticeInfo = parseBeachNotice(closureNotice);
    beachStatus = noticeInfo.beachStatus;
    statusSince = noticeInfo.statusSince;
    statusNote = noticeInfo.statusNote;
  }
  else if (advisoryNotice && advisoryNotice.length > 0) {
    const noticeInfo = parseBeachNotice(advisoryNotice);
    beachStatus = noticeInfo.beachStatus;
    statusSince = noticeInfo.statusSince;
    statusNote = noticeInfo.statusNote;
  }

  // handle outfall
  if (beachTooltipProperties.RBGColor === "Outfall") {
    beachStatus = "outfall";
    statusSince = "";
    statusNote = beachTooltipProperties.Description;
  }

  // clean up and return
  let ret = {
    name: name,
    nameDetails: nameDetails,
    beachStatus: beachStatus,
    statusSince: statusSince,
    statusNote: statusNote
  }
  if (!ret.statusSince || ret.statusSince === "") {
    delete ret.statusSince;
  }
  if (!ret.statusNote || ret.statusNote === "") {
    delete ret.statusNote;
  }
  if (!ret.nameDetails || ret.nameDetails === "") {
    delete ret.nameDetails;
  }
  return ret;
}

function parseBeachNotice(html) {
  console.log("[mbmap.js] parsing beach notice", html);
  let beachStatus = "";
  let statusSince = "";
  let statusNote = "";

  try {
    beachStatus = html.match(/(?<=<strong>)(Closure|Advisory)/g)[0]; // TODO: Closure|Advisory|Warning|Open|Outfall
    console.log("[mbmap.js] beachStatus", beachStatus);
    if (beachStatus == "Closure")
      beachStatus = "closed";
    else if (beachStatus == "Advisory")
      beachStatus = "under advisory";
    else
      beachStatus = "unknown";
  }
  catch (e) {
    beachStatus = "unknown";
    console.error("[mbmap.js] error parsing beach status", e, "parsing html", html);
  }

  try {
    statusSince = html.match(/(?<=<strong>Status Since[: ]*?<\/strong>[: ]*?).*(?=<br ?\/>)/g)[0];
    statusSince = dayjs(statusSince).format("MMM D");
    console.log("[mbmap.js] statusSince", statusSince);
  }
  catch (e) {
    statusSince = "";
    console.error("[mbmap.js] error parsing beach status since", e, "parsing html", html);
  }

  try {
    const emboldenedText = html.match(/(?<=<strong>)(.*?)(?=<\/strong>)/g);
    statusNote = emboldenedText ? emboldenedText[emboldenedText.length - 1] : "";
    console.log("[mbmap.js] statusNote", statusNote);
  }
  catch (e) {
    statusNote = "";
    console.error("[mbmap.js] error parsing beach status note", e, "parsing html", html);
  }

  return {
    beachStatus,
    statusSince,
    statusNote
  };
}

map.on('load', function () {
  // Add the GeoJSON source with clustering enabled
  beach_layer()
  spills_layer(spill_days)
  complaints_layer(complaint_days)
  h2s_layer()
  setMapLanguage()




// h2s

});
