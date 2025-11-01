import { useMemo, useState } from 'react'
import ProtectedRoute from '../components/ProtectedRoute'
import Card from '../components/Card'
import Button from '../components/Button'
import PartTypePicker from '../components/PartTypePicker'
import PartForm from '../components/PartForm'
import ImageEditor from '../components/ImageEditor'
import { PART_TYPES, TYPE_FIELDS } from '../utils/partFields'
import { api } from '../utils/api'

function UploadInner() {
  // Step: choose type → edit
  const [type, setType] = useState(null)
  const [form, setForm] = useState({})  // dynamic fields

  // Exported image from editor
  const [finalBlob, setFinalBlob] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")

  const typeLabel = useMemo(() => {
    const f = PART_TYPES.find(t => t.value === type)
    return f ? f.label : ""
  }, [type])

  const isValid = useMemo(() => {
    if (!type || !finalBlob) return false
    // simple presence checks for common fields
    return !!form.brand && !!form.model && (form.price !== "" && form.price != null)
  }, [type, form, finalBlob])

  const onExportPng = async (blob) => {
    setFinalBlob(blob)
    const url = URL.createObjectURL(blob)
    setImagePreviewUrl(url)
  }

  const uploadImageAndBuildPayload = async () => {
    // 1) upload finalBlob via your S3-style local upload
    const presign = await api('/api/uploads/presign', {
      method: 'POST',
      body: { filename: 'cutout.png', contentType: 'image/png' }
    })
    const putRes = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: finalBlob
    })
    if (!putRes.ok) throw new Error('image_upload_failed')

    // 2) return a payload you can POST to /api/parts later
    return {
      part_type: type,
      ...form,
      price: Number(form.price) || 0,
      image_key: presign.key,
      image_url: presign.cdnUrl,
    }
  }

  const onSave = async () => {
    try {
      setSaving(true); setSaveMsg("")
      const payload = await uploadImageAndBuildPayload()

      // If your /api/parts exists, POST it. If not, we just show the JSON.
      try {
        const res = await api('/api/parts', { method: 'POST', body: payload })
        setSaveMsg("Saved ✔")
      } catch {
        setSaveMsg("Uploaded image. Backend for /api/parts not ready — payload shown below.")
        console.log("PART PAYLOAD →", payload)
      }
    } catch (e) {
      console.error(e)
      setSaveMsg("Save failed")
    } finally {
      setSaving(false)
    }
  }

  if (!type) return <PartTypePicker onPick={(t)=>{ setType(t); setForm({ __type: t }) }} />

  // Keep dropdown in sync: PartForm writes __type when changed
  const effectiveType = form.__type || type
  if (effectiveType !== type) setType(effectiveType)

  return (
    <div className="mx-auto max-w-7xl p-6 grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Upload: {typeLabel}</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" onClick={()=>setType(null)}>Change part type</Button>
          </div>
        </div>

        <PartForm type={type} form={form} setForm={setForm} />

        <Card className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {imagePreviewUrl ? "Image ready to upload." : "Export an image from the editor to continue."}
          </div>
          <Button onClick={onSave} disabled={!isValid || saving}>
            {saving ? "Saving…" : "Save Part"}
          </Button>
        </Card>

        {saveMsg && (
          <Card className="text-sm text-gray-700">
            {saveMsg}
            {saveMsg.includes("payload") && (
              <pre className="mt-3 text-xs text-gray-600 whitespace-pre-wrap break-all">
                {JSON.stringify({ part_type: type, ...form, image_url: imagePreviewUrl }, null, 2)}
              </pre>
            )}
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <ImageEditor onExportPng={onExportPng} />
        {imagePreviewUrl && (
          <Card>
            <div className="text-sm font-medium mb-2">Export preview</div>
            <img src={imagePreviewUrl} alt="final" className="max-h-80 rounded-xl object-contain" />
          </Card>
        )}
      </div>
    </div>
  )
}

export default function UploadPage() {
  return (
    <ProtectedRoute>
      <UploadInner />
    </ProtectedRoute>
  )
}
