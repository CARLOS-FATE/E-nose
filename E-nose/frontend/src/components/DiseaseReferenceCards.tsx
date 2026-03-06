"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface SensorLevel {
    sensor: string
    level: "bajo" | "medio" | "alto" | "muy alto"
    detail: string
}

interface DiseaseInfo {
    name: string
    emoji: string
    category: string
    categoryColor: string
    description: string
    biomarker: string
    sensors: SensorLevel[]
}

const levelColors: Record<string, string> = {
    bajo: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    medio: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    alto: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    "muy alto": "bg-red-500/15 text-red-400 border-red-500/30",
}

const categoryColors: Record<string, string> = {
    oral: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    metabolica: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    respiratoria: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    gastrointestinal: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    cancer: "bg-red-500/15 text-red-400 border-red-500/30",
}

const diseases: DiseaseInfo[] = [
    {
        name: "Periodontitis",
        emoji: "🦷",
        category: "oral",
        categoryColor: "Oral",
        description: "La destrucción del tejido periodontal libera compuestos sulfurados (H₂S, CH₃SH) detectables por MQ135, junto con VOCs de la inflamación bacteriana.",
        biomarker: "H₂S, Metilmercaptano, Cadaverina",
        sensors: [
            { sensor: "VOC", level: "medio", detail: "Acetaldehído por inflamación tisular" },
            { sensor: "MQ3", level: "bajo", detail: "Sin presencia de alcoholes significativa" },
            { sensor: "MQ135", level: "alto", detail: "H₂S y NH₃ de bacterias anaeróbicas" },
            { sensor: "NIR", level: "bajo", detail: "Sin patrón molecular complejo" },
        ],
    },
    {
        name: "Gingivitis",
        emoji: "🩸",
        category: "oral",
        categoryColor: "Oral",
        description: "Inflamación gingival temprana. Produce compuestos sulfurados en menor cantidad que periodontitis, con ligera elevación térmica local.",
        biomarker: "H₂S (leve), Indol, Escatol",
        sensors: [
            { sensor: "VOC", level: "medio", detail: "VOCs inflamatorios en concentración baja" },
            { sensor: "MQ3", level: "bajo", detail: "Normal" },
            { sensor: "MQ135", level: "medio", detail: "H₂S moderado por inflamación inicial" },
            { sensor: "NIR", level: "bajo", detail: "Sin patrón espectral anómalo" },
        ],
    },
    {
        name: "Halitosis",
        emoji: "💨",
        category: "oral",
        categoryColor: "Oral",
        description: "Concentración excesiva de compuestos sulfurados volátiles (CSV) producidos por bacterias proteolíticas en la lengua y surco gingival.",
        biomarker: "H₂S, CH₃SH, (CH₃)₂S",
        sensors: [
            { sensor: "VOC", level: "medio", detail: "Mezcla de VOCs orgánicos volátiles" },
            { sensor: "MQ3", level: "bajo", detail: "Sin relación con alcoholes" },
            { sensor: "MQ135", level: "muy alto", detail: "H₂S dominante: >0.70 ppm normalizado" },
            { sensor: "NIR", level: "bajo", detail: "Compuestos simples sin firma NIR" },
        ],
    },
    {
        name: "Diabetes",
        emoji: "🩺",
        category: "metabolica",
        categoryColor: "Metabólica",
        description: "La cetoacidosis diabética produce acetona como subproducto de la lipólisis. La acetona es el VOC más abundante y fácilmente detectable en aliento.",
        biomarker: "Acetona (C₃H₆O)",
        sensors: [
            { sensor: "VOC", level: "muy alto", detail: "Acetona >0.70: marcador principal" },
            { sensor: "MQ3", level: "bajo", detail: "Sin correlación con etanol" },
            { sensor: "MQ135", level: "bajo", detail: "Gases ambientales normales" },
            { sensor: "NIR", level: "medio", detail: "Absorción C=O de la acetona" },
        ],
    },
    {
        name: "EPOC",
        emoji: "🫁",
        category: "respiratoria",
        categoryColor: "Respiratoria",
        description: "La inflamación crónica de las vías respiratorias genera VOCs como pentano y etano. El estrés oxidativo eleva NOₓ y los alcoholes endógenos.",
        biomarker: "Pentano, Etano, NO, Isopropanol",
        sensors: [
            { sensor: "VOC", level: "medio", detail: "Pentano y etano por peroxidación lipídica" },
            { sensor: "MQ3", level: "medio", detail: "Isopropanol endógeno elevado" },
            { sensor: "MQ135", level: "alto", detail: "NOₓ por inflamación de vías aéreas" },
            { sensor: "NIR", level: "medio", detail: "Patrón oscilatorio leve" },
        ],
    },
    {
        name: "Asma",
        emoji: "🌬️",
        category: "respiratoria",
        categoryColor: "Respiratoria",
        description: "La inflamación eosinofílica bronquial produce NO exhalado elevado. Los VOCs son más sutiles que en EPOC, reflejando inflamación tipo Th2.",
        biomarker: "NO exhalado (FeNO), Pentano leve",
        sensors: [
            { sensor: "VOC", level: "medio", detail: "VOCs inflamatorios en baja concentración" },
            { sensor: "MQ3", level: "bajo", detail: "Normal" },
            { sensor: "MQ135", level: "medio", detail: "NO levemente elevado (FeNO)" },
            { sensor: "NIR", level: "medio", detail: "Patrón de absorción plano-medio" },
        ],
    },
    {
        name: "H. pylori",
        emoji: "🦠",
        category: "gastrointestinal",
        categoryColor: "Gastrointestinal",
        description: "H. pylori produce ureasa que hidroliza urea gástrica en NH₃ y CO₂. El NH₃ es detectable en aliento como elevación sostenida en MQ135.",
        biomarker: "NH₃ (Amoníaco), CO₂ marcado",
        sensors: [
            { sensor: "VOC", level: "medio", detail: "VOCs gástricos por dismotilidad" },
            { sensor: "MQ3", level: "bajo", detail: "Sin presencia de alcoholes" },
            { sensor: "MQ135", level: "alto", detail: "NH₃ elevado por acción de ureasa" },
            { sensor: "NIR", level: "bajo", detail: "Sin firma espectral compleja" },
        ],
    },
    {
        name: "Cáncer de Pulmón",
        emoji: "🔬",
        category: "cancer",
        categoryColor: "Screening",
        description: "Las células tumorales alteran el metabolismo lipídico produciendo aldehídos (hexanal, heptanal) y alcanos específicos con patrones de absorción NIR complejos.",
        biomarker: "Hexanal, Heptanal, 1-Butanol, Alcanos C₄-C₂₀",
        sensors: [
            { sensor: "VOC", level: "alto", detail: "Aldehídos tumorales (hexanal)" },
            { sensor: "MQ3", level: "medio", detail: "1-Butanol como metabolito" },
            { sensor: "MQ135", level: "medio", detail: "Mezcla de gases metabólicos" },
            { sensor: "NIR", level: "muy alto", detail: "Patrón oscilatorio complejo: firma tumoral" },
        ],
    },
    {
        name: "Cáncer Gástrico",
        emoji: "🔬",
        category: "cancer",
        categoryColor: "Screening",
        description: "El metabolismo tumoral gástrico genera ácidos grasos volátiles y NH₃ por descomposición proteica. La firma NIR muestra compuestos de cadena media.",
        biomarker: "Ácidos grasos volátiles, NH₃ tumoral, 2-Butanona",
        sensors: [
            { sensor: "VOC", level: "medio", detail: "Ácidos grasos y cetonas volátiles" },
            { sensor: "MQ3", level: "bajo", detail: "Sin alcoholes significativos" },
            { sensor: "MQ135", level: "alto", detail: "NH₃ por proteólisis tumoral" },
            { sensor: "NIR", level: "alto", detail: "Oscilación media: cadenas orgánicas" },
        ],
    },
    {
        name: "Cáncer Colorrectal",
        emoji: "🔬",
        category: "cancer",
        categoryColor: "Screening",
        description: "Alteraciones en la microbiota intestinal y metabolismo tumoral producen patrones VOC distintos con firmas NIR de absorción molecular.",
        biomarker: "Ciclohexanona, Ácidos grasos de cadena corta",
        sensors: [
            { sensor: "VOC", level: "medio", detail: "Ciclohexanona y derivados" },
            { sensor: "MQ3", level: "bajo", detail: "Normal" },
            { sensor: "MQ135", level: "medio", detail: "Mezcla moderada de gases" },
            { sensor: "NIR", level: "alto", detail: "Absorción por compuestos cíclicos" },
        ],
    },
    {
        name: "Cáncer de Próstata",
        emoji: "🔬",
        category: "cancer",
        categoryColor: "Screening",
        description: "Los sarcosina y otros metabolitos de la próstata generan patrones sutiles en VOC pero firmas NIR muy distintivas por moléculas de alto peso molecular.",
        biomarker: "Sarcosina, Tolueno, DMS elevado",
        sensors: [
            { sensor: "VOC", level: "medio", detail: "VOCs sutiles por metabolismo alterado" },
            { sensor: "MQ3", level: "bajo", detail: "Sin presencia de alcoholes" },
            { sensor: "MQ135", level: "bajo", detail: "Gases ambientales normales" },
            { sensor: "NIR", level: "muy alto", detail: "Firma espectral compleja de alto peso" },
        ],
    },
]

