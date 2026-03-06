import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WeightChart } from "@/components/WeightChart"
import { SystemStatusBar } from "@/components/SystemStatusBar"
import { DiagnosisPanel } from "@/components/DiagnosisPanel"
import { SensorGauges } from "@/components/SensorGauges"
import { SensorBreakdownChart } from "@/components/SensorBreakdownChart"
import { DiseaseReferenceCards } from "@/components/DiseaseReferenceCards"

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-950 text-slate-50">
      <SystemStatusBar />

      <main className="flex-1 space-y-4 p-4 sm:px-6 pt-5">
        {/* Diagnosis + Gauges Row */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <DiagnosisPanel />
          <SensorGauges />
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-slate-900/60 border border-slate-800/60 backdrop-blur-sm">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-800 data-[state=active]:text-teal-400 text-sm">
              📊 Stream en Vivo
            </TabsTrigger>
            <TabsTrigger value="chemistry" className="data-[state=active]:bg-slate-800 data-[state=active]:text-teal-400 text-sm">
              🧪 Química de Gases
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-slate-800 data-[state=active]:text-teal-400 text-sm">
              🧬 Referencia Clínica
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Live Stream */}
          <TabsContent value="overview" className="space-y-4">
            <Card className="bg-slate-900/60 border-slate-800/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-200 text-base">Diagnóstico Periodontal en Tiempo Real</CardTitle>
                <CardDescription className="text-slate-400">
                  Análisis continuo de VOC, MQ3, MQ135 y NIR — Línea roja = umbral de alerta (0.70)
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <WeightChart />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Gas Chemistry */}
          <TabsContent value="chemistry" className="space-y-4">
            <SensorBreakdownChart />
          </TabsContent>

          {/* Tab 3: Clinical Reference */}
          <TabsContent value="system" className="space-y-4">
            <DiseaseReferenceCards />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/40 py-3 px-6 text-center">
        <p className="text-xs text-slate-600">
          E-NOSE v1.0 — Sistema de Nariz Electrónica para Diagnóstico Periodontal — Proyecto Interdisciplinario
        </p>
      </footer>
    </div>
  )
}
