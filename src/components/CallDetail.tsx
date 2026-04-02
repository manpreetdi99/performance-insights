import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Phone, Signal, Clock, Activity, Gauge, ArrowDown, ArrowUp,
  Wifi, AlertTriangle, CheckCircle2, XCircle, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CallRecord } from "@/lib/callData";
import { fetchLteValues, fetchGsmValues } from "@/lib/api";

/**
 * Interface για τα props του Component CallDetail.
 * Η TypeScript μας εγγυάται ότι όποιος καλεί αυτό το Component, 
 * είναι ΥΠΟΧΡΕΩΜΕΝΟΣ να περάσει ένα αντικείμενο `call` (τύπου `CallRecord`) 
 * και μια συνάρτηση `onBack` που δεν επιστρέφει τίποτα (`() => void`).
 */
interface CallDetailProps {
  call: CallRecord;
  database: string;
  onBack: () => void;
}

// Λεξικά στυλιζαρίσματος. Εδώ δεν γράψαμε Type γιατί η TypeScript καταλαβαίνει
// αυτόματα τη δομή τους (Inferred Typing).
const statusColors = {
  success: "border-success/30 bg-success/5",
  warning: "border-warning/30 bg-warning/5",
  error: "border-destructive/30 bg-destructive/5",
};

const statusIcons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const statusTextColors = {
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
};

