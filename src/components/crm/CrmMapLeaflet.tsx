"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  Rectangle,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  clampBBoxCenterCrop,
  CRM_MAX_BBOX_SPAN_DEG,
  normalizeViewportToDiscoveryBBox,
} from "@/lib/crm-bbox-limits";
import { normalizeBBoxGeography } from "@/lib/crm-geo";
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

function clampLat(lat: number): number {
  return Math.max(-85, Math.min(85, lat));
}

/** Mavi keşif kutusu: sürükleyerek taşı; bırakınca form alanları güncellenir. */
function DraggableBlueRectangle({
  bbox,
  onCommit,
}: {
  bbox: BBox;
  onCommit: (b: BBox) => void;
}) {
  const map = useMap();
  const rectRef = useRef<L.Rectangle | null>(null);
  const dragRef = useRef<{
    start: L.LatLng;
    startBounds: L.LatLngBounds;
  } | null>(null);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const bluePath = {
    color: "#1d4ed8",
    fillColor: "#3b82f6",
    fillOpacity: 0.2,
    weight: 2,
    className: "crm-bbox-draggable",
  };

  const handleMouseDown = useCallback(
    (e: L.LeafletMouseEvent) => {
      if (dragRef.current) {
        const ev = e.originalEvent;
        if (ev) L.DomEvent.stopPropagation(ev);
        return;
      }
      const rect = rectRef.current;
      if (!rect) return;
      const ev = e.originalEvent;
      if (ev) {
        L.DomEvent.stopPropagation(ev);
        L.DomEvent.preventDefault(ev);
      }
      map.dragging.disable();
      rect.bringToFront();
      const ib = rect.getBounds();
      dragRef.current = {
        start: e.latlng,
        startBounds: L.latLngBounds(ib.getSouthWest(), ib.getNorthEast()),
      };

      const onMove = (moveEv: L.LeafletEvent) => {
        const latlng = (moveEv as L.LeafletMouseEvent).latlng;
        if (!latlng) return;
        const st = dragRef.current;
        const layer = rectRef.current;
        if (!st || !layer) return;
        const dLat = latlng.lat - st.start.lat;
        const dLng = latlng.lng - st.start.lng;
        const sw = st.startBounds.getSouthWest();
        const ne = st.startBounds.getNorthEast();
        const newSw = L.latLng(clampLat(sw.lat + dLat), sw.lng + dLng);
        const newNe = L.latLng(clampLat(ne.lat + dLat), ne.lng + dLng);
        layer.setBounds(L.latLngBounds(newSw, newNe));
      };

      const onUp = () => {
        dragRef.current = null;
        map.dragging.enable();
        map.off("mousemove", onMove);
        map.off("touchmove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.removeEventListener("touchend", onUp);
        const layer = rectRef.current;
        if (!layer) return;
        const b = layer.getBounds();
        const sw = b.getSouthWest();
        const ne = b.getNorthEast();
        const raw: BBox = {
          south: sw.lat,
          west: sw.lng,
          north: ne.lat,
          east: ne.lng,
        };
        try {
          onCommitRef.current(
            clampBBoxCenterCrop(normalizeBBoxGeography(raw))
          );
        } catch {
          /* normalize hata verirse yok say */
        }
      };

      map.on("mousemove", onMove);
      map.on("touchmove", onMove);
      document.addEventListener("mouseup", onUp);
      document.addEventListener("touchend", onUp, { passive: true });
    },
    [map]
  );

  const onTouchStart = useCallback(
    (e: L.LeafletEvent) => handleMouseDown(e as L.LeafletMouseEvent),
    [handleMouseDown]
  );

  useLayoutEffect(() => {
    const rect = rectRef.current;
    if (!rect) return;
    rect.on("touchstart", onTouchStart);
    return () => {
      rect.off("touchstart", onTouchStart);
    };
  }, [onTouchStart]);

  return (
    <Rectangle
      ref={rectRef}
      bounds={[
        [bbox.south, bbox.west],
        [bbox.north, bbox.east],
      ]}
      pathOptions={bluePath}
      eventHandlers={{ mousedown: handleMouseDown }}
    >
      <Tooltip sticky direction="top" className="!rounded-md !border-zinc-600 !bg-zinc-900 !text-xs !text-zinc-200">
        <span className="font-medium text-sky-300">Keşif alanı</span>
        <br />
        <span className="text-zinc-400">
          Sürükleyerek taşıyın · en fazla{" "}
          {String(CRM_MAX_BBOX_SPAN_DEG).replace(".", ",")}°
        </span>
      </Tooltip>
    </Rectangle>
  );
}

function RegionRectangles({
  pastRegions,
  currentBBox,
  onCurrentBBoxCommit,
}: {
  pastRegions: StoredSearchRegion[];
  currentBBox: BBox | null;
  onCurrentBBoxCommit?: (b: BBox) => void;
}) {
  const redPath = {
    color: "#b91c1c",
    fillColor: "#ef4444",
    fillOpacity: 0.18,
    weight: 2,
  };
  const bluePathStatic = {
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
        onCurrentBBoxCommit ? (
          <DraggableBlueRectangle
            bbox={currentBBox}
            onCommit={onCurrentBBoxCommit}
          />
        ) : (
          <Rectangle
            bounds={[
              [currentBBox.south, currentBBox.west],
              [currentBBox.north, currentBBox.east],
            ]}
            pathOptions={bluePathStatic}
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
        )
      ) : null}
    </>
  );
}

export default function CrmMapLeaflet({
  onBoundsPicked,
  pastRegions = [],
  currentBBox = null,
  onCurrentBBoxCommit,
}: {
  onBoundsPicked: (b: BBox) => void;
  pastRegions?: StoredSearchRegion[];
  currentBBox?: BBox | null;
  /** Tanımlıysa mavi keşif kutusu sürüklenerek taşınır (ör. bbox arama modunda). */
  onCurrentBBoxCommit?: (b: BBox) => void;
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
        <RegionRectangles
          pastRegions={pastRegions}
          currentBBox={currentBBox}
          onCurrentBBoxCommit={onCurrentBBoxCommit}
        />
        <CaptureTool onBounds={onBoundsPicked} />
      </MapContainer>
    </div>
  );
}
