import { Card, CardBody } from "@/components/ui/Card";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export async function generateStaticParams() {
  return [{ slug: ["coming-soon"] }];
}

export default function ComingSoonPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <Card className="max-w-md">
        <CardBody className="py-12 px-6">
          <h1 className="text-2xl font-bold text-ink-900 mb-2">Coming Soon!</h1>
          <p className="text-ink-600 mb-8">
            This feature is currently under development and will be available in a future update.
          </p>
          <Link href="/admin">
            <Button variant="secondary" className="w-full">
              Back to Dashboard
            </Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