/**
 * Παράδειγμα συνάρτησης με Types.
 * Δέχεται σαν είσοδο (iso) ένα string και εγγυάται(: string) 
 * ότι το αποτέλεσμά της θα είναι επίσης string.
 */
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const CallDetail = ({ call, database, onBack }: CallDetailProps) => {
  const [radioValues, setRadioValues] = useState<any[]>([]);
  const [isLoadingRadio, setIsLoadingRadio] = useState(false);

  useEffect(() => {
    async function loadRadio() {
      setIsLoadingRadio(true);
      try {
        if (call.callMode === "CS") {
          const res = await fetchGsmValues(database, call.callId);
          setRadioValues(res.gsmValues || []);
        } else {
          const res = await fetchLteValues(database, call.callId);
          setRadioValues(res.lteValues || []);
        }
      } catch (err) {
        console.error("Failed to load radio values", err);
      } finally {
        setIsLoadingRadio(false);
      }
    }
    if (call.callId && database) {
      loadRadio();
    }
  }, [database, call.callId, call.callMode]);

  const metrics = [
    { label: "Download", value: `${call.downloadSpeed.toFixed(1)} Mbps`, icon: ArrowDown, color: "text-primary" },
    { label: "Upload", value: `${call.uploadSpeed.toFixed(1)} Mbps`, icon: ArrowUp, color: "text-accent" },
    { label: "Latency", value: `${call.latency.toFixed(0)} ms`, icon: Gauge, color: "text-warning" },
    { label: "AVG Mos", value: `${call.avgMos.toFixed(2)}`, icon: Gauge, color: "text-warning" },
    { label: "Jitter", value: `${call.jitter.toFixed(1)} ms`, icon: Activity, color: "text-chart-4" },
    { label: "Packet Loss", value: `${call.packetLoss.toFixed(2)}%`, icon: Wifi, color: call.packetLoss > 2 ? "text-destructive" : "text-success" },
    { label: "Setup Time", value: `${call.setupTime_ms} ms`, icon: Timer, color: call.setupTime_ms > 500 ? "text-warning" : "text-success" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-5"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> Πίσω στη λίστα
        </Button>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          call.status === "completed" ? "bg-success/10 text-success" :
          call.status === "dropped" ? "bg-warning/10 text-warning" :
          "bg-destructive/10 text-destructive"
        }`}>
          {call.status.toUpperCase()}
        </span>
      </div>

      {/* Call Info Header */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold font-mono text-foreground">{call.region} · {call.callId}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {call.callType} · {call.technology} · {call.operator} · {call.region}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground space-y-0.5">
            <p>Έναρξη: {formatDateTime(call.startTime)}</p>
            <p>Λήξη: {formatDateTime(call.endTime)}</p>
            <p className="font-mono text-foreground">
              Διάρκεια: {Math.floor(call.duration_s / 60)}m {call.duration_s % 60}s
            </p>
          </div>
        </div>

        {/* MOS Score bar */}
        <div className="flex items-center gap-3">
          {/* <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(call.avgMos / 5) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                call.avgMos >= 3.5 ? "bg-success" : call.avgMos >= 2.5 ? "bg-warning" : "bg-destructive"
              }`}
            />
          </div> */}
          {/* <span className={`text-sm font-bold font-mono ${
            call.avgMos >= 3.5 ? "text-success" : call.avgMos >= 2.5 ? "text-warning" : "text-destructive"
          }`}>
            {call.avgMos > 0 ? call.avgMos.toFixed(2) : "N/A"}
          </span> */}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-lg p-3 text-center"
          >
            <m.icon className={`h-4 w-4 mx-auto mb-1.5 ${m.color}`} />
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className="text-sm font-bold font-mono text-foreground mt-0.5">{m.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Panels Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Event Timeline (Αριστερά) */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Event Timeline
          </h3>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[18px] top-2 bottom-2 w-px bg-border" />

            <div className="space-y-3">
              {call.events.map((event, i) => {
                const EventIcon = statusIcons[event.status];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`relative flex items-start gap-3 pl-2 py-2 px-3 rounded-md border ${statusColors[event.status]}`}
                  >
                    <div className="relative z-10 mt-0.5">
                      <EventIcon className={`h-4 w-4 ${statusTextColors[event.status]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">{event.event}</span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {event.duration_ms > 0 && (
                            <span className="font-mono">{event.duration_ms}ms</span>
                          )}
                          <span>{new Date(event.timestamp).toLocaleTimeString("el-GR")}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{event.details}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Radio Measurements Panel (Δεξιά) */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Signal className="h-4 w-4 text-primary" />
            {call.callMode === "CS" ? "GSM Measurements" : "LTE Measurements"}
          </h3>
          
          {isLoadingRadio ? (
            <p className="text-xs text-muted-foreground">Φόρτωση δεδομένων...</p>
          ) : radioValues && radioValues.length > 0 ? (
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto flex">
              {call.callMode === "CS" ? (
                <table className="w-full text-xs text-center">
                  <thead className="sticky top-0 bg-muted border-b border-border z-10">
                    <tr>
                      <th className="px-2 py-2 font-semibold">SessionId</th>
                      <th className="px-2 py-2 font-semibold">RxLevSub</th>
                      <th className="px-2 py-2 font-semibold">RxQualSub</th>
                      <th className="px-2 py-2 font-semibold">MsgTime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {radioValues.map((val, idx) => {
                      const rxAbs = Math.abs(Number(val.RxLevSub));
                      const rxColor = rxAbs >= 95 ? "text-destructive" : rxAbs >= 90 ? "text-warning" : "text-primary";
                      const rxqAbs = Math.abs(Number(val.RxQualSub));
                      const rsrqColor = rxqAbs >= 6 ? "text-destructive" : rxqAbs >= 5 ? "text-warning" : "text-primary";

                      return (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="px-2 py-2 font-mono">{val.SessionId}</td>
                          <td className={`px-2 py-2 font-mono font-bold ${rxColor}`}>{val.RxLevSub}</td>
                          <td className={`px-2 py-2 font-mono font-bold ${rsrqColor}`}>{val.RxQualSub}</td>
                          <td className="px-2 py-2">{formatDateTime(val.MsgTime)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-xs text-center">
                  <thead className="sticky top-0 bg-muted border-b border-border z-10">
                    <tr>
                      <th className="px-2 py-2 font-semibold">EARFCN</th>
                      <th className="px-2 py-2 font-semibold">RSRP</th>
                      <th className="px-2 py-2 font-semibold">RSRQ</th>
                      <th className="px-2 py-2 font-semibold">MsgTime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {radioValues.map((val, idx) => {
                      const rsrpAbs = Math.abs(Number(val.RSRP));
                      const rsrpColor = rsrpAbs >= 120 ? "text-destructive" : rsrpAbs >= 115 ? "text-warning" : "text-primary";
                      const rsrqAbs = Math.abs(Number(val.RSRQ));
                      const rsrqColor = rsrqAbs >= 18 ? "text-destructive" : rsrqAbs >= 16 ? "text-warning" : "text-primary";

                      return (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="px-2 py-2 font-mono">{val.EARFCN}</td>
                          <td className={`px-2 py-2 font-mono font-bold ${rsrpColor}`}>{val.RSRP}</td>
                          <td className={`px-2 py-2 font-mono font-bold ${rsrqColor}`}>{val.RSRQ}</td>
                          <td className="px-2 py-2">{formatDateTime(val.MsgTime)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Δεν βρέθηκαν δεδομένα για αυτήν την κλήση.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CallDetail;
