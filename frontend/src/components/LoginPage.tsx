import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { login, signup } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginUserType, setLoginUserType] = useState<"student" | "faculty">("student");

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regUserType, setRegUserType] = useState<"student" | "faculty">("student");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success("Login successful!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!regName || !regEmail || !regPassword || !regConfirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (regPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await signup({
        name: regName,
        email: regEmail,
        password: regPassword,
        user_type: regUserType,
      });
      toast.success("Registration successful!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center pb-6">


          <div className="mx-auto w-40 h-40 rounded-xl flex items-center justify-center overflow-hidden">
  <img 
    src="/logo.png" 
    alt="Mu'een Logo" 
    className="w-100 h-100 object-contain"
    onError={(e) => {
      const target = e.currentTarget;
      target.style.display = 'none';
      const parent = target.parentElement;
      if (parent) {
        const fallback = document.createElement('span');
        fallback.className = 'text-4xl text-white font-bold';
        fallback.textContent = 'م';
        parent.appendChild(fallback);
      }
    }}
  />
</div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Mu'een
            </h1>
            <CardDescription className="mt-2">
              Your Academic Recommendation System
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loginUserType">I am a</Label>
                  <Select
                    value={loginUserType}
                    onValueChange={(value: "student" | "faculty") => setLoginUserType(value)}
                  >
                    <SelectTrigger id="loginUserType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="faculty">Faculty Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loginEmail">Email</Label>
                  <Input
                    id="loginEmail"
                    type="email"
                    placeholder="your.email@university.edu"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loginPassword">Password</Label>
                  <Input
                    id="loginPassword"
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="regUserType">I am a *</Label>
                  <Select
                    value={regUserType}
                    onValueChange={(value: "student" | "faculty") => setRegUserType(value)}
                  >
                    <SelectTrigger id="regUserType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="faculty">Faculty Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regName">Full Name</Label>
                  <Input
                    id="regName"
                    type="text"
                    placeholder="Enter your full name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regEmail">Email</Label>
                  <Input
                    id="regEmail"
                    type="email"
                    placeholder="your.email@university.edu"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regPassword">Password</Label>
                  <Input
                    id="regPassword"
                    type="password"
                    placeholder="Create a password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regConfirmPassword">Confirm Password</Label>
                  <Input
                    id="regConfirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  disabled={loading}
                >
                  {loading ? "Creating Account..." : "Register"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <div className="px-6 py-4 text-center border-t bg-gray-50">
          <p className="text-sm text-gray-600">
            Mu'een – Academic Recommendation System
          </p>
        </div>
      </Card>
    </div>
  );
}