import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const orders = [
  { 
    id: "ORD-001", 
    date: "2024-01-15", 
    items: [
      { name: "Premium Brake Pads", quantity: 1, price: "$89.99" },
      { name: "Brake Fluid", quantity: 2, price: "$24.99" },
      { name: "Brake Calipers", quantity: 1, price: "$106.00" }
    ],
    total: "$245.97", 
    status: "Delivered",
    tracking: "TRK-123456"
  },
  { 
    id: "ORD-002", 
    date: "2024-01-10", 
    items: [
      { name: "LED Headlights", quantity: 1, price: "$89.99" }
    ],
    total: "$89.99", 
    status: "Shipped",
    tracking: "TRK-123457"
  },
  { 
    id: "ORD-003", 
    date: "2024-01-05", 
    items: [
      { name: "Air Filter", quantity: 2, price: "$39.98" },
      { name: "Oil Filter", quantity: 2, price: "$29.98" },
      { name: "Cabin Filter", quantity: 1, price: "$24.99" }
    ],
    total: "$94.95", 
    status: "Processing",
    tracking: null
  },
  { 
    id: "ORD-004", 
    date: "2023-12-28", 
    items: [
      { name: "All-Season Tires", quantity: 4, price: "$799.96" }
    ],
    total: "$799.96", 
    status: "Delivered",
    tracking: "TRK-123450"
  },
]

export default function UserOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Orders</h2>
        <p className="text-muted-foreground">View and manage your order history.</p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id} className="card-shadow overflow-hidden">
            <CardHeader className="bg-muted/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-4">
                  <div>
                    <CardTitle className="text-base">{order.id}</CardTitle>
                    <CardDescription>Ordered on {order.date}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    order.status === 'Delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                    order.status === 'Shipped' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                    order.status === 'Processing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {order.status}
                  </span>
                  <span className="font-semibold">{order.total}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                        <svg className="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-medium">{item.price}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 pt-4 border-t">
                {order.tracking && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Tracking: </span>
                    <span className="font-medium">{order.tracking}</span>
                  </div>
                )}
                <div className="flex gap-2 ml-auto">
                  {order.status === 'Delivered' && (
                    <Button variant="outline" size="sm">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reorder
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  {order.status === 'Delivered' && (
                    <Button variant="ghost" size="sm">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      Leave Review
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
