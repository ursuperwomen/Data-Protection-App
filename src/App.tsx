/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Shield, Lock, Eye, FileText, Menu, X, Github, Linkedin, Mail, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "motion/react";
import Sanitizer from "@/components/Sanitizer";
import RiskAnalyzer from "@/components/RiskAnalyzer";
import PolicyChecker from "@/components/PolicyChecker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { auth, db } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { toast } from "sonner";

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        // Ensure user document exists
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            role: 'user',
            createdAt: new Date().toISOString()
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success("Signed in successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to sign in.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to sign out.");
    }
  };

  const navItems = [
    { id: "home", label: "Home", icon: Shield },
    { id: "sanitizer", label: "PII Sanitizer", icon: Lock },
    { id: "analyzer", label: "Risk Analyzer", icon: Eye },
    { id: "policy", label: "Policy Checker", icon: FileText },
  ];

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-card p-6 gap-8">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-6 w-6" />
            <span className="text-xl font-extrabold tracking-tighter">GUARDIANAI</span>
          </div>
          
          <nav className="flex-1">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === item.id 
                        ? "bg-accent text-accent-foreground" 
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="pt-6 border-t">
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              System Status: Optimal
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-16 border-b bg-card/50 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-50">
            <div className="md:hidden flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-bold tracking-tight">GuardianAI</span>
            </div>
            
            <div className="hidden md:block">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {navItems.find(i => i.id === activeTab)?.label}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold">{user.displayName}</p>
                    <p className="text-[10px] text-muted-foreground">{user.email}</p>
                  </div>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full border bg-muted" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-8 w-8 rounded-full border bg-muted flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button variant="default" size="sm" onClick={handleSignIn} className="rounded-full px-6">
                  Sign In
                </Button>
              )}
              <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </header>

          {/* Mobile Nav */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden border-b bg-card px-4 py-4 overflow-hidden"
              >
                <ul className="space-y-2">
                  {navItems.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                          activeTab === item.id ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Page Content */}
          <main className="flex-1 p-8 overflow-auto">
            <AnimatePresence mode="wait">
              {activeTab === "home" && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8 max-w-6xl mx-auto"
                >
                  <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Data Governance</h1>
                    <p className="text-muted-foreground text-sm">Overview of protection metrics for your decentralized infrastructure.</p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid sm:grid-cols-3 gap-6">
                    <Card className="border-none shadow-sm bg-card">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Security Health</CardDescription>
                        <CardTitle className="text-3xl font-bold">98.4%</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs font-semibold text-green-500">+2.1% from last month</p>
                      </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-card">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Encrypted Assets</CardDescription>
                        <CardTitle className="text-3xl font-bold">4.2 TB</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs font-semibold text-muted-foreground">AES-256 GCM Standard</p>
                      </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-card">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Active Threats</CardDescription>
                        <CardTitle className="text-3xl font-bold">0</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs font-semibold text-muted-foreground">No alerts in last 24h</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Table Section */}
                  <Card className="border-none shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/20">
                      <h3 className="font-semibold text-sm">Recent Protection Events</h3>
                      <button className="text-xs font-bold text-primary hover:underline">View All Logs</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="px-6 py-4">Timestamp</th>
                            <th className="px-6 py-4">Endpoint Node</th>
                            <th className="px-6 py-4">Event Type</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Encryption</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {[
                            { time: "Oct 24, 2023 · 14:22", node: "Node-Alpha-491", event: "Automatic Re-keying", status: "Completed", enc: "RSA-4096" },
                            { time: "Oct 24, 2023 · 12:05", node: "S3-Cold-Storage", event: "Data Migration", status: "In Progress", enc: "AES-256" },
                            { time: "Oct 24, 2023 · 09:14", node: "API-Gateway-Primary", event: "Zero-Trust Auth", status: "Verified", enc: "TLS 1.3" },
                            { time: "Oct 23, 2023 · 22:45", node: "Legacy-DB-02", event: "Vulnerability Patch", status: "Critical Update", enc: "None", high: true },
                          ].map((row, i) => (
                            <tr key={i} className="hover:bg-muted/10 transition-colors">
                              <td className="px-6 py-4 text-muted-foreground tabular-nums">{row.time}</td>
                              <td className="px-6 py-4 font-medium">{row.node}</td>
                              <td className="px-6 py-4">{row.event}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                  row.high ? "bg-red-100 text-red-600" : "bg-blue-50 text-blue-600"
                                }`}>
                                  {row.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">{row.enc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === "sanitizer" && (
                <motion.div key="sanitizer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Sanitizer />
                </motion.div>
              )}

              {activeTab === "analyzer" && (
                <motion.div key="analyzer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <RiskAnalyzer />
                </motion.div>
              )}

              {activeTab === "policy" && (
                <motion.div key="policy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <PolicyChecker />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}
