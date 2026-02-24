'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Profile</h2>
        <p className="text-muted-foreground">Manage your personal information.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">JD</span>
              </div>
              <div>
                <Button variant="outline" size="sm">Change Photo</Button>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG up to 2MB</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" defaultValue="John" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" defaultValue="Doe" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="john.doe@example.com" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" placeholder="Tell us about yourself..." rows={3} />
            </div>

            <Button className="bg-orange-500 hover:bg-orange-600 text-black font-semibold">
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
              <CardDescription>Manage your password and security settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              <Button variant="outline">
                Update Password
              </Button>
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Customize your experience.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive order updates via email</p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">SMS Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive SMS alerts for orders</p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Newsletter</p>
                  <p className="text-sm text-muted-foreground">Receive promotional offers</p>
                </div>
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
