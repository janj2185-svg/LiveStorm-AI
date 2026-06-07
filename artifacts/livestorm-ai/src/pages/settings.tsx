import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetMyProfile, useUpdateMyProfile } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { User, Shield } from "lucide-react";

const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters").max(30),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function Settings() {
  const { data: user, isLoading } = useGetMyProfile();
  const updateProfile = useUpdateMyProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
    },
  });

  // Update form defaults when user data loads
  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName || "",
      });
    }
  }, [user, form]);

  const onSubmit = (data: ProfileFormValues) => {
    updateProfile.mutate(
      { data },
      {
        onSuccess: () => {
          toast({
            title: "Profile Updated",
            description: "Your settings have been saved successfully.",
          });
          queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to update profile.",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Settings</h2>
        <p className="text-muted-foreground">Manage your account and platform preferences.</p>
      </div>

      <Card className="bg-card border-white/5">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update how you appear to others on the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter display name" {...field} className="bg-background border-border max-w-md" disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2 max-w-md">
                <FormLabel>Email Address</FormLabel>
                <Input value={user?.email || ""} disabled className="bg-background/50 border-border opacity-50" />
                <p className="text-xs text-muted-foreground">Managed via Clerk</p>
              </div>
              
              <Button type="submit" className="mt-4 bg-primary hover:bg-primary/90" disabled={updateProfile.isPending || isLoading}>
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="bg-card border-white/5">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Subscription Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-background border border-border flex items-center justify-between">
            <div>
              <p className="font-bold text-white capitalize">{user?.plan || 'Free'} Plan</p>
              <p className="text-sm text-muted-foreground">Basic streaming and gamification features.</p>
            </div>
            <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-white transition-colors">
              Upgrade
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
