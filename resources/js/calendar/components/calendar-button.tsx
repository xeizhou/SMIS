import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { ClientContainer } from "@/calendar/components/client-container";
import { DndProviderWrapper } from "@/calendar/components/dnd/dnd-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import type { DueDelivery } from "@/components/due-deliveries";

const queryClient = new QueryClient();

export function CalendarButton({ deliveries }: { deliveries?: DueDelivery[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarDays className="mr-2 h-4 w-4" />
          Calendar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] sm:max-w-[90vw] h-[90vh] overflow-y-auto">
        <QueryClientProvider client={queryClient}>
          <DndProviderWrapper>
            <ClientContainer deliveries={deliveries} />
          </DndProviderWrapper>
        </QueryClientProvider>
      </DialogContent>
    </Dialog>
  );
}