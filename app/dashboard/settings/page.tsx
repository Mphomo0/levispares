"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function UserSettingsPage() {
  const [orderUpdates, setOrderUpdates] = useState(true)
  const [promotionalEmails, setPromotionalEmails] = useState(false)
  const [newsletter, setNewsletter] = useState(true)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [loginNotifications, setLoginNotifications] = useState(true)
  const [profileVisibility, setProfileVisibility] = useState(false)
  const [activityTracking, setActivityTracking] = useState(true)

  const handleDeleteAccount = () => {
    // TODO: Implement account deletion
    console.log('Account deletion confirmed')
    alert('Account deletion is not yet implemented')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your account preferences.</p>
      </div>

      <div className="grid gap-6">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle>Email Preferences</CardTitle>
            <CardDescription>Choose what emails you want to receive.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Order Updates</p>
                <p className="text-sm text-muted-foreground">Receive emails about your order status</p>
              </div>
              <button 
                role="switch" 
                aria-checked={orderUpdates}
                aria-label="Toggle order updates"
                onClick={() => setOrderUpdates(!orderUpdates)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${orderUpdates ? 'bg-accent' : 'bg-muted'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${orderUpdates ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Promotional Emails</p>
                <p className="text-sm text-muted-foreground">Receive emails about sales and new products</p>
              </div>
              <button 
                role="switch" 
                aria-checked={promotionalEmails}
                aria-label="Toggle promotional emails"
                onClick={() => setPromotionalEmails(!promotionalEmails)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${promotionalEmails ? 'bg-accent' : 'bg-muted'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${promotionalEmails ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Newsletter</p>
                <p className="text-sm text-muted-foreground">Subscribe to our monthly newsletter</p>
              </div>
              <button 
                role="switch" 
                aria-checked={newsletter}
                aria-label="Toggle newsletter"
                onClick={() => setNewsletter(!newsletter)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${newsletter ? 'bg-accent' : 'bg-muted'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newsletter ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your account security settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
              </div>
              <Button variant="outline" size="sm">Enable</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Login Notifications</p>
                <p className="text-sm text-muted-foreground">Get notified of new login attempts</p>
              </div>
              <button 
                role="switch" 
                aria-checked={loginNotifications}
                aria-label="Toggle login notifications"
                onClick={() => setLoginNotifications(!loginNotifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${loginNotifications ? 'bg-accent' : 'bg-muted'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${loginNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Active Sessions</p>
                <p className="text-sm text-muted-foreground">Manage your active login sessions</p>
              </div>
              <Button variant="outline" size="sm">View All</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle>Privacy</CardTitle>
            <CardDescription>Control your privacy settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Profile Visibility</p>
                <p className="text-sm text-muted-foreground">Allow others to see your profile</p>
              </div>
              <button 
                role="switch" 
                aria-checked={profileVisibility}
                aria-label="Toggle profile visibility"
                onClick={() => setProfileVisibility(!profileVisibility)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${profileVisibility ? 'bg-accent' : 'bg-muted'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${profileVisibility ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Activity Tracking</p>
                <p className="text-sm text-muted-foreground">Allow us to track your browsing activity</p>
              </div>
              <button 
                role="switch" 
                aria-checked={activityTracking}
                aria-label="Toggle activity tracking"
                onClick={() => setActivityTracking(!activityTracking)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${activityTracking ? 'bg-accent' : 'bg-muted'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${activityTracking ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions for your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">Delete Account</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Account</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete your account? This action is irreversible and all your data will be permanently lost.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogTrigger asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogTrigger>
                    <Button variant="destructive" onClick={handleDeleteAccount}>
                      Yes, Delete My Account
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
