import { useState } from "react";
import { FileText, CheckCircle2, XCircle, AlertTriangle, Info, ShieldCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { analyzePrivacyPolicy } from "@/lib/gemini";
import { motion, AnimatePresence } from "motion/react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "@/lib/firestoreUtils";

export default function PolicyChecker() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!input.trim()) {
      toast.error("Please enter a privacy policy to analyze.");
      return;
    }

    setLoading(true);
    try {
      const data = await analyzePrivacyPolicy(input);
      setResult(data);

      // Save to Firestore if authenticated
      if (auth?.currentUser) {
        const path = 'policies';
        try {
          await addDoc(collection(db, path), {
            userId: auth.currentUser.uid,
            policyName: input.substring(0, 50),
            complianceScore: data.compliance_score,
            gdprCompliant: data.gdpr_compliant,
            ccpaCompliant: data.ccpa_compliant,
            findings: data.findings,
            summary: data.summary,
            createdAt: new Date().toISOString()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, path);
        }
      }

      toast.success("Compliance audit complete!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to analyze policy. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="border-none shadow-sm bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            COMPLIANCE POLICY AUDIT
          </CardTitle>
          <CardDescription className="text-xs">Audit your privacy policies for GDPR and CCPA compliance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Textarea
            placeholder="Paste the full text of your privacy policy here for a comprehensive compliance audit..."
            className="min-h-[300px] text-sm bg-muted/20 border-none focus-visible:ring-1 leading-relaxed"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="flex justify-end">
            <Button onClick={handleAnalyze} disabled={loading} className="rounded-full px-8">
              {loading ? "Auditing Compliance..." : "Run Compliance Audit"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Summary Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-none shadow-sm bg-card p-6 text-center flex flex-col items-center justify-center">
                <div className="text-4xl font-black text-primary tracking-tighter">{result.compliance_score}%</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Compliance Score</div>
              </Card>
              
              <Card className="border-none shadow-sm bg-card p-6 flex items-center justify-center gap-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  result.gdpr_compliant ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                }`}>
                  {result.gdpr_compliant ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                </div>
                <div>
                  <div className="font-bold text-sm">GDPR</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {result.gdpr_compliant ? "Compliant" : "Non-Compliant"}
                  </div>
                </div>
              </Card>

              <Card className="border-none shadow-sm bg-card p-6 flex items-center justify-center gap-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  result.ccpa_compliant ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                }`}>
                  {result.ccpa_compliant ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                </div>
                <div>
                  <div className="font-bold text-sm">CCPA</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {result.ccpa_compliant ? "Compliant" : "Non-Compliant"}
                  </div>
                </div>
              </Card>
            </div>

            {/* Detailed Findings */}
            <Card className="border-none shadow-sm bg-card overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Audit Findings & Recommendations
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest">
                  <Download className="h-3 w-3 mr-2" />
                  Export PDF
                </Button>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="bg-accent/30 p-4 rounded-xl border border-accent/50 italic text-xs text-muted-foreground leading-relaxed">
                  "{result.summary}"
                </div>

                <div className="space-y-4">
                  {result.findings.map((finding: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-3 p-5 rounded-xl border border-muted/50 bg-muted/10 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {finding.severity === "High" ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : (
                            <Info className="h-4 w-4 text-primary" />
                          )}
                          <span className="font-bold text-sm">{finding.issue}</span>
                        </div>
                        <Badge variant={finding.severity === "High" ? "destructive" : "secondary"} className="rounded-full text-[10px] font-bold">
                          {finding.severity}
                        </Badge>
                      </div>
                      <div className="pl-7 space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Recommendation</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {finding.recommendation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
