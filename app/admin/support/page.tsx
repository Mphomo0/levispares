import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AdminSupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Support</h2>
        <p className="text-muted-foreground">Customer support tickets.</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-lg font-semibold">Support tickets are not set up yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Customer enquiries currently arrive through the contact form and the
            business email. Tickets will appear here once ticketing is connected.
          </p>
          <Button asChild variant="outline">
            <Link href="/admin">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
