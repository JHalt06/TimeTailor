import { useState } from "react";
import TwoPane from "../components/TwoPane";
import WatchCanvas from "../components/WatchCanvas";
import PartsPanel from "../components/PartsPanel";
import Card from "../components/Card";
import Button from "../components/Button";
import { api } from "../utils/api";
import { useAuth } from "../hooks/useAuth";

export default function HomePage() {
  const { user, login } = useAuth();
  // Keep both id and full object so selection works in UI AND preview can render images.
  const [selection, setSelection] = useState({
    movements_id: null, movements: null,
    cases_id: null,     cases: null,
    dials_id: null,     dials: null,
    straps_id: null,    straps: null,
    hands_id: null,     hands: null,
    crowns_id: null,    crowns: null,
  });
  const [saving, setSaving] = useState(false);
  const total = 0;

  const onPick = (type, item) => {
    const idKey = `${type}_id`;
    setSelection(prev => ({ ...prev, [idKey]: item?.id ?? item, [type]: item || null }));
  };

  const saveBuild = async () => {
    if (!user) return login("/profile");
    setSaving(true);
    try {
      await api("/api/builds", {
        method: "POST",
        body: {
          movements_id: selection.movements_id,
          cases_id: selection.cases_id,
          dials_id: selection.dials_id,
          straps_id: selection.straps_id,
          hands_id: selection.hands_id,
          crowns_id: selection.crowns_id,
        }
      });
      alert("Saved build!");
    } finally { setSaving(false); }
  };

  return (
    <TwoPane
      left={
        <>
          <WatchCanvas selection={selection} />
          <Card className="mt-4 flex items-center justify-between">
            <div className="text-sm">
              Estimated total: <strong>${total.toFixed?.(2) ?? total}</strong>
            </div>
            <div className="flex gap-2">
              {!user ? (
                <Button onClick={() => login("/")}>Sign in to Save</Button>
              ) : (
                <Button onClick={saveBuild} disabled={saving}>{saving ? "Saving…" : "Save Build"}</Button>
              )}
            </div>
          </Card>
        </>
      }
      right={<PartsPanel selection={selection} onPick={onPick} />}
    />
  );
}
