import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Scissors } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder - no actual functionality for now
    alert("Login functionality coming soon!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Brand Section */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Scissors className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Client Portal
          </h1>
          <p className="text-muted-foreground mt-2">
            Message and book with your stylist
          </p>
        </div>

        {/* Login Form */}
        <Card className="bg-card border border-border shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold text-card-foreground">
              Log In
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-base"
                  placeholder="Enter your email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 text-base"
                  placeholder="Enter your password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Log In (Coming Soon)
              </Button>
            </form>

            {/* Subtext */}
            <div className="mt-6 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                <span>Create an account or log in to message your Stylist!</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}