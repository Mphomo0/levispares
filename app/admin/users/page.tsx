import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const users = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "Customer", orders: 12, spent: "$1,245.00", joined: "2023-06-15", status: "Active" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "Customer", orders: 8, spent: "$567.50", joined: "2023-08-22", status: "Active" },
  { id: 3, name: "Mike Johnson", email: "mike@example.com", role: "Customer", orders: 23, spent: "$2,890.00", joined: "2023-03-10", status: "Active" },
  { id: 4, name: "Sarah Williams", email: "sarah@example.com", role: "VIP", orders: 45, spent: "$8,765.00", joined: "2022-11-05", status: "Active" },
  { id: 5, name: "Tom Brown", email: "tom@example.com", role: "Customer", orders: 3, spent: "$156.99", joined: "2024-01-02", status: "Inactive" },
  { id: 6, name: "Emily Davis", email: "emily@example.com", role: "Customer", orders: 15, spent: "$1,890.00", joined: "2023-05-18", status: "Active" },
]

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">Manage your customers and their accounts.</p>
        </div>
        <Button className="btn-accent">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8,901</div>
            <p className="text-xs text-muted-foreground">+234 this month</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7,234</div>
            <p className="text-xs text-muted-foreground">81% of total</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP Customers</CardTitle>
            <svg className="h-4 w-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">456</div>
            <p className="text-xs text-muted-foreground">5% of total</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">234</div>
            <p className="text-xs text-muted-foreground">+12% vs last month</p>
          </CardContent>
        </Card>
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Manage customer accounts and roles.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <Input placeholder="Search users..." aria-label="Search users" className="pl-9 w-64 input-styled" />
              </div>
              <Button variant="outline" size="sm">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">User</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Role</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Orders</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Total Spent</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Status</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Joined</th>
                  <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {users.map((user) => (
                  <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-2 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-accent">{user.name.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-2 align-middle">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === 'VIP' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        user.role === 'Admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-2 align-middle">{user.orders}</td>
                    <td className="p-2 align-middle font-medium">{user.spent}</td>
                    <td className="p-2 align-middle">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-2 align-middle text-muted-foreground">{user.joined}</td>
                    <td className="p-2 align-middle text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Edit user">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" aria-label="Delete user">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
