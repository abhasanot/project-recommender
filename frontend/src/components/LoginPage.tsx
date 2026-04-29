// frontend/src/components/LoginPage.tsx
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

// ============================================
// REGULAR EXPRESSIONS FOR VALIDATION
// ============================================

// Name regex: letters (Latin + Arabic), spaces, apostrophe, hyphen
const NAME_REGEX = /^[a-zA-Z\u0600-\u06FF\s'\-]+$/;

// Email regex: standard email format
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// Password regex: minimum 8 chars, uppercase, lowercase, number, special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function LoginPage() {
  const { login, signup } = useAuth();
  const [loading, setLoading] = useState(false);

  // Login form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Login error states
  const [loginEmailError, setLoginEmailError] = useState("");
  const [loginPasswordError, setLoginPasswordError] = useState("");
  const [loginTouched, setLoginTouched] = useState({ email: false, password: false });

  // Register form states
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regUserType, setRegUserType] = useState<"student" | "faculty">("student");

  // Register error states
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  // Track if user has touched each field (to show errors only after interaction)
  const [regTouched, setRegTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  // ============================================
  // VALIDATION FUNCTIONS
  // ============================================

  // Login validation
  const validateLoginEmail = (value: string): string => {
    if (!value.trim()) return "Email is required";
    if (!EMAIL_REGEX.test(value)) return "Please enter a valid email address";
    return "";
  };

  const validateLoginPassword = (value: string): string => {
    if (!value) return "Password is required";
    return "";
  };

  // Register validation
  const validateFirstName = (value: string): string => {
    if (!value.trim()) return "First name is required";
    if (!NAME_REGEX.test(value)) return "First name must contain only letters (no numbers or special characters)";
    if (value.length < 2) return "First name must be at least 2 characters";
    if (value.length > 50) return "First name must not exceed 50 characters";
    return "";
  };

  const validateLastName = (value: string): string => {
    if (!value.trim()) return "Last name is required";
    if (!NAME_REGEX.test(value)) return "Last name must contain only letters (no numbers or special characters)";
    if (value.length < 2) return "Last name must be at least 2 characters";
    if (value.length > 50) return "Last name must not exceed 50 characters";
    return "";
  };

  const validateEmail = (value: string): string => {
    if (!value.trim()) return "Email is required";
    if (!EMAIL_REGEX.test(value)) return "Please enter a valid email address (e.g., name@domain.com)";
    if (value.length > 100) return "Email must not exceed 100 characters";
    return "";
  };

  const validatePassword = (value: string): string => {
    if (!value) return "Password is required";
    if (!PASSWORD_REGEX.test(value)) {
      return "Password must be at least 8 characters and include: uppercase, lowercase, number, and special character (@$!%*?&)";
    }
    return "";
  };

  const validateConfirmPassword = (value: string, password: string): string => {
    if (!value) return "Please confirm your password";
    if (value !== password) return "Passwords do not match";
    return "";
  };

  // ============================================
  // LOGIN HANDLERS
  // ============================================

  const handleLoginEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLoginEmail(value);
    // Clear server error when user starts typing
    if (loginEmailError) {
      setLoginEmailError("");
    }
    if (loginTouched.email) {
      setLoginEmailError(validateLoginEmail(value));
    }
  };

  const handleLoginEmailBlur = () => {
    setLoginTouched(prev => ({ ...prev, email: true }));
    setLoginEmailError(validateLoginEmail(loginEmail));
  };

  const handleLoginPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLoginPassword(value);
    if (loginTouched.password) {
      setLoginPasswordError(validateLoginPassword(value));
    }
  };

  const handleLoginPasswordBlur = () => {
    setLoginTouched(prev => ({ ...prev, password: true }));
    setLoginPasswordError(validateLoginPassword(loginPassword));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all login fields as touched
    setLoginTouched({ email: true, password: true });
    
    // Validate all login fields
    const emailErr = validateLoginEmail(loginEmail);
    const passwordErr = validateLoginPassword(loginPassword);
    
    setLoginEmailError(emailErr);
    setLoginPasswordError(passwordErr);
    
    // Stop if validation fails - NO TOAST, only inline errors
    if (emailErr || passwordErr) {
      return;
    }
    
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success("Login successful!"); // ✅ Only success messages as Toast
    } catch (err: any) {
      const serverError = err.response?.data?.error || "Login failed";
      // Show server error under the appropriate field - NO TOAST
      if (serverError.toLowerCase().includes("email") || serverError.toLowerCase().includes("not found")) {
        setLoginEmailError(serverError);
      } else if (serverError.toLowerCase().includes("password")) {
        setLoginPasswordError(serverError);
      } else {
        setLoginEmailError(serverError);
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // REGISTER HANDLERS
  // ============================================

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRegFirstName(value);
    if (regTouched.firstName) {
      setFirstNameError(validateFirstName(value));
    }
  };

  const handleFirstNameBlur = () => {
    setRegTouched(prev => ({ ...prev, firstName: true }));
    setFirstNameError(validateFirstName(regFirstName));
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRegLastName(value);
    if (regTouched.lastName) {
      setLastNameError(validateLastName(value));
    }
  };

  const handleLastNameBlur = () => {
    setRegTouched(prev => ({ ...prev, lastName: true }));
    setLastNameError(validateLastName(regLastName));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRegEmail(value);
    // Clear server error when user starts typing
    if (emailError) {
      setEmailError("");
    }
    if (regTouched.email) {
      setEmailError(validateEmail(value));
    }
  };

  const handleEmailBlur = () => {
    setRegTouched(prev => ({ ...prev, email: true }));
    setEmailError(validateEmail(regEmail));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRegPassword(value);
    if (regTouched.password) {
      setPasswordError(validatePassword(value));
    }
    if (regTouched.confirmPassword) {
      setConfirmPasswordError(validateConfirmPassword(regConfirmPassword, value));
    }
  };

  const handlePasswordBlur = () => {
    setRegTouched(prev => ({ ...prev, password: true }));
    setPasswordError(validatePassword(regPassword));
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRegConfirmPassword(value);
    if (regTouched.confirmPassword) {
      setConfirmPasswordError(validateConfirmPassword(value, regPassword));
    }
  };

  const handleConfirmPasswordBlur = () => {
    setRegTouched(prev => ({ ...prev, confirmPassword: true }));
    setConfirmPasswordError(validateConfirmPassword(regConfirmPassword, regPassword));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all register fields as touched
    setRegTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    // Validate all register fields
    const firstNameErr = validateFirstName(regFirstName);
    const lastNameErr = validateLastName(regLastName);
    const emailErr = validateEmail(regEmail);
    const passwordErr = validatePassword(regPassword);
    const confirmErr = validateConfirmPassword(regConfirmPassword, regPassword);

    setFirstNameError(firstNameErr);
    setLastNameError(lastNameErr);
    setEmailError(emailErr);
    setPasswordError(passwordErr);
    setConfirmPasswordError(confirmErr);

    // Stop if validation fails - NO TOAST, only inline errors
    if (firstNameErr || lastNameErr || emailErr || passwordErr || confirmErr) {
      return;
    }

    setLoading(true);
    try {
      await signup({
        first_name: regFirstName,
        last_name: regLastName,
        email: regEmail,
        password: regPassword,
        user_type: regUserType,
      });
      toast.success("Registration successful!"); // ✅ Only success messages as Toast
    } catch (err: any) {
      const serverError = err.response?.data?.error || "Registration failed";
      // Show server error under the appropriate field - NO TOAST
      if (serverError.toLowerCase().includes("email")) {
        setEmailError(serverError);
      } else if (serverError.toLowerCase().includes("password")) {
        setPasswordError(serverError);
      } else if (serverError.toLowerCase().includes("name")) {
        setFirstNameError(serverError);
        setLastNameError(serverError);
      } else {
        setEmailError(serverError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center pb-6">
          {/* Logo */}
          <div className="mx-auto w-40 h-40 rounded-xl flex items-center justify-center overflow-hidden">
            <img
              src="/logo.png"
              alt="Mu'een Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const fb = document.createElement("span");
                  fb.className = "text-4xl font-bold text-indigo-600";
                  fb.textContent = "م";
                  parent.appendChild(fb);
                }
              }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Mu'een
            </h1>
            <CardDescription className="mt-0">
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

            {/* ============================================
                LOGIN TAB - Error messages appear as red text under fields only
                Success messages appear as Toast
                ============================================ */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-1">
                  <Label htmlFor="loginEmail">Email</Label>
                  <Input
                    id="loginEmail"
                    type="email"
                    placeholder="your.email@university.edu"
                    value={loginEmail}
                    onChange={handleLoginEmailChange}
                    onBlur={handleLoginEmailBlur}
                    required
                    disabled={loading}
                    className="bg-transparent"
                  />
                  {loginEmailError && loginTouched.email && (
                    <p className="text-red-500 text-sm mt-1">{loginEmailError}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <Label htmlFor="loginPassword">Password</Label>
                  <Input
                    id="loginPassword"
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={handleLoginPasswordChange}
                    onBlur={handleLoginPasswordBlur}
                    required
                    disabled={loading}
                    className="bg-transparent"
                  />
                  {loginPasswordError && loginTouched.password && (
                    <p className="text-red-500 text-sm mt-1">{loginPasswordError}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  disabled={loading}
                >
                  {loading ? "Logging in…" : "Login"}
                </Button>
              </form>
            </TabsContent>

            {/* ============================================
                REGISTER TAB - Error messages appear as red text under fields only
                Success messages appear as Toast
                ============================================ */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                {/* User Type Selection */}
                <div className="space-y-2">
                  <Label htmlFor="regUserType">I am a *</Label>
                  <Select
                    value={regUserType}
                    onValueChange={(v: "student" | "faculty") => setRegUserType(v)}
                  >
                    <SelectTrigger id="regUserType" className="bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="faculty">Graduation Projects Committee Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* First Name Field */}
                <div className="space-y-1">
                  <Label htmlFor="regFirstName">First Name *</Label>
                  <Input
                    id="regFirstName"
                    type="text"
                    placeholder="Enter your first name"
                    value={regFirstName}
                    onChange={handleFirstNameChange}
                    onBlur={handleFirstNameBlur}
                    disabled={loading}
                    className="bg-transparent"
                  />
                  {firstNameError && regTouched.firstName && (
                    <p className="text-red-500 text-sm mt-1">{firstNameError}</p>
                  )}
                </div>

                {/* Last Name Field */}
                <div className="space-y-1">
                  <Label htmlFor="regLastName">Last Name *</Label>
                  <Input
                    id="regLastName"
                    type="text"
                    placeholder="Enter your last name"
                    value={regLastName}
                    onChange={handleLastNameChange}
                    onBlur={handleLastNameBlur}
                    disabled={loading}
                    className="bg-transparent"
                  />
                  {lastNameError && regTouched.lastName && (
                    <p className="text-red-500 text-sm mt-1">{lastNameError}</p>
                  )}
                </div>

                {/* Email Field */}
                <div className="space-y-1">
                  <Label htmlFor="regEmail">Email *</Label>
                  <Input
                    id="regEmail"
                    type="email"
                    placeholder="your.email@university.edu"
                    value={regEmail}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    disabled={loading}
                    className="bg-transparent"
                  />
                  {emailError && regTouched.email && (
                    <p className="text-red-500 text-sm mt-1">{emailError}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <Label htmlFor="regPassword">Password *</Label>
                  <Input
                    id="regPassword"
                    type="password"
                    placeholder="Create a password"
                    value={regPassword}
                    onChange={handlePasswordChange}
                    onBlur={handlePasswordBlur}
                    disabled={loading}
                    className="bg-transparent"
                  />
                  {passwordError && regTouched.password && (
                    <p className="text-red-500 text-sm mt-1">{passwordError}</p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1">
                  <Label htmlFor="regConfirmPassword">Confirm Password *</Label>
                  <Input
                    id="regConfirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={regConfirmPassword}
                    onChange={handleConfirmPasswordChange}
                    onBlur={handleConfirmPasswordBlur}
                    disabled={loading}
                    className="bg-transparent"
                  />
                  {confirmPasswordError && regTouched.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{confirmPasswordError}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  disabled={loading}
                >
                  {loading ? "Creating Account…" : "Register"}
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