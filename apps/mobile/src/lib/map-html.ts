/**
 * Carte MapLibre GL JS embarquée dans une WebView (compatible Expo Go).
 * Style OpenFreeMap (gratuit, utilisable en production, attribution requise).
 *
 * Pont RN ↔ web :
 * - RN → web : `window.__setPins(pinsJson)` et `window.__selectPin(id)` via injectJavaScript ;
 * - web → RN : `window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pinPress', id }))`.
 */
export type WebMapPin = {
  id: string;
  kind: 'event' | 'place';
  latitude: number;
  longitude: number;
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
    width: 30px; height: 30px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    border: 2.5px solid #ffffff;
    box-shadow: 0 2px 6px rgba(31,28,25,0.35);
    color: #ffffff; font-size: 13px; line-height: 1;
    transition: transform 0.15s ease, background-color 0.15s ease;
    cursor: pointer;
  }
  .tourose-pin.event { background: #C45C3E; }
  .tourose-pin.place { background: #26525C; }
  .tourose-pin.selected { background: #E03D2E; transform: scale(1.35); z-index: 10; }
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

  function post(payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }

  window.__setPins = function (pinsJson) {
    var pins = JSON.parse(pinsJson);
    Object.keys(markers).forEach(function (id) {
      markers[id].remove();
      delete markers[id];
    });
    pins.forEach(function (pin) {
      var el = document.createElement('div');
      el.className = 'tourose-pin ' + pin.kind + (pin.id === selectedId ? ' selected' : '');
      el.textContent = pin.kind === 'event' ? '📅' : '📍';
      el.addEventListener('click', function (clickEvent) {
        clickEvent.stopPropagation();
        post({ type: 'pinPress', id: pin.id });
      });
      markers[pin.id] = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(map);
    });
  };

  window.__selectPin = function (id, latitude, longitude) {
    selectedId = id;
    Object.keys(markers).forEach(function (markerId) {
      var el = markers[markerId].getElement();
      el.classList.toggle('selected', markerId === id);
    });
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      map.easeTo({ center: [longitude, latitude], zoom: Math.max(map.getZoom(), 14), duration: 350 });
    }
  };

  window.__recenter = function (latitude, longitude) {
    map.easeTo({ center: [longitude, latitude], zoom: 13, duration: 400 });
  };

  map.on('load', function () { post({ type: 'ready' }); });
</script>
</body>
</html>`;
