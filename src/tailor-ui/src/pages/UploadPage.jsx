import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import Card from "../components/Card";
import Button from "../components/Button";
import PartTypePicker from "../components/PartTypePicker";
import PartForm from "../components/PartForm";
import ImageEditor from "../components/ImageEditor";
import { PART_TYPES } from "../utils/partFields";
import { api } from "../utils/api";

function UploadInner() {
  const [search] = useSearchParams();
  const navigate = useNavigate();

  // If present: edit mode like /upload?type=dials&id=123
  const editTypeParam = search.get("type");
  const editIdParam = search.get("id");
  const editing = !!(editTypeParam && editIdParam);

  const [type, setType] = useState(editTypeParam || null);
  const [form, setForm] = useState({}); // dynamic fields from PartForm

  const [finalBlob, setFinalBlob] = useState(null);
  const [finalMeta, setFinalMeta] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const typeLabel = useMemo(() => {
    const f = PART_TYPES.find((t) => t.value === type);
    return f ? f.label : "";
  }, [type]);

  const isValid = useMemo(() => {
    if (!type) return false;
    if (!editing && !finalBlob) return false; // create requires image export
    return !!form.brand && !!form.model && (form.price !== "" && form.price != null);
  }, [type, form, finalBlob, editing]);

  // Editing: fetch part + pre-fill
  useEffect(() => {
    let cancelled = false;
    async function loadForEdit() {
      if (!editing) return;
      try {
        const data = await api(`/api/parts/${editTypeParam}/${editIdParam}`);
        if (cancelled) return;
        setForm((prev) => ({
          __type: editTypeParam,
          // Core shared fields
          brand: data.brand || "",
          model: data.model || "",
          price: data.price ?? "",
          product_url: data.product_url || "",
          description: data.description || "",
          // Type-specifics (populate if present)
          type_: data.movement_type || data.type_ || "",
          movement_type_id: data.movement_type_id || undefined,
          power_reserve: data.power_reserve || "",
          accuracy: data.accuracy || "",
          diameter_mm: data.diameter_mm ?? "",
          height_mm: data.height_mm ?? "",
          material: data.material || "",
          dimension1: data.dimension1 ?? "",
          dimension2: data.dimension2 ?? "",
          dimension3: data.dimension3 ?? "",
          color: data.color || "",
          width_mm: data.width_mm ?? "",
          length_mm: data.length_mm ?? "",
        }));
        setType(editTypeParam);
        if (data.image_url) setImagePreviewUrl(data.image_url);
        if (data.align_meta) setFinalMeta(data.align_meta);
      } catch (e) {
        console.error(e);
        setSaveMsg(`Failed to load for edit: ${e.message || e}`);
      }
    }
    loadForEdit();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, editTypeParam, editIdParam]);

  // 🔧 FIX: avoid setState during render. If the form's __type changes,
  // sync it to `type` via an effect instead of doing it inline.
  const effectiveType = form.__type || type;
  useEffect(() => {
    if (effectiveType && effectiveType !== type) {
      setType(effectiveType);
    }
  }, [effectiveType, type]);

  const handleExport = async (blob, meta) => {
    setFinalBlob(blob);
    setFinalMeta(meta);
    setImagePreviewUrl(URL.createObjectURL(blob));
  };

  const uploadImageAndBuildPayload = async () => {
    const presign = await api("/api/uploads/presign", {
      method: "POST",
      body: { filename: "cutout.png", contentType: "image/png" },
    });
    const putRes = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/png" },
      body: finalBlob,
    });
    if (!putRes.ok) throw new Error("image_upload_failed");

    return {
      part_type: type,
      ...form,
      price: Number(form.price) || 0,
      image_key: presign.key,
      image_url: presign.cdnUrl,
      align_meta: finalMeta,
    };
  };

  const buildEditPayload = async () => {
    const base = {
      ...form,
      price: Number(form.price) || 0,
      align_meta: finalMeta,
    };
    // If user exported a new image, upload & include new image_url
    if (finalBlob) {
      const presign = await api("/api/uploads/presign", {
        method: "POST",
        body: { filename: "cutout.png", contentType: "image/png" },
      });
      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: finalBlob,
      });
      if (!putRes.ok) throw new Error("image_upload_failed");
      base.image_key = presign.key;
      base.image_url = presign.cdnUrl;
    }
    // Strip client helper
    delete base.__type;
    return base;
  };

  const onSave = async () => {
    try {
      setSaving(true);
      setSaveMsg("");
      if (editing) {
        const payload = await buildEditPayload();
        const updated = await api(`/api/parts/${type}/${editIdParam}`, {
          method: "PATCH",
          body: payload,
        });
        setSaveMsg("Updated ✔");
        // navigate back to profile after a short beat
        setTimeout(() => navigate("/profile"), 400);
        return updated;
      } else {
        const payload = await uploadImageAndBuildPayload();
        try {
          const created = await api("/api/parts", { method: "POST", body: payload });
          setSaveMsg("Saved ✔");
          return created;
        } catch (e) {
          // If backend route not ready, still show payload for debugging
          setSaveMsg(`Uploaded image. Save failed: ${e.message || e} — payload shown below.`);
          console.log("PART PAYLOAD →", payload);
        }
      }
    } catch (e) {
      console.error(e);
      setSaveMsg(`Save failed: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  if (!type) {
    return (
      <PartTypePicker
        onPick={(t) => {
          setType(t);
          setForm({ __type: t });
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6 grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            {editing ? `Edit: ${typeLabel}` : `Upload: ${typeLabel}`}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" onClick={() => setType(null)}>
              {editing ? "Change part" : "Change part type"}
            </Button>
          </div>
        </div>

        <PartForm type={type} form={form} setForm={setForm} />

        <Card className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {editing
              ? imagePreviewUrl
                ? "Current image shown below. Export a new image if you want to replace it."
                : "Export an image from the editor to attach (optional)."
              : imagePreviewUrl
              ? "Image ready to upload."
              : "Export an image from the editor to continue."}
          </div>
          <Button onClick={onSave} disabled={!isValid || saving}>
            {saving ? (editing ? "Updating…" : "Saving…") : editing ? "Save Changes" : "Save Part"}
          </Button>
        </Card>

        {saveMsg && (
          <Card className="text-sm text-gray-700">
            {saveMsg}
            {saveMsg.includes("payload") && (
              <pre className="mt-3 text-xs text-gray-600 whitespace-pre-wrap break-all">
                {JSON.stringify({ part_type: type, ...form, align_meta: finalMeta }, null, 2)}
              </pre>
            )}
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <ImageEditor type={type} form={form} onExport={handleExport} />
        {imagePreviewUrl && (
          <Card>
            <div className="text-sm font-medium mb-2">
              {editing ? "Current / New image preview" : "Export preview"}
            </div>
            <img
              src={imagePreviewUrl}
              alt="final"
              className="max-h-80 rounded-xl object-contain"
            />
            {finalMeta && (
              <pre className="mt-3 text-xs text-gray-600 whitespace-pre-wrap break-all">
{JSON.stringify(finalMeta, null, 2)}
              </pre>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <ProtectedRoute>
      <UploadInner />
    </ProtectedRoute>
  );
}
