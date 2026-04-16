import { useState } from "react";
import { Shield, Lock, Trash2, Copy, Check, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { detectPII } from "@/lib/gemini";
import { motion, AnimatePresence } from "motion/react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "@/lib/firestoreUtils";

export default function Sanitizer() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [redactedText, setRedactedText] = useState("");
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async () => {
    if (!input.trim()) {
      toast.error("Please enter some text to analyze.");
      return;
    }

    setLoading(true);
    try {
      const data = await detectPII(input);
      setResult(data);
      
      // Perform initial redaction
      let text = input;
      // Sort by startIndex descending to avoid index shifting
      const sortedPII = [...data.pii_found].sort((a, b) => b.startIndex - a.startIndex);
      
      sortedPII.forEach((pii) => {
        const placeholder = `[REDACTED_${pii.type.toUpperCase().replace(/\s+/g, '_')}]`;
        text = text.substring(0, pii.startIndex) + placeholder + text.substring(pii.endIndex);
      });
      
      setRedactedText(text);

      // Save to Firestore if authenticated
      if (auth?.currentUser) {
        const path = 'audits';
        try {
          await addDoc(collection(db, path), {
            userId: auth.currentUser.uid,
            type: 'pii',
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

      toast.success("Analysis complete!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to analyze text. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <Card className="flex flex-col border-none shadow-sm bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              INPUT DATA
            </CardTitle>
            <CardDescription className="text-xs">Paste your text or document content here.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <Textarea
              placeholder="Enter text containing sensitive information..."
              className="flex-1 min-h-[400px] font-mono text-sm resize-none bg-muted/20 border-none focus-visible:ring-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <div className="flex justify-between items-center pt-2">
              <Button variant="ghost" size="sm" onClick={() => setInput("")} className="text-muted-foreground">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button onClick={handleAnalyze} disabled={loading} className="rounded-full px-6">
                {loading ? "Analyzing..." : "Analyze & Redact"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card className="flex flex-col border-none shadow-sm bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              SANITIZED OUTPUT
            </CardTitle>
            <CardDescription className="text-xs">Redacted version of your input.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <div className="relative flex-1">
              <ScrollArea className="h-[400px] w-full rounded-xl border-none bg-muted/30 p-6 font-mono text-sm leading-relaxed">
                {redactedText || (
                  <div className="h-full flex items-center justify-center text-muted-foreground italic opacity-50">
                    Sanitized text will appear here...
                  </div>
                )}
              </ScrollArea>
              {redactedText && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-4 right-4 rounded-full shadow-sm"
                  onClick={() => copyToClipboard(redactedText)}
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              )}
            </div>

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 pt-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Detected PII</h4>
                    <Badge variant="secondary" className="rounded-full px-3 py-0.5 text-[10px] font-bold">
                      RISK SCORE: {result.risk_score}/100
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {result.pii_found.map((pii: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="rounded-full px-3 py-1 text-[11px] border-muted/50 bg-background/50">
                        <span className="font-bold mr-1">{pii.type}:</span>
                        <span className="text-muted-foreground">{pii.value}</span>
                        {pii.risk_level === "High" && <AlertTriangle className="h-3 w-3 text-red-500 ml-1" />}
                      </Badge>
                    ))}
                  </div>

                  <div className="bg-accent/30 p-4 rounded-xl border border-accent/50">
                    <div className="flex items-start gap-3">
                      <Info className="h-4 w-4 text-primary mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Analysis Summary</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {result.summary}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
