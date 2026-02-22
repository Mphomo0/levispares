import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400">Manage your admin panel preferences.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-2">
              <nav className="space-y-1">
                {[
                  { name: "General", icon: "⚙️", active: true },
                  { name: "Store Settings", icon: "🏪", active: false },
                  { name: "Payment Methods", icon: "💳", active: false },
                  { name: "Shipping", icon: "🚚", active: false },
                  { name: "Email Templates", icon: "📧", active: false },
                  { name: "API Keys", icon: "🔑", active: false },
                  { name: "Appearance", icon: "🎨", active: false },
                ].map((item) => (
                  <button
                    key={item.name}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      item.active
                        ? "bg-accent text-white"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.name}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Settings */}
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Manage your store information and preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input id="storeName" defaultValue="LeviSpares" className="input-styled" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeEmail">Store Email</Label>
                  <Input id="storeEmail" type="email" defaultValue="admin@levispares.com" className="input-styled" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="storeUrl">Store URL</Label>
                <Input id="storeUrl" defaultValue="https://levispares.com" className="input-styled" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="storePhone">Contact Phone</Label>
                <Input id="storePhone" type="tel" defaultValue="+1 (555) 000-0000" className="input-styled" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeAddress">Business Address</Label>
                <textarea
                  id="storeAddress"
                  rows={3}
                  defaultValue="123 Auto Parts Street, New York, NY 10001"
                  className="input-styled resize-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button className="btn-accent">Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          {/* Store Settings */}
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle>Store Configuration</CardTitle>
              <CardDescription>Configure your store settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="font-medium">Maintenance Mode</p>
                  <p className="text-sm text-slate-500">Temporarily hide your store from visitors</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 dark:bg-slate-700 transition-colors">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="font-medium">Allow Guest Checkout</p>
                  <p className="text-sm text-slate-500">Let customers checkout without an account</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-accent transition-colors">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-slate-500">Receive email for new orders</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-accent transition-colors">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="font-medium">Inventory Alerts</p>
                  <p className="text-sm text-slate-500">Get notified when products are low on stock</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-accent transition-colors">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 dark:border-red-900/50">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions that affect your store.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/10">
                <div>
                  <p className="font-medium text-red-600">Reset All Data</p>
                  <p className="text-sm text-red-500">Delete all products, orders, and customer data</p>
                </div>
                <Button variant="destructive" size="sm">Reset</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
