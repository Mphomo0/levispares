'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Account Settings</h2>
        <p className="text-muted-foreground">Manage your account preferences and privacy.</p>
      </div>

      <div className="grid gap-6">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Choose how you want to receive updates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">Order Updates</p>
                  <p className="text-sm text-muted-foreground">Get notified about order status changes</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Email</Button>
                  <Button variant="outline" size="sm">SMS</Button>
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-black">Push</Button>
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">Promotions & Deals</p>
                  <p className="text-sm text-text-muted-foreground">Receive special offers and discounts</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Email</Button>
                  <Button variant="outline" size="sm">SMS</Button>
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-black">Push</Button>
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">New Product Alerts</p>
                  <p className="text-sm text-muted-foreground">Be the first to know about new products</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Email</Button>
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-black">SMS</Button>
                  <Button variant="outline" size="sm">Push</Button>
                </div>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Review Requests</p>
                  <p className="text-sm text-muted-foreground">Get reminded to leave reviews</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-black">Email</Button>
                  <Button variant="outline" size="sm">SMS</Button>
                  <Button variant="outline" size="sm">Push</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle>Privacy & Security</CardTitle>
            <CardDescription>Manage your privacy and security settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                </div>
              </div>
              <Button variant="outline">Enable</Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Change Password</p>
                  <p className="text-sm text-muted-foreground">Update your password regularly</p>
                </div>
              </div>
              <Button variant="outline">Change</Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Connected Devices</p>
                  <p className="text-sm text-muted-foreground">Manage devices logged into your account</p>
                </div>
              </div>
              <Button variant="outline">View</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle>Data & Privacy</CardTitle>
            <CardDescription>Control your data and privacy settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium">Download Your Data</p>
                <p className="text-sm text-muted-foreground">Get a copy of all your account data</p>
              </div>
              <Button variant="outline">Request</Button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">Permanently delete your account and data</p>
              </div>
              <Button variant="outline" className="text-destructive hover:text-destructive">Delete</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
