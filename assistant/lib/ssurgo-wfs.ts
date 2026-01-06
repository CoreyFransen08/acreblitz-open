/**
 * SSURGO WFS Utilities (Server-side)
 *
 * Utilities for fetching SSURGO soil data from USDA's WFS endpoint.
 * This is a server-safe version that doesn't depend on Leaflet or React.
 */

import { DOMParser } from "@xmldom/xmldom";
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from "geojson";
import type { BoundingBox } from "./geo-utils";

/** SSURGO WFS service URL */
const SSURGO_WFS_URL =
  "https://sdmdataaccess.nrcs.usda.gov/Spatial/SDMWGS84Geographic.wfs";

/** SSURGO layer name */
const SSURGO_TYPE_NAME = "mapunitpolyextended";

/**
 * Build a GML polygon filter for WFS Intersect query
 * SSURGO requires a GML filter instead of shorthand BBOX
 */
function buildGMLPolygonFilter(bounds: BoundingBox): string {
  const { minLng: west, minLat: south, maxLng: east, maxLat: north } = bounds;

  // GML coordinates are in "lon,lat" format for each point
  const gmlCoordinates = [
    `${west},${south}`,
    `${east},${south}`,
    `${east},${north}`,
    `${west},${north}`,
    `${west},${south}`, // Close the polygon
  ].join(" ");

  // Use <Intersect> (not <Intersects>) to match SSURGO's expected format
  return `<Filter xmlns="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml">
<Intersect>
<PropertyName>Geometry</PropertyName>
<gml:Polygon srsName="EPSG:4326">
<gml:outerBoundaryIs>
<gml:LinearRing>
<gml:coordinates>${gmlCoordinates}</gml:coordinates>
</gml:LinearRing>
</gml:outerBoundaryIs>
</gml:Polygon>
</Intersect>
</Filter>`;
}

/**
 * Build a WFS GetFeature URL with GML filter
 */
function buildWFSUrl(bounds: BoundingBox): string {
  const filter = buildGMLPolygonFilter(bounds);

  // Build URL manually to ensure proper encoding
  const baseParams = new URLSearchParams({
    SERVICE: "WFS",
    VERSION: "1.1.0",
    REQUEST: "GetFeature",
    TYPENAME: SSURGO_TYPE_NAME,
    OUTPUTFORMAT: "GML2",
    SRSNAME: "EPSG:4326",
  });

  // Encode the filter separately - URLSearchParams double-encodes sometimes
  return `${SSURGO_WFS_URL}?${baseParams.toString()}&FILTER=${encodeURIComponent(filter)}`;
}

/**
 * Parse GML coordinates string into array of [lng, lat] pairs
 * SSURGO returns coordinates as "lat,lng lat,lng ..." - we need to swap them
 */
function parseGMLCoordinates(coordString: string): [number, number][] {
  return coordString
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [lat, lng] = pair.split(",").map(Number);
      // Swap lat/lng to lng/lat for GeoJSON (x,y order)
      return [lng, lat] as [number, number];
    })
    .filter((coord) => !isNaN(coord[0]) && !isNaN(coord[1]));
}

/**
 * Parse GML posList (GML3 format) into coordinate array
 * Format: "lat lng lat lng ..." - pairs of space-separated values
 */
function parseGMLPosList(posListString: string): [number, number][] {
  const values = posListString.trim().split(/\s+/).map(Number);
  const coords: [number, number][] = [];

  for (let i = 0; i < values.length - 1; i += 2) {
    const lat = values[i];
    const lng = values[i + 1];
    if (!isNaN(lat) && !isNaN(lng)) {
      // Swap lat/lng to lng/lat for GeoJSON
      coords.push([lng, lat]);
    }
  }

  return coords;
}

/**
 * Extract coordinates from a GML geometry element
 */
function extractCoordsFromGMLGeometry(
  geomElement: Element
): [number, number][][] {
  const rings: [number, number][][] = [];

  // Try GML2 format: gml:coordinates
  const coordsElements = geomElement.getElementsByTagNameNS(
    "http://www.opengis.net/gml",
    "coordinates"
  );
  if (coordsElements.length > 0) {
    for (let i = 0; i < coordsElements.length; i++) {
      const coordString = coordsElements[i].textContent || "";
      const coords = parseGMLCoordinates(coordString);
      if (coords.length > 0) {
        rings.push(coords);
      }
    }
    return rings;
  }

  // Try GML3 format: gml:posList
  const posListElements = geomElement.getElementsByTagNameNS(
    "http://www.opengis.net/gml",
    "posList"
  );
  if (posListElements.length > 0) {
    for (let i = 0; i < posListElements.length; i++) {
      const posListString = posListElements[i].textContent || "";
      const coords = parseGMLPosList(posListString);
      if (coords.length > 0) {
        rings.push(coords);
      }
    }
  }

  return rings;
}

/**
 * Convert GML geometry to GeoJSON geometry
 */
