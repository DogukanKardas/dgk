"use client";

import {
  MapContainer,
  Rectangle,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  CRM_MAX_BBOX_SPAN_DEG,
  normalizeViewportToDiscoveryBBox,
} from "@/lib/crm-bbox-limits";
import type { BBox } from "@/lib/crm-osm-discover";
import type { StoredSearchRegion } from "@/lib/crm-search-history";

function CaptureTool({ onBounds }: { onBounds: (b: BBox) => void }) {
  const map = useMap();
  return (
    <div className="absolute bottom-3 left-3 z-[1000] flex gap-2">
      <button
        type="button"
        onClick={() => {
          const b = map.getBounds();
          onBounds(
            normalizeViewportToDiscoveryBBox({
              south: b.getSouth(),
              west: b.getWest(),
              north: b.getNorth(),
              east: b.getEast(),
            })
          );
        }}
        className="rounded-lg border border-zinc-600 bg-zinc-900/95 px-3 py-2 text-xs text-zinc-100 shadow-lg hover:bg-zinc-800"
      >
        BBox yap
      </button>
    </div>
  );
}

function isValidBBox(b: BBox): boolean {
  return (
    Number.isFinite(b.south) &&
    Number.isFinite(b.west) &&
    Number.isFinite(b.north) &&
    Number.isFinite(b.east) &&
    b.south < b.north &&
    b.west < b.east
  );
}

function RegionRectangles({
  pastRegions,
  currentBBox,
}: {
  pastRegions: StoredSearchRegion[];
  currentBBox: BBox | null;
}) {
  const redPath = {
    color: "#b91c1c",
    fillColor: "#ef4444",
    fillOpacity: 0.18,
    weight: 2,
  };
  const bluePath = {
    color: "#1d4ed8",
    fillColor: "#3b82f6",
    fillOpacity: 0.2,
    weight: 2,
  };

  return (
    <>
      {pastRegions.map((r, i) => (
        <Rectangle
          key={`past-${r.at}-${i}`}
          bounds={[
            [r.bbox.south, r.bbox.west],
            [r.bbox.north, r.bbox.east],
          ]}
          pathOptions={redPath}
        >
          <Tooltip sticky direction="top" className="!rounded-md !border-zinc-600 !bg-zinc-900 !text-xs !text-zinc-200">
            <span className="font-medium text-red-300">Aranan bölge</span>
            <br />
            {r.label || "Keşif"}
          </Tooltip>
        </Rectangle>
      ))}
      {currentBBox && isValidBBox(currentBBox) ? (
        <Rectangle
          bounds={[
            [currentBBox.south, currentBBox.west],
            [currentBBox.north, currentBBox.east],
          ]}
          pathOptions={bluePath}
        >
          <Tooltip sticky direction="top" className="!rounded-md !border-zinc-600 !bg-zinc-900 !text-xs !text-zinc-200">
            <span className="font-medium text-sky-300">Keşif alanı</span>
            <br />
            <span className="text-zinc-400">
              En fazla {String(CRM_MAX_BBOX_SPAN_DEG).replace(".", ",")}° (enlem /
              boylam)
            </span>
          </Tooltip>
        </Rectangle>
      ) : null}
    </>
  );
}

export default function CrmMapLeaflet({
  onBoundsPicked,
  pastRegions = [],
  currentBBox = null,
}: {
  onBoundsPicked: (b: BBox) => void;
  pastRegions?: StoredSearchRegion[];
  currentBBox?: BBox | null;
}) {
  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-lg border border-zinc-700">
      <MapContainer
        center={[41.02, 29.0]}
        zoom={12}
        className="h-full w-full [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:bg-zinc-900"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RegionRectangles pastRegions={pastRegions} currentBBox={currentBBox} />
        <CaptureTool onBounds={onBoundsPicked} />
      </MapContainer>
    </div>
  );
}
