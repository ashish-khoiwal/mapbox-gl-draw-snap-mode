import MapboxDraw from "@mapbox/mapbox-gl-draw";
import {
  createSnapList,
  getGuideFeature,
  IDS,
  shouldHideGuide,
  snap,
} from "./../utils/index.js";

const { doubleClickZoom } = MapboxDraw.lib;
const { geojsonTypes, cursors } = MapboxDraw.constants;
const DrawPoint = MapboxDraw.modes.draw_point;
const SnapPointMode = { ...DrawPoint };

SnapPointMode.onSetup = function (options) {
  const point = this.newFeature({
    type: geojsonTypes.FEATURE,
    properties: {},
    geometry: {
      type: geojsonTypes.POINT,
      coordinates: [[]],
    },
  });

  const verticalGuide = this.newFeature(getGuideFeature(IDS.VERTICAL_GUIDE));
  const horizontalGuide = this.newFeature(
    getGuideFeature(IDS.HORIZONTAL_GUIDE)
  );
  const snapPoint = this.newFeature({
    id: IDS.SNAP_POINT,
    type: geojsonTypes.FEATURE,
    properties: {},
    geometry: {
      type: geojsonTypes.POINT,
      coordinates: [],
    },
  });

  this.addFeature(point);
  this.addFeature(verticalGuide);
  this.addFeature(horizontalGuide);
  this.addFeature(snapPoint);

  const selectedFeatures = this.getSelected();
  this.clearSelectedFeatures();
  doubleClickZoom.disable(this);

  const [snapList, vertices] = createSnapList(
    this.map,
    this._ctx.api,
    point,
    this._ctx.options.snapOptions?.snapGetFeatures
  );

  const state = {
    map: this.map,
    point,
    vertices,
    snapList,
    selectedFeatures,
    verticalGuide,
    horizontalGuide,
    snapPoint,
  };

  state.options = this._ctx.options;

  const moveendCallback = () => {
    const [snapList, vertices] = createSnapList(
      this.map,
      this._ctx.api,
      point,
      this._ctx.options.snapOptions?.snapGetFeatures
    );
    state.vertices = vertices;
    state.snapList = snapList;
  };
  // for removing listener later on close
  state["moveendCallback"] = moveendCallback;

  const optionsChangedCallback = (options) => {
    state.options = options;
  };
  // for removing listener later on close
  state["optionsChangedCallback"] = optionsChangedCallback;

  this.map.on("moveend", moveendCallback);
  this.map.on("draw.snap.options_changed", optionsChangedCallback);

  return state;
};

SnapPointMode.onClick = function (state) {
  // We mock out e with the rounded lng/lat then call DrawPoint with it
  DrawPoint.onClick.call(this, state, {
    lngLat: {
      lng: state.snappedLng,
      lat: state.snappedLat,
    },
  });
};

SnapPointMode.onMouseMove = function (state, e) {
  const { lng, lat } = snap(state, e);

  state.snappedLng = lng;
  state.snappedLat = lat;

  // Debug: Check if snap point exists and update it
  if (state.snapPoint) {
    console.log('Updating snap point to:', lng, lat);
    state.snapPoint.updateCoordinate(`0`, lng, lat);
  } else {
    console.log('Snap point not found in state');
  }

  if (
    state.lastVertex &&
    state.lastVertex[0] === lng &&
    state.lastVertex[1] === lat
  ) {
    this.updateUIClasses({ mouse: cursors.POINTER });

    // cursor options:
    // ADD: "add"
    // DRAG: "drag"
    // MOVE: "move"
    // NONE: "none"
    // POINTER: "pointer"
  } else {
    this.updateUIClasses({ mouse: cursors.ADD });
  }
};

// This is 'extending' DrawPoint.toDisplayFeatures
SnapPointMode.toDisplayFeatures = function (state, geojson, display) {
  if (shouldHideGuide(state, geojson)) return;

  // This relies on the the state of SnapPointMode having a 'point' prop
  DrawPoint.toDisplayFeatures(state, geojson, display);
};

// This is 'extending' DrawPoint.onStop
SnapPointMode.onStop = function (state) {
  this.deleteFeature([IDS.VERTICAL_GUIDE, IDS.HORIZONTAL_GUIDE, IDS.SNAP_POINT], { silent: true });

  // remove moveend callback
  this.map.off("moveend", state.moveendCallback);
  this.map.off("draw.snap.options_changed", state.optionsChangedCallback);

  // This relies on the the state of SnapPointMode having a 'point' prop
  DrawPoint.onStop.call(this, state);
};

SnapPointMode.onKeyUp = function(state, e) {
  // if escape key is pressed, delete the guides and snap point
  if (e.keyCode === 27) {
    this.deleteFeature([IDS.VERTICAL_GUIDE, IDS.HORIZONTAL_GUIDE, IDS.SNAP_POINT], { silent: true });
  }
  DrawPoint.onKeyUp.call(this, state, e);
};

export default SnapPointMode;
