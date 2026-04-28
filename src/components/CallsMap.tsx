import { useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, PhoneOff, PhoneForwarded } from "lucide-react";
import type { CallRecord } from "@/lib/callData";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface CallsMapProps {
  calls: CallRecord[];
  onSelectCall: (call: CallRecord) => void;
}

// Real GPS coordinates for Greek cities
const CITY_COORDS: Record<string, [number, number]> = {
  Athens: [37.9838, 23.7275],
  Thessaloniki: [40.6401, 22.9444],
  Patras: [38.2466, 21.7346],
  Heraklion: [35.3387, 25.1442],
  Larissa: [39.6390, 22.4191],
  Volos: [39.3620, 22.9429],
  Ioannina: [39.6644, 20.8521],
  Kavala: [40.9396, 24.4069],
};

const statusColors = {
  completed: "fill-success stroke-success",
  dropped: "fill-warning stroke-warning",
  failed: "fill-destructive stroke-destructive",
};

const statusIcons = {
  completed: Phone,
  dropped: PhoneOff,
  failed: PhoneForwarded,
};

function MapBounds({ points }: { points: any[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (points.length === 0) return;
    
    const minLat = Math.min(...points.map(p => p.lat));
    const maxLat = Math.max(...points.map(p => p.lat));
    const minLng = Math.min(...points.map(p => p.lng));
    const maxLng = Math.max(...points.map(p => p.lng));
    
    if (minLat === maxLat && minLng === maxLng) {
      map.setView([minLat, minLng], 12);
    } else {
      map.fitBounds([
        [minLat, minLng],
        [maxLat, maxLng]
      ], { padding: [20, 20], maxZoom: 14 });
    }
  }, [points, map]);
  
  return null;
}

const CallsMap = ({ calls, onSelectCall }: CallsMapProps) => {
  const regionStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number; dropped: number; failed: number; calls: CallRecord[] }> = {};
    calls.forEach((c) => {
      if (!stats[c.region]) stats[c.region] = { total: 0, completed: 0, dropped: 0, failed: 0, calls: [] };
      stats[c.region].total++;
      stats[c.region][c.status]++;
      stats[c.region].calls.push(c);
    });
    return stats;
  }, [calls]);

  const mapPoints = useMemo(() => {
    const points: Array<{ lat: number; lng: number; call: CallRecord }> = [];
    
    calls.forEach((c) => {
      let lat = c.latitude;
      let lng = c.longitude;
      
      // Fallback to CITY_COORDS if no exact coords but region matches
      if (lat == null || lng == null) {
        if (c.region && CITY_COORDS[c.region]) {
          lat = CITY_COORDS[c.region][0];
          lng = CITY_COORDS[c.region][1];
        } else {
          // If still no coords, we try to see if any known city matches partially
          const matchedCity = Object.keys(CITY_COORDS).find(city => 
            c.region && c.region.toLowerCase().includes(city.toLowerCase())
          );
          if (matchedCity) {
            lat = CITY_COORDS[matchedCity][0];
            lng = CITY_COORDS[matchedCity][1];
          } else {
            return; // Skip if no coords at all
          }
        }
        // Jitter fallback coordinates slightly so they don't perfectly overlap
        lat += (Math.random() - 0.5) * 0.02;
        lng += (Math.random() - 0.5) * 0.02;
      } else {
        // Also add tiny jitter to exact coordinates if they might overlap
        lat += (Math.random() - 0.5) * 0.0005;
        lng += (Math.random() - 0.5) * 0.0005;
      }

      points.push({ lat, lng, call: c });
    });
    
    return points;
  }, [calls]);

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        Χάρτης Κλήσεων — Ελλάδα
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Κατανομή κλήσεων ανά περιοχή · κλικ σε bubble για λεπτομέρειες
      </p>

      <div className="flex gap-6">
        {/* Real Map with React-Leaflet */}
        <div className="flex-1 relative h-[520px] min-h-[520px] rounded-lg overflow-hidden border border-border">
          <MapContainer 
            center={[39.07, 23.73]} 
            zoom={6} 
            scrollWheelZoom={true} 
            style={{ height: "100%", width: "100%" }}
          >
            <MapBounds points={mapPoints} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapPoints.map((point) => {
              const radius = 6;
              const status = point.call.status;
              let fillColor = "#3b82f6";
              let color = "#2563eb";
              let statusTextClass = "text-success";
              
              if (status === "dropped") {
                fillColor = "#f59e0b";
                color = "#d97706";
                statusTextClass = "text-warning";
              } else if (status === "failed") {
                fillColor = "#ef4444";
                color = "#dc2626";
                statusTextClass = "text-destructive";
              }

              return (
                <CircleMarker
                  key={point.call.callId}
                  center={[point.lat, point.lng]}
                  radius={radius}
                  pathOptions={{
                    fillColor,
                    fillOpacity: 0.6,
                    color,
                    weight: 2,
                  }}
                  eventHandlers={{
                    click: () => onSelectCall(point.call),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                    <div className="text-center font-sans space-y-1">
                      <div className="font-bold text-sm">
                        Call {point.call.callId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Κατάσταση: <span className={statusTextClass}>{status === "completed" ? "Ολοκληρώθηκε" : (status === "dropped" ? "Διακόπηκε" : "Απέτυχε")}</span>
                      </div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Side panel: region breakdown */}
        <div className="w-64 space-y-2 shrink-0">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Ανά Περιοχή
          </h3>
          {Object.entries(regionStats)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([region, stat], i) => (
              <motion.div
                key={region}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-muted/30 border border-border rounded-md px-3 py-2"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">{region}</span>
                  <span className="text-xs font-mono text-muted-foreground">{stat.total} calls</span>
                </div>
                <div className="flex gap-3 text-[10px]">
                  <span className="text-success flex items-center gap-0.5">
                    <Phone className="h-2.5 w-2.5" /> {stat.completed}
                  </span>
                  <span className="text-warning flex items-center gap-0.5">
                    <PhoneOff className="h-2.5 w-2.5" /> {stat.dropped}
                  </span>
                  <span className="text-destructive flex items-center gap-0.5">
                    <PhoneForwarded className="h-2.5 w-2.5" /> {stat.failed}
                  </span>
                </div>
                {/* Mini bar */}
                <div className="flex h-1 mt-1.5 rounded-full overflow-hidden bg-muted">
                  <div className="bg-success" style={{ width: `${(stat.completed / stat.total) * 100}%` }} />
                  <div className="bg-warning" style={{ width: `${(stat.dropped / stat.total) * 100}%` }} />
                  <div className="bg-destructive" style={{ width: `${(stat.failed / stat.total) * 100}%` }} />
                </div>
              </motion.div>
            ))}

          {/* Legend */}
          <div className="flex items-center gap-3 pt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Completed</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> Dropped</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> Failed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallsMap;
