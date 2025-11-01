// Field config per part type. Add/edit freely; the form renders from this map.
export const PART_TYPES = [
  { value: "movements", label: "Movement" },
  { value: "cases", label: "Case" },
  { value: "dials", label: "Dial" },
  { value: "straps", label: "Strap" },
  { value: "hands", label: "Hands" },
  { value: "crowns", label: "Crown" },
];

export const COMMON_FIELDS = [
  { name: "brand", label: "Brand", type: "text", required: true },
  { name: "model", label: "Model", type: "text", required: true },
  { name: "price", label: "Price (USD)", type: "number", step: "0.01", min: "0", required: true },
  { name: "product_url", label: "Product Link", type: "url" },
  { name: "description", label: "Description", type: "textarea" },
];

export const TYPE_FIELDS = {
  movements: [
    { name: "type_", label: "Type", type: "select", options: ["Automatic","Manual Mechanical","Quartz","Mecaquartz"] },
    { name: "power_reserve", label: "Power Reserve (e.g., 40 h)", type: "text" },
    { name: "accuracy", label: "Accuracy (optional)", type: "text" },
    { name: "diameter_mm", label: "Diameter (mm)", type: "number", step: "0.1", min: "0" },
    { name: "height_mm", label: "Height (mm)", type: "number", step: "0.1", min: "0" },
  ],
  cases: [
    { name: "material", label: "Material", type: "text", placeholder: "316L Stainless Steel" },
    { name: "dimension1", label: "Width (mm)", type: "number", step: "0.1", min: "0" },
    { name: "dimension2", label: "Lug-to-lug (mm)", type: "number", step: "0.1", min: "0" },
    { name: "dimension3", label: "Thickness (mm)", type: "number", step: "0.1", min: "0" },
  ],
  dials: [
    { name: "color", label: "Color", type: "text" },
    { name: "material", label: "Material", type: "text" },
    { name: "diameter_mm", label: "Diameter (mm)", type: "number", step: "0.1", min: "0" },
  ],
  straps: [
    { name: "color", label: "Color", type: "text" },
    { name: "material", label: "Material", type: "text" },
    { name: "width_mm", label: "Width (mm)", type: "number", step: "0.1", min: "0" },
    { name: "length_mm", label: "Length (mm)", type: "number", step: "0.1", min: "0" },
  ],
  hands: [
    { name: "color", label: "Color", type: "text" },
    { name: "material", label: "Material", type: "text" },
    { name: "type_", label: "Style", type: "select", options: ["Sword","Baton","Cathedral"] },
  ],
  crowns: [
    { name: "color", label: "Color", type: "text" },
    { name: "material", label: "Material", type: "text" },
  ],
};