function DiseaseCard({ disease }: { disease: DiseaseInfo }) {
    return (
        <Card className="bg-slate-900/60 border-slate-800/60 hover:border-slate-700/60 transition-colors duration-300">
            <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                        <span className="text-lg">{disease.emoji}</span>
                        {disease.name}
                    </CardTitle>
                    <Badge variant="outline" className={`text-[10px] py-0 ${categoryColors[disease.category]}`}>
                        {disease.categoryColor}
                    </Badge>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{disease.description}</p>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2.5">
                {/* Biomarker */}
                <div className="flex items-start gap-1.5">
                    <span className="text-[10px] text-slate-500 font-medium shrink-0 mt-0.5">BIOMARCADOR:</span>
                    <span className="text-[11px] text-cyan-400 font-mono">{disease.biomarker}</span>
                </div>

                {/* Sensor Levels */}
                <div className="space-y-1.5">
                    {disease.sensors.map((s) => (
                        <div key={s.sensor} className="flex items-center gap-2 text-[11px]">
                            <span className="text-slate-500 font-mono w-10 shrink-0">{s.sensor}</span>
                            <Badge variant="outline" className={`text-[10px] py-0 px-1.5 min-w-[52px] justify-center ${levelColors[s.level]}`}>
                                {s.level}
                            </Badge>
                            <span className="text-slate-400 truncate">{s.detail}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

export function DiseaseReferenceCards() {
    const categories = [
        { key: "oral", label: "🦷 Enfermedades Orales", items: diseases.filter((d) => d.category === "oral") },
        { key: "metabolica", label: "🩺 Metabólicas", items: diseases.filter((d) => d.category === "metabolica") },
        { key: "respiratoria", label: "🫁 Respiratorias", items: diseases.filter((d) => d.category === "respiratoria") },
        { key: "gastrointestinal", label: "🦠 Gastrointestinales", items: diseases.filter((d) => d.category === "gastrointestinal") },
        { key: "cancer", label: "🔬 Screening de Cáncer", items: diseases.filter((d) => d.category === "cancer") },
    ]

    return (
        <div className="space-y-6">
            {categories.map((cat) => (
                <div key={cat.key}>
                    <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        {cat.label}
                        <span className="text-[10px] text-slate-600 font-normal">({cat.items.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {cat.items.map((disease) => (
                            <DiseaseCard key={disease.name} disease={disease} />
                        ))}
                    </div>
                </div>
            ))}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/40">
                <span className="text-[10px] text-slate-600 font-medium">NIVELES:</span>
                {Object.entries(levelColors).map(([level, cls]) => (
                    <Badge key={level} variant="outline" className={`text-[10px] py-0 ${cls}`}>
                        {level}
                    </Badge>
                ))}
            </div>
        </div>
    )
}
