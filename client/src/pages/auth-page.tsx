import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Redirect } from "wouter";
import { Loader2, Scissors } from "lucide-react";
import { PasswordStrength } from "@/components/password-strength";

const loginSchema = insertUserSchema.pick({ email: true, password: true });
type LoginData = z.infer<typeof loginSchema>;

const signupSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupData = z.infer<typeof signupSchema>;

export default function AuthPage() {
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("login");

  // Form for login
  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Form for signup  
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  
  const signupForm = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      businessName: "",
    },
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/dashboard" />;
  }

  const onLogin = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const onSignup = (data: SignupData) => {
    // Remove confirmPassword from data before sending to API
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="w-full max-w-md space-y-6 sm:space-y-8 my-4 sm:my-8 animate-slide-in">
        {/* Logo/Brand Section */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary rounded-full flex items-center justify-center mb-4 animate-float shadow-enhanced">
            <Scissors className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">StylistPro</h1>
          <p className="text-muted-foreground mt-2">Professional hairstylist management platform</p>
        </div>

        {/* Auth Forms */}
        <Card className="bg-card border border-border shadow-enhanced glass hover-lift transition-enhanced">
          <CardContent className="p-6 sm:p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-lg">
                <TabsTrigger value="login" data-testid="tab-login" className="transition-enhanced hover-lift">Sign In</TabsTrigger>
                <TabsTrigger value="signup" data-testid="tab-signup" className="transition-enhanced hover-lift">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-6 mt-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-card-foreground">Welcome Back</h2>
                  <p className="text-muted-foreground mt-2">Access your stylist dashboard</p>
                </div>

                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email Address</Label>
                    <Input
                      id="login-email"
                      type="email"
                      data-testid="input-login-email"
                      {...loginForm.register("email")}
                      className="h-12 sm:h-12 transition-enhanced focus-enhanced text-base"
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      data-testid="input-login-password"
                      {...loginForm.register("password")}
                      className="h-12 sm:h-12 transition-enhanced focus-enhanced text-base"
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 sm:h-12 text-base bg-primary hover:bg-primary/90 text-primary-foreground transition-enhanced hover-lift focus-enhanced gradient-primary"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-6 mt-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-card-foreground">Create Your Account</h2>
                  <p className="text-muted-foreground mt-2">Start managing your salon business today</p>
                </div>

                <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                  {/* First Name and Last Name Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstName">First Name *</Label>
                      <Input
                        id="signup-firstName"
                        type="text"
                        data-testid="input-signup-firstName"
                        {...signupForm.register("firstName")}
                        className="h-12 sm:h-12 transition-enhanced focus-enhanced text-base"
                        required
                      />
                      {signupForm.formState.errors.firstName && (
                        <p className="text-sm text-destructive">{signupForm.formState.errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastName">Last Name *</Label>
                      <Input
                        id="signup-lastName"
                        type="text"
                        data-testid="input-signup-lastName"
                        {...signupForm.register("lastName")}
                        className="h-12 sm:h-12 transition-enhanced focus-enhanced text-base"
                        required
                      />
                      {signupForm.formState.errors.lastName && (
                        <p className="text-sm text-destructive">{signupForm.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email Address *</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      data-testid="input-signup-email"
                      {...signupForm.register("email")}
                      className="h-12 sm:h-12 transition-enhanced focus-enhanced text-base"
                      required
                    />
                    {signupForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password *</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      data-testid="input-signup-password"
                      {...signupForm.register("password", {
                        onChange: (e) => setPasswordValue(e.target.value),
                      })}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      className="h-12 sm:h-12 transition-enhanced focus-enhanced text-base"
                      required
                    />
                    {signupForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>
                    )}
                    <PasswordStrength 
                      password={passwordValue} 
                      show={passwordFocused || passwordValue.length > 0} 
                    />
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirmPassword">Confirm Password *</Label>
                    <Input
                      id="signup-confirmPassword"
                      type="password"
                      data-testid="input-signup-confirmPassword"
                      {...signupForm.register("confirmPassword")}
                      className="h-12 sm:h-12 transition-enhanced focus-enhanced text-base"
                      required
                    />
                    {signupForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  {/* Business Name */}
                  <div className="space-y-2">
                    <Label htmlFor="signup-business">Business Name</Label>
                    <Input
                      id="signup-business"
                      type="text"
                      data-testid="input-signup-business"
                      {...signupForm.register("businessName")}
                      className="h-12 sm:h-12 transition-enhanced focus-enhanced text-base"
                      placeholder="Optional - Your salon or business name"
                    />
                    {signupForm.formState.errors.businessName && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.businessName.message}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 sm:h-12 text-base bg-primary hover:bg-primary/90 text-primary-foreground transition-enhanced hover-lift focus-enhanced gradient-primary"
                    disabled={registerMutation.isPending}
                    data-testid="button-signup"
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
