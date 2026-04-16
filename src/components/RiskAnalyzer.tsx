import { useState } from "react";
import { Eye, ShieldAlert, AlertCircle, CheckCircle2, Info, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { detectPII } from "@/lib/gemini";
import { motion, AnimatePresence } from "motion/react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "@/lib/firestoreUtils";

export default function RiskAnalyzer() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!input.trim()) {
      toast.error("Please enter some text to analyze.");
      return;
    }

    setLoading(true);
    try {
      const data = await detectPII(input);
      setResult(data);

      // Save to Firestore if authenticated
      if (auth?.currentUser) {
        const path = 'audits';
        try {
          await addDoc(collection(db, path), {
            userId: auth.currentUser.uid,
            type: 'risk',
            inputSnippet: input.substring(0, 100),
            riskScore: data.risk_score,
            summary: data.summary,
            findings: data.pii_found,
            createdAt: new Date().toISOString()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, path);
        }
      }

      toast.success("Risk analysis complete!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to analyze risks. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-destructive";
    if (score >= 30) return "text-orange-500";
    return "text-green-500";
  };

  const getRiskLabel = (score: number) => {
    if (score >= 70) return "High Risk";
    if (score >= 30) return "Medium Risk";
    return "Low Risk";
  };

  return (
    <div className="space-y-8">
      <Card className="border-none shadow-sm bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            PRIVACY RISK AUDIT
          </CardTitle>
          <CardDescription className="text-xs">Analyze your data for potential privacy vulnerabilities.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Textarea
            placeholder="Paste text, logs, or data snippets to analyze for privacy risks..."
            className="min-h-[200px] font-mono text-sm bg-muted/20 border-none focus-visible:ring-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="flex justify-end">
            <Button onClick={handleAnalyze} disabled={loading} className="rounded-full px-8">
              {loading ? "Performing Deep Scan..." : "Start Privacy Audit"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-3 gap-8"
          >
            {/* Risk Score Card */}
            <Card className="md:col-span-1 border-none shadow-sm bg-card flex flex-col items-center justify-center p-8 text-center">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Overall Risk Score</p>
                <div className={`text-6xl font-black tracking-tighter ${getRiskColor(result.risk_score)}`}>
                  {result.risk_score}
                </div>
                <Progress 
                  value={result.risk_score} 
                  className="h-1.5 w-32 mx-auto"
                />
                <p className="text-xs font-semibold mt-4">
                  {getRiskLabel(result.risk_score)}
                </p>
              </div>
            </Card>

            {/* Findings & Summary */}
            <div className="md:col-span-2 space-y-8">
              <Card className="border-none shadow-sm bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">Key Findings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.pii_found.length > 0 ? (
                      result.pii_found.map((pii: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-muted/50">
                          <div className="flex items-center gap-3">
                            <div className={`h-2 w-2 rounded-full ${
                              pii.risk_level === "High" ? "bg-red-500" : "bg-orange-500"
                            }`} />
                            <div>
                              <p className="text-xs font-bold">{pii.type}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{pii.value}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-bold rounded-full border-muted/50">
                            {pii.risk_level}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
                        <p className="text-xs">No major PII detected.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-primary text-primary-foreground">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Expert Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed opacity-90 italic">
                    "{result.summary}"
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