function gmlGeometryToGeoJSON(
  geomElement: Element
): Polygon | MultiPolygon | null {
  // Get the actual geometry element (may be wrapped)
  const polygonElements = geomElement.getElementsByTagNameNS(
    "http://www.opengis.net/gml",
    "Polygon"
  );
  const multiPolygonElements = geomElement.getElementsByTagNameNS(
    "http://www.opengis.net/gml",
    "MultiPolygon"
  );
  const multiSurfaceElements = geomElement.getElementsByTagNameNS(
    "http://www.opengis.net/gml",
    "MultiSurface"
  );

  // Handle MultiPolygon or MultiSurface
  if (multiPolygonElements.length > 0 || multiSurfaceElements.length > 0) {
    const container = multiPolygonElements[0] || multiSurfaceElements[0];
    const memberPolygons = container.getElementsByTagNameNS(
      "http://www.opengis.net/gml",
      "Polygon"
    );
    const polygonCoords: [number, number][][][] = [];

    for (let i = 0; i < memberPolygons.length; i++) {
      const rings = extractCoordsFromGMLGeometry(memberPolygons[i]);
      if (rings.length > 0) {
        polygonCoords.push(rings);
      }
    }

    if (polygonCoords.length === 1) {
      return {
        type: "Polygon",
        coordinates: polygonCoords[0],
      };
    } else if (polygonCoords.length > 1) {
      return {
        type: "MultiPolygon",
        coordinates: polygonCoords,
      };
    }
  }

  // Handle single Polygon
  if (polygonElements.length > 0) {
    const rings = extractCoordsFromGMLGeometry(polygonElements[0]);
    if (rings.length > 0) {
      return {
        type: "Polygon",
        coordinates: rings,
      };
    }
  }

  return null;
}

/**
 * Helper to get child elements from a node (xmldom doesn't support .children)
 */
function getChildElements(node: Element): Element[] {
  const elements: Element[] = [];
  const childNodes = node.childNodes;
  for (let i = 0; i < childNodes.length; i++) {
    const child = childNodes[i];
    // Element nodes have nodeType === 1
    if (child.nodeType === 1) {
      elements.push(child as Element);
    }
  }
  return elements;
}

/**
 * Parse GML response to GeoJSON FeatureCollection
 */
function parseGMLToGeoJSON(gmlText: string): FeatureCollection {
  // Use DOMParser from xmldom for Node.js compatibility
  const parser = new DOMParser();
  const doc = parser.parseFromString(gmlText, "text/xml");

  // Check for parse errors
  const parseError = doc.getElementsByTagName("parsererror");
  if (parseError.length > 0) {
    console.error("GML parse error:", parseError[0]?.textContent);
    return { type: "FeatureCollection", features: [] };
  }

  const features: Feature[] = [];

  // Find all feature members - look for gml:featureMember wrapper elements
  const featureMemberElements = doc.getElementsByTagNameNS(
    "http://www.opengis.net/gml",
    "featureMember"
  );

  for (let i = 0; i < featureMemberElements.length; i++) {
    const featureMember = featureMemberElements[i];

    // The actual feature is the first child element of featureMember (e.g., ms:mapunitpolyextended)
    const childElements = getChildElements(featureMember);
    const featureElement = childElements[0];
    if (!featureElement) continue;

    // Extract properties
    const properties: Record<string, string | number | null> = {};
    const children = getChildElements(featureElement);

    let geometryElement: Element | null = null;

    for (let j = 0; j < children.length; j++) {
      const child = children[j];
      const localName =
        child.localName || child.nodeName.split(":").pop() || "";

      // Skip geometry elements and bounding box - we'll handle geometry separately
      if (
        localName.toLowerCase() === "multipolygon" ||
        localName.toLowerCase() === "polygon" ||
        localName.toLowerCase() === "geometry" ||
        localName.toLowerCase() === "boundedby"
      ) {
        // For SSURGO, geometry is in ms:multiPolygon which contains gml:MultiPolygon
        if (localName.toLowerCase() === "multipolygon") {
          geometryElement = child;
        }
        continue;
      }

      // Get property value
      const textContent = child.textContent?.trim() || null;

      // Try to parse as number if applicable
      if (textContent !== null && textContent !== "") {
        const numValue = parseFloat(textContent);
        if (!isNaN(numValue) && textContent.match(/^-?\d+\.?\d*$/)) {
          properties[localName] = numValue;
        } else {
          properties[localName] = textContent;
        }
      } else {
        properties[localName] = null;
      }
    }

    // If we didn't find the geometry element yet, look for it specifically
    if (!geometryElement) {
      // Try common geometry element names used by different WFS services
      const geomNames = [
        "multiPolygon",
        "MultiPolygon",
        "Geometry",
        "geometry",
        "the_geom",
        "Shape",
      ];
      for (const name of geomNames) {
        const found = featureElement.getElementsByTagNameNS("*", name);
        if (found.length > 0) {
          geometryElement = found[0];
          break;
        }
      }
    }

    if (geometryElement) {
      const geometry = gmlGeometryToGeoJSON(geometryElement);
      if (geometry) {
        features.push({
          type: "Feature",
          properties,
          geometry,
        });
      }
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Fetch SSURGO soil data from WFS endpoint
 *
 * @param bounds - Bounding box to query
 * @returns GeoJSON FeatureCollection of soil polygons
 */
export async function fetchSSURGOSoilData(
  bounds: BoundingBox
): Promise<FeatureCollection> {
  const url = buildWFSUrl(bounds);

  const response = await fetch(url, {
    headers: {
      Accept: "application/xml",
    },
  });

  if (!response.ok) {
    throw new Error(
      `WFS request failed: ${response.status} ${response.statusText}`
    );
  }

  const gmlText = await response.text();

  // Check if response is an error message
  if (
    gmlText.includes("ServiceExceptionReport") ||
    gmlText.includes("ExceptionReport")
  ) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(gmlText, "text/xml");
    const exceptionText =
      doc.getElementsByTagName("ServiceException")[0]?.textContent ||
      doc.getElementsByTagName("ows:ExceptionText")[0]?.textContent ||
      "Unknown WFS error";
    throw new Error(`WFS service error: ${exceptionText}`);
  }

  // Parse GML to GeoJSON
  return parseGMLToGeoJSON(gmlText);
}
