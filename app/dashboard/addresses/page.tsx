import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const addresses = [
  {
    id: 1,
    name: "Home",
    firstName: "John",
    lastName: "Doe",
    address: "123 Main Street",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "United States",
    phone: "+1 (555) 123-4567",
    isDefault: true
  },
  {
    id: 2,
    name: "Office",
    firstName: "John",
    lastName: "Doe",
    address: "456 Business Ave, Suite 100",
    city: "New York",
    state: "NY",
    zip: "10002",
    country: "United States",
    phone: "+1 (555) 987-6543",
    isDefault: false
  },
  {
    id: 3,
    name: "Family",
    firstName: "Jane",
    lastName: "Doe",
    address: "789 Family Lane",
    city: "Los Angeles",
    state: "CA",
    zip: "90001",
    country: "United States",
    phone: "+1 (555) 456-7890",
    isDefault: false
  },
]

export default function UserAddressesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Addresses</h2>
          <p className="text-muted-foreground">Manage your shipping and billing addresses.</p>
        </div>
        <Button className="btn-accent">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Address
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {addresses.map((address) => (
          <Card key={address.id} className={`card-shadow ${address.isDefault ? 'ring-2 ring-accent' : ''}`}>
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{address.name}</CardTitle>
                {address.isDefault && (
                  <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    Default
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label="Edit address">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" aria-label="Delete address">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="font-medium">{address.firstName} {address.lastName}</p>
                <p className="text-muted-foreground">{address.address}</p>
                <p className="text-muted-foreground">{address.city}, {address.state} {address.zip}</p>
                <p className="text-muted-foreground">{address.country}</p>
                <p className="text-muted-foreground">{address.phone}</p>
              </div>
              {!address.isDefault && (
                <Button variant="outline" size="sm" className="w-full mt-4">
                  Set as Default
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        <button 
          type="button"
          aria-label="Add new address"
          className="border-dashed card-shadow flex items-center justify-center min-h-[200px] w-full text-left cursor-pointer hover:bg-muted/50 transition-colors rounded-lg"
        >
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="font-medium text-muted-foreground">Add New Address</p>
          </CardContent>
        </button>
      </div>
    </div>
  )
}
