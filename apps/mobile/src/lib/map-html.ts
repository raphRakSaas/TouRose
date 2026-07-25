/**
 * Carte MapLibre GL JS embarquée dans une WebView (compatible Expo Go).
 * Clustering natif GeoJSON pour les zones denses.
 */
export type WebMapPin = {
  id: string;
  kind: 'event' | 'place';
  latitude: number;
  longitude: number;
  dayLabel?: string;
  monthLabel?: string;
};

export const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #f5eee3; }
  .tourose-pin {
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 6px rgba(31,28,25,0.35);
    cursor: pointer;
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
  }
  .tourose-pin.place {
    width: 30px; height: 30px; border-radius: 50%;
    background: #26525C; border: 2.5px solid #ffffff;
    color: #ffffff; font-size: 13px; line-height: 1;
  }
  .tourose-pin.place.selected { background: #E03D2E; transform: scale(1.35); }
  .tourose-pin.event {
    width: 34px; border-radius: 8px; overflow: hidden;
    background: #ffffff; border: 2px solid #ffffff;
    flex-direction: column; align-items: stretch;
  }
  .tourose-pin.event .pin-month {
    background: #C45C3E; color: #ffffff;
    font-size: 8px; font-weight: 700; text-transform: uppercase;
    text-align: center; padding: 1.5px 0;
  }
  .tourose-pin.event .pin-day {
    color: #1F1C19; font-size: 14px; font-weight: 700;
    text-align: center; padding: 1px 0 2px; background: #ffffff;
  }
  .tourose-pin.event.selected { transform: scale(1.3); border-color: #E03D2E; }
  .tourose-pin.event.selected .pin-month { background: #E03D2E; }
  .tourose-pin.event.no-date {
    width: 30px; height: 30px; border-radius: 50%;
    background: #C45C3E; border: 2.5px solid #ffffff;
    color: #ffffff; font-size: 13px;
    flex-direction: row; align-items: center; justify-content: center;
  }
  .tourose-pin.event.no-date.selected { background: #E03D2E; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [1.444, 43.6045],
    zoom: 13,
    attributionControl: { compact: true },
  });

  var markers = {};
  var selectedId = null;
  var currentPins = [];
  var CLUSTER_MAX_ZOOM = 14;

  function post(payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }

  function pinsToGeoJson(pins) {
    return {
      type: 'FeatureCollection',
      features: pins.map(function (pin) {
        return {
          type: 'Feature',
          properties: {
            id: pin.id,
            kind: pin.kind,
            dayLabel: pin.dayLabel || '',
            monthLabel: pin.monthLabel || '',
          },
          geometry: {
            type: 'Point',
            coordinates: [pin.longitude, pin.latitude],
          },
        };
      }),
    };
  }

  function clearHtmlMarkers() {
    Object.keys(markers).forEach(function (id) {
      markers[id].remove();
      delete markers[id];
    });
  }

  function renderHtmlMarkersForVisiblePins() {
    clearHtmlMarkers();
    if (!map.getSource('pins')) return;
    var zoom = map.getZoom();
    if (zoom < CLUSTER_MAX_ZOOM) return;

    var bounds = map.getBounds();
    currentPins.forEach(function (pin) {
      if (!bounds.contains([pin.longitude, pin.latitude])) return;
      var el = document.createElement('div');
      el.className = 'tourose-pin ' + pin.kind + (pin.id === selectedId ? ' selected' : '');
      if (pin.kind === 'event' && pin.dayLabel) {
        var monthEl = document.createElement('div');
        monthEl.className = 'pin-month';
        monthEl.textContent = pin.monthLabel || '';
        var dayEl = document.createElement('div');
        dayEl.className = 'pin-day';
        dayEl.textContent = pin.dayLabel;
        el.appendChild(monthEl);
        el.appendChild(dayEl);
      } else {
        if (pin.kind === 'event') el.className += ' no-date';
        el.textContent = pin.kind === 'event' ? '🎟' : '📍';
      }
      el.addEventListener('click', function (clickEvent) {
        clickEvent.stopPropagation();
        post({ type: 'pinPress', id: pin.id });
      });
      markers[pin.id] = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(map);
    });
  }

  function setupClusterLayers() {
    if (map.getSource('pins')) return;

    map.addSource('pins', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: CLUSTER_MAX_ZOOM - 1,
      clusterRadius: 52,
    });

    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'pins',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#C45C3E',
        'circle-radius': ['step', ['get', 'point_count'], 18, 5, 22, 12, 28],
        'circle-opacity': 0.92,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'pins',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-size': 12,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      },
      paint: { 'text-color': '#ffffff' },
    });

    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'pins',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'match',
          ['get', 'kind'],
          'place', '#26525C',
          '#C45C3E',
        ],
        'circle-radius': 9,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    map.on('click', 'clusters', function (event) {
      var features = map.queryRenderedFeatures(event.point, { layers: ['clusters'] });
      if (!features.length) return;
      var clusterId = features[0].properties.cluster_id;
      map.getSource('pins').getClusterExpansionZoom(clusterId, function (error, zoom) {
        if (error) return;
        map.easeTo({ center: features[0].geometry.coordinates, zoom: zoom });
      });
    });

    map.on('click', 'unclustered-point', function (event) {
      var feature = event.features && event.features[0];
      if (!feature) return;
      post({ type: 'pinPress', id: feature.properties.id });
    });

    map.on('mouseenter', 'clusters', function () { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'clusters', function () { map.getCanvas().style.cursor = ''; });
    map.on('mouseenter', 'unclustered-point', function () { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'unclustered-point', function () { map.getCanvas().style.cursor = ''; });

    map.on('zoomend', renderHtmlMarkersForVisiblePins);
    map.on('moveend', renderHtmlMarkersForVisiblePins);
  }

  window.__setPins = function (pinsJson) {
    currentPins = JSON.parse(pinsJson);
    if (!map.isStyleLoaded()) {
      map.once('load', function () { window.__setPins(pinsJson); });
      return;
    }
    setupClusterLayers();
    map.getSource('pins').setData(pinsToGeoJson(currentPins));
    renderHtmlMarkersForVisiblePins();
  };

  window.__selectPin = function (id, latitude, longitude) {
    selectedId = id;
    renderHtmlMarkersForVisiblePins();
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      map.easeTo({ center: [longitude, latitude], zoom: Math.max(map.getZoom(), 15), duration: 350 });
    }
  };

  window.__recenter = function (latitude, longitude) {
    map.easeTo({ center: [longitude, latitude], zoom: 13, duration: 400 });
  };

  map.on('load', function () {
    setupClusterLayers();
    post({ type: 'ready' });
  });
</script>
</body>
</html>`;
